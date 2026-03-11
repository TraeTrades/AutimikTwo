import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScrapingJobSchema, insertVehicleSchema } from "@shared/schema";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteer from "puppeteer-core";
import { Parser } from "json2csv";
import * as XLSX from "xlsx";
import { execSync } from "child_process";
import { registerCsvImportRoutes } from "./csv-import";

puppeteerExtra.use(StealthPlugin());

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // We'll set up WebSocket separately to avoid conflicts
  const activeConnections = new Map();

  // Broadcast progress updates to all connected clients  
  function broadcastProgress(jobId: string, progress: any) {
    const message = JSON.stringify({ type: 'progress', jobId, data: progress });
    activeConnections.forEach((ws) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(message);
      }
    });
  }

  function getChromiumPath() {
    try {
      // Try to find chromium executable
      const chromiumPath = execSync("which chromium", { encoding: "utf8" }).trim();
      return chromiumPath;
    } catch {
      // Fallback to common paths
      const fallbackPaths = [
        "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "chromium"
      ];
      return fallbackPaths[0];
    }
  }

  // Enhanced scraping function
  async function scrapeInventory(jobId: string, url: string, options: any = {}) {
    const job = await storage.getScrapingJob(jobId);
    if (!job) throw new Error("Job not found");

    await storage.updateScrapingJob(jobId, { 
      status: "running", 
      startedAt: new Date() 
    });

    let browser;
    try {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || getChromiumPath();
      console.log(`Using Chromium at: ${executablePath}`);
      
      browser = await puppeteerExtra.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
          "--window-size=1920,1080",
        ],
        executablePath,
      });
      
      const page = await browser.newPage();

      // Set realistic viewport and user agent to bypass bot detection
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      );

      // Hide webdriver fingerprint before any navigation
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
        (window as any).chrome = { runtime: {} };
      });

      // Set extra headers to look like a real browser
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
      });

      // First visit the home page to warm up Cloudflare session
      const baseUrl = new URL(url).origin;
      console.log(`Warming up session via home page: ${baseUrl}`);
      try {
        await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (e) {
        console.log("Home page warmup failed, continuing...");
      }

      console.log(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Handle Cloudflare challenge - wait up to 60s for it to clear
      let attempts = 0;
      while (attempts < 12) {
        const title = await page.title();
        if (!title.includes("Just a moment") && !title.includes("Checking your browser") && !title.includes("Attention Required")) break;
        console.log(`Cloudflare challenge detected, waiting... (attempt ${attempts + 1}/12)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }

      const finalTitle = await page.title();
      console.log(`Page loaded successfully: ${finalTitle}`);
      
      if (finalTitle.includes("Just a moment") || finalTitle.includes("Checking your browser")) {
        throw new Error("Cloudflare challenge could not be bypassed. The website may be blocking automated access.");
      }

      let previousHeight;
      let vehicles = [];
      const maxVehicles = options?.maxVehicles || job.maxVehicles || 50;

      while (vehicles.length < maxVehicles) {
        previousHeight = await page.evaluate("document.body.scrollHeight");
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Force lazy-loaded images to load by triggering their data-src
        await page.evaluate(() => {
          document.querySelectorAll('img[data-src]').forEach((img: any) => {
            if (!img.src || img.src === window.location.href) img.src = img.getAttribute('data-src');
          });
          document.querySelectorAll('img[data-lazy-src]').forEach((img: any) => {
            if (!img.src || img.src === window.location.href) img.src = img.getAttribute('data-lazy-src');
          });
          document.querySelectorAll('img[data-original]').forEach((img: any) => {
            if (!img.src || img.src === window.location.href) img.src = img.getAttribute('data-original');
          });
        });

        // Small additional wait for forced images to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const pageVehicles = await page.evaluate(() => {
          const cars: any[] = [];
          
          // More comprehensive approach for CarPlace Motors
          // Look for all links that might contain vehicle information
          const allLinks = Array.from(document.querySelectorAll('a'));
          
          // Filter links that look like vehicle links
          const vehicleLinks = allLinks.filter(link => {
            const href = link.href || '';
            const text = link.textContent || '';
            
            // Look for links that contain vehicle information in the URL or text
            return (
              href.includes('/used-vehicle-inventory/') ||
              href.includes('/vehicle/') ||
              href.includes('/inventory/') ||
              text.match(/\d{4}.*?[A-Z]{2,}.*?[A-Z]{2,}/i) // Year + Make + Model pattern
            );
          });
          
          vehicleLinks.forEach((link, index) => {
            const linkEl = link as HTMLAnchorElement;
            const href = linkEl.href || '';
            const linkText = linkEl.textContent || '';
            
            // Skip if this doesn't look like a vehicle link
            if (!linkText.match(/\d{4}/)) return;
            
            // Find the container that has all the vehicle info
            let container = linkEl.parentElement;
            
            // Try to find a better container by going up the DOM tree
            for (let i = 0; i < 5; i++) {
              if (!container) break;
              
              const containerText = container.innerText || '';
              // If this container has price info, it's likely the right one
              if (containerText.match(/\$[\d,]+/) && containerText.match(/\d{4}/)) {
                break;
              }
              container = container.parentElement;
            }
            
            if (!container) return;
            
            const fullText = container.innerText || '';
            
            // Extract title - prefer the link text if it looks like a vehicle title
            let title = linkText.trim();
            if (!title.match(/\d{4}.*[A-Z]/i)) {
              // Look for a better title in the container
              const titleMatch = fullText.match(/(\d{4}\s+[A-Z\-]+\s+[^\n]+)/i);
              title = titleMatch ? titleMatch[1] : linkText;
            }
            
            if (!title || title.length < 10) return;
            
            // Parse year, make, model from title
            const titleMatch = title.match(/(\d{4})\s+([A-Z\-]+)\s+(.+)/i);
            const year = titleMatch ? parseInt(titleMatch[1]) : null;
            const make = titleMatch ? titleMatch[2].replace(/-/g, ' ') : '';
            let model = titleMatch ? titleMatch[3] : '';
            
            // Clean up model name
            model = model.split(/\s+(SEDAN|COUPE|SUV|CONVERTIBLE|WAGON|HATCHBACK|PICKUP|SPORT UTILITY)/i)[0];
            model = model.replace(/\\n.*/, '').trim(); // Remove any line breaks and content after
            
            // Extract price - look for dollar amounts
            const priceMatches = fullText.match(/\$[\d,]+/g);
            const price = priceMatches ? priceMatches[0] : "N/A";
            
            // Extract mileage - look for mileage patterns
            const mileageMatch = fullText.match(/(?:Mileage:?\s*)?(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi)?/i);
            let mileage = "N/A";
            if (mileageMatch && parseInt(mileageMatch[1].replace(/,/g, '')) > 100) {
              mileage = mileageMatch[1] + " miles";
            }
            
            // Extract stock number
            const stockMatch = fullText.match(/(?:Stock Number|Stock|VIN):?\s*([A-Z0-9]+)/i);
            const stockNumber = stockMatch ? stockMatch[1] : `AUTO${Date.now()}${index}`;
            
            // Extract transmission
            const transmissionMatch = fullText.match(/(?:Transmission|Trans):?\s*([A-Z]+)/i);
            const transmission = transmissionMatch ? transmissionMatch[1] : "AUTOMATIC";
            
            // Extract interior color
            const interiorMatch = fullText.match(/(?:Interior Color|Interior):?\s*([A-Z\s\/]+)/i);
            const interiorColor = interiorMatch ? interiorMatch[1].trim() : "";
            
            // Generate a VIN if we don't have one
            let vin = stockNumber;
            if (stockNumber.length < 8) {
              vin = `VIN${year}${make.substring(0,3).toUpperCase()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
            }
            
            // Find vehicle image - skip badges, SVGs, and CarGurus rating icons
            const allImgs = Array.from(container.querySelectorAll('img'));
            let imageUrl = "";
            
            for (const img of allImgs as HTMLImageElement[]) {
              // Check all possible image src locations (including lazy-loaded)
              const src = (img as any).getAttribute('data-src') || 
                          (img as any).getAttribute('data-lazy-src') || 
                          (img as any).getAttribute('data-original') || 
                          (img as any).getAttribute('data-img') ||
                          img.src || '';
              
              if (!src || src.startsWith('data:')) continue; // Skip empty or base64
              if (src.endsWith('.svg')) continue;             // Skip SVG badges
              if (src.includes('cargurus.com')) continue;     // Skip CarGurus badges
              if (src.includes('placeholder')) continue;       // Skip placeholders
              if (src.includes('spinner') || src.includes('loading')) continue;
              if (img.naturalWidth > 0 && img.naturalWidth < 80) continue; // Skip tiny icons
              
              imageUrl = src;
              break;
            }
            
            // Use the vehicle detail URL
            const detailUrl = href;
            
            // Only add if we have minimum required info
            if (title && price !== "N/A" && year && make) {
              cars.push({ 
                vin, 
                title: title.trim(), 
                price, 
                mileage, 
                imageUrl,
                make: make.trim(),
                model: model.trim(),
                year,
                transmission,
                interiorColor,
                stockNumber,
                dealershipUrl: detailUrl || window.location.href
              });
            }
          });
          
          return cars;
        });
        
        console.log(`Extracted ${pageVehicles.length} vehicles from current page`);

        // Remove duplicates and add new vehicles
        const existingVins: Set<string> = new Set(vehicles.map((v: any) => v.vin));
        const newVehicles: any[] = pageVehicles.filter((v: any) => !existingVins.has(v.vin));
        vehicles.push(...newVehicles);

        // Update progress
        const progress = Math.min(Math.round((vehicles.length / maxVehicles) * 100), 100);
        await storage.updateScrapingJob(jobId, {
          progress,
          vehiclesFound: vehicles.length,
          vehiclesProcessed: vehicles.length
        });

        broadcastProgress(jobId, {
          progress,
          vehiclesFound: vehicles.length,
          processed: vehicles.length,
          errors: 0,
          statusMessage: `Found ${vehicles.length} vehicles...`
        });

        const newHeight = await page.evaluate("document.body.scrollHeight");
        if (newHeight === previousHeight || vehicles.length >= maxVehicles) break;
      }

      // Save vehicles to storage
      for (const vehicleData of vehicles) {
        await storage.createVehicle({
          ...vehicleData,
          scrapingJobId: jobId
        });
      }

      await storage.updateScrapingJob(jobId, {
        status: "completed",
        completedAt: new Date(),
        progress: 100,
        vehiclesFound: vehicles.length,
        vehiclesProcessed: vehicles.length
      });

      broadcastProgress(jobId, {
        progress: 100,
        vehiclesFound: vehicles.length,
        processed: vehicles.length,
        errors: 0,
        statusMessage: "Scraping completed successfully",
        completed: true
      });

      return vehicles;

    } catch (error: any) {
      await storage.updateScrapingJob(jobId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error?.message || 'Unknown error'
      });

      broadcastProgress(jobId, {
        error: error?.message || 'Unknown error',
        statusMessage: "Scraping failed",
        completed: true
      });

      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // API Routes
  
  // Get scraping jobs
  app.get("/api/scraping-jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllScrapingJobs();
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Get recent jobs
  app.get("/api/scraping-jobs/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const jobs = await storage.getRecentJobs(limit);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Get specific job
  app.get("/api/scraping-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getScrapingJob(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Create scraping job
  app.post("/api/scraping-jobs", async (req, res) => {
    try {
      const validatedData = insertScrapingJobSchema.parse(req.body);
      const job = await storage.createScrapingJob(validatedData);
      
      // Start scraping in background
      scrapeInventory(job.id, job.url, job.options).catch(console.error);
      
      res.json({ success: true, job });
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Cancel scraping job
  app.patch("/api/scraping-jobs/:id/cancel", async (req, res) => {
    try {
      const job = await storage.updateScrapingJob(req.params.id, {
        status: "cancelled",
        completedAt: new Date()
      });
      
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      broadcastProgress(req.params.id, {
        statusMessage: "Scraping cancelled",
        completed: true
      });
      
      res.json({ success: true, job });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Get vehicles
  app.get("/api/vehicles", async (req, res) => {
    try {
      const { search, jobId } = req.query;
      const vehicles = await storage.searchVehicles(
        search as string || "", 
        jobId as string
      );
      res.json(vehicles);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Get vehicles by job
  app.get("/api/scraping-jobs/:id/vehicles", async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByJobId(req.params.id);
      res.json(vehicles);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Export vehicles
  app.post("/api/vehicles/export", async (req, res) => {
    try {
      const { format, fields, vehicleIds } = req.body;
      
      let vehicles;
      if (vehicleIds && vehicleIds.length > 0) {
        vehicles = await Promise.all(
          vehicleIds.map((id: string) => storage.getVehicle(id))
        );
        vehicles = vehicles.filter(Boolean);
      } else {
        vehicles = await storage.searchVehicles("");
      }

      // Filter fields if specified
      const exportData = vehicles.map((vehicle: any) => {
        if (fields && fields.length > 0) {
          return fields.reduce((obj: any, field: string) => {
            obj[field] = vehicle[field];
            return obj;
          }, {});
        }
        return vehicle;
      });

      switch (format) {
        case "facebook":
          // Facebook Marketplace specific format
          const facebookData = vehicles.map((vehicle: any) => {
            // Clean price - remove commas and dollar signs for consistent formatting
            const cleanPrice = vehicle.price?.replace(/[$,]/g, '') || '';
            
            // Create a detailed description
            const description = [
              vehicle.title || '',
              vehicle.mileage ? `Mileage: ${vehicle.mileage}` : '',
              vehicle.transmission ? `Transmission: ${vehicle.transmission}` : '',
              vehicle.interiorColor ? `Interior: ${vehicle.interiorColor}` : '',
              'Contact us for more details and to schedule a test drive!'
            ].filter(Boolean).join('\n');
            
            return {
              title: vehicle.title || 'Vehicle',
              description: description,
              price: cleanPrice,
              condition: 'Used',
              make: vehicle.make || '',
              model: vehicle.model || '',
              year: vehicle.year || '',
              mileage: vehicle.mileage?.replace(/[^\d]/g, '') || '', // Extract just the number
              vin: vehicle.vin || '',
              images: vehicle.imageUrl || '',
              availability: 'In Stock',
              dealer_name: 'CarPlace Motors',
              dealer_location: 'Addison, Texas',
              contact_url: vehicle.dealershipUrl || ''
            };
          });
          
          const facebookParser = new Parser();
          const facebookCsv = facebookParser.parse(facebookData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="facebook_marketplace_import.csv"');
          res.send(facebookCsv);
          break;
          
        case "csv":
          const parser = new Parser();
          const csv = parser.parse(exportData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="vehicles.csv"');
          res.send(csv);
          break;
          
        case "json":
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="vehicles.json"');
          res.json(exportData);
          break;
          
        case "excel":
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");
          const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
          
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="vehicles.xlsx"');
          res.send(excelBuffer);
          break;
          
        default:
          res.status(400).json({ error: "Unsupported format" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const jobs = await storage.getAllScrapingJobs();
      const vehicles = await storage.searchVehicles("");
      
      const activeJobs = jobs.filter(job => job.status === "running").length;
      const completedJobs = jobs.filter(job => job.status === "completed").length;
      const totalJobs = jobs.length;
      const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
      
      res.json({
        activeJobs,
        vehiclesScraped: vehicles.length,
        successRate: `${successRate}%`,
        totalJobs,
        completedJobs
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  registerCsvImportRoutes(app);

  return httpServer;
}
