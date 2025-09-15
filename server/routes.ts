import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScrapingJobSchema, insertVehicleSchema } from "@shared/schema";
import puppeteer from "puppeteer-core";
import { Parser } from "json2csv";
import * as XLSX from "xlsx";
import { execSync } from "child_process";

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
      
      browser = await puppeteer.launch({
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
          "--disable-renderer-backgrounding"
        ],
        executablePath,
      });
      
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2" });

      let previousHeight;
      let vehicles = [];
      const maxVehicles = options?.maxVehicles || job.maxVehicles || 50;

      while (vehicles.length < maxVehicles) {
        previousHeight = await page.evaluate("document.body.scrollHeight");
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Enhanced vehicle extraction
        const pageVehicles = await page.evaluate(() => {
          const cars: any[] = [];
          const selectors = [
            "[class*='vehicle']",
            "[class*='inventory']",
            "[class*='car']",
            "[class*='listing']",
            "[data-testid*='vehicle']"
          ];
          
          selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach((el) => {
              const htmlEl = el as HTMLElement;
              // Extract VIN
              const vin = htmlEl.innerText.match(/[A-HJ-NPR-Z0-9]{17}/)?.[0] || "N/A";
              
              // Extract title
              const titleEl = htmlEl.querySelector("h1,h2,h3,h4,[class*='title'],[class*='name']") as HTMLElement;
              const title = titleEl?.innerText || "Unknown Vehicle";
              
              // Extract price
              const priceMatch = htmlEl.innerText.match(/\$[\d,]+/);
              const price = priceMatch?.[0] || "N/A";
              
              // Extract mileage
              const mileageMatch = htmlEl.innerText.match(/([\d,]+)\s?miles/i);
              const mileage = mileageMatch?.[0] || "N/A";
              
              // Extract image
              const imgEl = htmlEl.querySelector("img") as HTMLImageElement;
              const imageUrl = imgEl?.src || "";
              
              // Extract additional details
              const make = title.split(" ")[0] || "";
              const modelMatch = title.match(/\d{4}\s+(\w+)\s+(.+)/);
              const model = modelMatch?.[2] || "";
              const yearMatch = title.match(/(\d{4})/);
              const year = yearMatch ? parseInt(yearMatch[1]) : null;
              
              if (vin !== "N/A" && title !== "Unknown Vehicle") {
                cars.push({ 
                  vin, 
                  title, 
                  price, 
                  mileage, 
                  imageUrl,
                  make,
                  model,
                  year,
                  dealershipUrl: window.location.href
                });
              }
            });
          });
          
          return cars;
        });

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

  return httpServer;
}
