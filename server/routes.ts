import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import { storage } from "./storage";
import { insertScrapingJobSchema, insertVehicleSchema } from "@shared/schema";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteer from "puppeteer-core";
import { Parser } from "json2csv";
import * as XLSX from "xlsx";
import { execSync } from "child_process";
import { registerCsvImportRoutes } from "./csv-import";
import { detectPlatform, getApiEndpoints } from "./platform-detector";
import { normalizeVehicle, extractVehicleArray } from "./vehicle-normalizer";
import type { NormalizedVehicle } from "./vehicle-normalizer";

puppeteerExtra.use(StealthPlugin());

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const activeConnections = new Map<string, WsWebSocket>();
  let connIdCounter = 0;

  wss.on("connection", (ws) => {
    const connId = `conn-${++connIdCounter}`;
    activeConnections.set(connId, ws);
    console.log(`[WS] Client connected (${connId}), total: ${activeConnections.size}`);

    ws.on("close", () => {
      activeConnections.delete(connId);
      console.log(`[WS] Client disconnected (${connId}), total: ${activeConnections.size}`);
    });

    ws.on("error", () => {
      activeConnections.delete(connId);
    });
  });

  function broadcastProgress(jobId: string, progress: any) {
    const message = JSON.stringify({ type: 'progress', jobId, data: progress });
    activeConnections.forEach((ws) => {
      if (ws.readyState === WsWebSocket.OPEN) {
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

  // ── Strategy 1: Platform API probing (no browser needed) ────────────
  async function tryApiProbing(
    jobId: string,
    url: string,
    maxVehicles: number,
    broadcast: (msg: string, progress: number) => void
  ): Promise<NormalizedVehicle[] | null> {
    broadcast("Detecting dealer platform...", 5);
    console.log(`[Strategy 1] Detecting platform for ${url}`);

    const detection = await detectPlatform(url);
    console.log(`[Strategy 1] Platform: ${detection.platform} (confidence: ${detection.confidence})`);
    console.log(`[Strategy 1] Hints: ${detection.hints.join(", ")}`);

    const endpoints = getApiEndpoints(url, detection.platform);
    console.log(`[Strategy 1] Probing ${endpoints.length} API endpoints...`);
    broadcast("Trying platform APIs...", 10);

    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i];
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(ep.url, {
          headers: {
            "User-Agent": UA,
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) continue;

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("json")) continue;

        const data = await res.json();
        const vehicleArray = extractVehicleArray(data);

        if (vehicleArray && vehicleArray.length >= 2) {
          console.log(`[Strategy 1] SUCCESS — found ${vehicleArray.length} vehicles via ${ep.url}`);
          broadcast(`Found ${vehicleArray.length} vehicles via API`, 40);

          const normalized: NormalizedVehicle[] = [];
          for (const raw of vehicleArray.slice(0, maxVehicles)) {
            const v = normalizeVehicle(raw, url);
            if (v) normalized.push(v);
          }

          if (normalized.length >= 2) {
            console.log(`[Strategy 1] Normalized ${normalized.length} vehicles from API endpoint: ${ep.url}`);
            return normalized;
          }
        }
      } catch {
        // endpoint unreachable, skip
      }

      const probeProgress = 10 + Math.round(((i + 1) / endpoints.length) * 15);
      broadcast(`Trying platform APIs (${i + 1}/${endpoints.length})...`, probeProgress);
    }

    console.log("[Strategy 1] No API endpoints returned vehicle data");
    return null;
  }

  // ── Strategy 2: Puppeteer with network interception ───────────────
  async function tryNetworkInterception(
    jobId: string,
    url: string,
    maxVehicles: number,
    broadcast: (msg: string, progress: number) => void
  ): Promise<{ vehicles: NormalizedVehicle[]; browser: any; page: any } | null> {
    broadcast("Launching browser with network interception...", 30);
    console.log(`[Strategy 2] Launching Puppeteer with network interception for ${url}`);

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || getChromiumPath();
    const browser = await puppeteerExtra.launch({
      headless: true,
      args: [
        "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas", "--no-first-run", "--no-zygote",
        "--disable-gpu", "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--window-size=1920,1080",
      ],
      executablePath,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      (window as any).chrome = { runtime: {} };
    });
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
    });

    const interceptedVehicles: any[] = [];
    let interceptedApiUrl = "";

    page.on("response", async (response: any) => {
      try {
        const resUrl = response.url();
        const ct = response.headers()["content-type"] || "";
        if (!ct.includes("json") && !ct.includes("javascript")) return;
        if (response.status() < 200 || response.status() >= 400) return;

        const text = await response.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
          if (match) {
            try { data = JSON.parse(match[0]); } catch { return; }
          } else {
            return;
          }
        }

        const vehicleArray = extractVehicleArray(data);
        if (vehicleArray && vehicleArray.length >= 2) {
          console.log(`[Strategy 2] Intercepted vehicle data from: ${resUrl} (${vehicleArray.length} items)`);
          interceptedApiUrl = resUrl;
          interceptedVehicles.push(...vehicleArray);
        }
      } catch {
        // silently skip responses that can't be read
      }
    });

    broadcast("Navigating to site...", 35);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });

    const cfMarkers = ["cf-browser-verification", "cf_chl_opt", "ray ID", "cf-challenge-running", "cf-challenge", "jschl_vc", "cf_clearance", "cf-turnstile"];

    function isCfTitle(title: string) {
      return title.includes("Just a moment") || title.includes("Checking your browser") || title.includes("Attention Required");
    }

    const initialTitle = await page.title();
    if (isCfTitle(initialTitle)) {
      const bodyText = await page.content();
      const isCfHardBlock = cfMarkers.some(m => bodyText.includes(m));
      if (isCfHardBlock) {
        console.log("[Strategy 2] Cloudflare hard-block detected on first load — failing fast");
        broadcast("Cloudflare protection detected — cannot scrape from cloud servers", 40);
        await browser.close();
        throw new Error("This site uses Cloudflare protection which blocks automated access from cloud servers. Try a non-Cloudflare dealer site, or import a CSV/DMS file instead.");
      }

      let cfAttempts = 0;
      const maxCfAttempts = 2;
      while (cfAttempts < maxCfAttempts) {
        console.log(`[Strategy 2] Cloudflare challenge, waiting... (${cfAttempts + 1}/${maxCfAttempts})`);
        broadcast(`Waiting for security check (${cfAttempts + 1}/${maxCfAttempts})...`, 35);
        await new Promise(resolve => setTimeout(resolve, 3000));
        cfAttempts++;
        const title = await page.title();
        if (!isCfTitle(title)) break;
      }

      const postCfTitle = await page.title();
      if (isCfTitle(postCfTitle)) {
        console.log("[Strategy 2] Cloudflare challenge not cleared after max attempts — failing fast");
        broadcast("Cloudflare protection detected — cannot scrape from cloud servers", 40);
        await browser.close();
        throw new Error("This site uses Cloudflare protection which blocks automated access from cloud servers. Try a non-Cloudflare dealer site, or import a CSV/DMS file instead.");
      }
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (interceptedVehicles.length >= 2) {
      console.log(`[Strategy 2] SUCCESS — intercepted ${interceptedVehicles.length} vehicles from ${interceptedApiUrl}`);
      broadcast(`Intercepted ${interceptedVehicles.length} vehicles from live API`, 50);

      const normalized: NormalizedVehicle[] = [];
      for (const raw of interceptedVehicles.slice(0, maxVehicles)) {
        const v = normalizeVehicle(raw, url);
        if (v) normalized.push(v);
      }

      if (normalized.length >= 2) {
        await browser.close();
        return { vehicles: normalized, browser: null, page: null };
      }
    }

    console.log("[Strategy 2] No vehicle data intercepted from network responses");
    return { vehicles: [], browser, page };
  }

  // ── Strategy 3: HTML parsing (existing approach, fallback) ────────
  async function tryHtmlParsing(
    page: any,
    url: string,
    maxVehicles: number,
    broadcast: (msg: string, progress: number) => void
  ): Promise<NormalizedVehicle[]> {
    broadcast("Falling back to HTML parsing...", 55);
    console.log("[Strategy 3] Falling back to HTML parsing");

    const finalTitle = await page.title();
    if (finalTitle.includes("Just a moment") || finalTitle.includes("Checking your browser")) {
      throw new Error("Cloudflare challenge could not be bypassed. The website may be blocking automated access from cloud servers. Try importing a CSV file instead.");
    }

    let previousHeight;
    let vehicles: any[] = [];

    while (vehicles.length < maxVehicles) {
      previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 2000));

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
      await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 500));

      const pageVehicles = await page.evaluate(() => {
        const cars: any[] = [];
        const allLinks = Array.from(document.querySelectorAll('a'));
        const vehicleLinks = allLinks.filter(link => {
          const href = link.href || '';
          const text = link.textContent || '';
          return (
            href.includes('/used-vehicle-inventory/') ||
            href.includes('/vehicle/') ||
            href.includes('/inventory/') ||
            text.match(/\d{4}.*?[A-Z]{2,}.*?[A-Z]{2,}/i)
          );
        });

        vehicleLinks.forEach((link, index) => {
          const linkEl = link as HTMLAnchorElement;
          const href = linkEl.href || '';
          const linkText = linkEl.textContent || '';
          if (!linkText.match(/\d{4}/)) return;

          let container = linkEl.parentElement;
          for (let i = 0; i < 5; i++) {
            if (!container) break;
            const containerText = container.innerText || '';
            if (containerText.match(/\$[\d,]+/) && containerText.match(/\d{4}/)) break;
            container = container.parentElement;
          }
          if (!container) return;

          const fullText = container.innerText || '';
          let title = linkText.trim();
          if (!title.match(/\d{4}.*[A-Z]/i)) {
            const titleMatch = fullText.match(/(\d{4}\s+[A-Z\-]+\s+[^\n]+)/i);
            title = titleMatch ? titleMatch[1] : linkText;
          }
          if (!title || title.length < 10) return;

          const titleMatch = title.match(/(\d{4})\s+([A-Z\-]+)\s+(.+)/i);
          const year = titleMatch ? parseInt(titleMatch[1]) : null;
          const make = titleMatch ? titleMatch[2].replace(/-/g, ' ') : '';
          let model = titleMatch ? titleMatch[3] : '';
          model = model.split(/\s+(SEDAN|COUPE|SUV|CONVERTIBLE|WAGON|HATCHBACK|PICKUP|SPORT UTILITY)/i)[0];
          model = model.replace(/\\n.*/, '').trim();

          const priceMatches = fullText.match(/\$[\d,]+/g);
          const price = priceMatches ? priceMatches[0] : "N/A";

          const mileageMatch = fullText.match(/(?:Mileage:?\s*)?(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi)?/i);
          let mileage = "N/A";
          if (mileageMatch && parseInt(mileageMatch[1].replace(/,/g, '')) > 100) {
            mileage = mileageMatch[1] + " miles";
          }

          const stockMatch = fullText.match(/(?:Stock Number|Stock|VIN):?\s*([A-Z0-9]+)/i);
          const stockNumber = stockMatch ? stockMatch[1] : `AUTO${Date.now()}${index}`;

          const transmissionMatch = fullText.match(/(?:Transmission|Trans):?\s*([A-Z]+)/i);
          const transmission = transmissionMatch ? transmissionMatch[1] : "AUTOMATIC";

          const interiorMatch = fullText.match(/(?:Interior Color|Interior):?\s*([A-Z\s\/]+)/i);
          const interiorColor = interiorMatch ? interiorMatch[1].trim() : "";

          let vin = stockNumber;
          if (stockNumber.length < 8) {
            vin = `VIN${year}${make.substring(0, 3).toUpperCase()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
          }

          const allImgs = Array.from(container.querySelectorAll('img'));
          let imageUrl = "";
          for (const img of allImgs as HTMLImageElement[]) {
            const src = (img as any).getAttribute('data-src') ||
              (img as any).getAttribute('data-lazy-src') ||
              (img as any).getAttribute('data-original') ||
              (img as any).getAttribute('data-img') ||
              img.src || '';
            if (!src || src.startsWith('data:')) continue;
            if (src.endsWith('.svg')) continue;
            if (src.includes('cargurus.com')) continue;
            if (src.includes('placeholder')) continue;
            if (src.includes('spinner') || src.includes('loading')) continue;
            if (img.naturalWidth > 0 && img.naturalWidth < 80) continue;
            imageUrl = src;
            break;
          }

          if (title && price !== "N/A" && year && make) {
            cars.push({
              vin, title: title.trim(), price, mileage, imageUrl,
              make: make.trim(), model: model.trim(), year,
              transmission, interiorColor, stockNumber,
              dealershipUrl: href || window.location.href
            });
          }
        });
        return cars;
      });

      console.log(`[Strategy 3] Extracted ${pageVehicles.length} vehicles from page`);

      const existingVins = new Set(vehicles.map((v: any) => v.vin));
      const newVehicles = pageVehicles.filter((v: any) => !existingVins.has(v.vin));
      vehicles.push(...newVehicles);

      const progress = 55 + Math.min(Math.round((vehicles.length / maxVehicles) * 15), 15);
      broadcast(`Found ${vehicles.length} vehicles via HTML parsing...`, progress);

      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight || vehicles.length >= maxVehicles) break;
    }

    return vehicles;
  }

  // ── Detail-page image collector (runs after any strategy) ─────────
  async function collectDetailImages(
    vehicles: any[],
    page: any,
    url: string,
    broadcast: (msg: string, progress: number) => void
  ) {
    const totalVehicles = vehicles.length;
    if (totalVehicles === 0 || !page) return;

    for (let i = 0; i < totalVehicles; i++) {
      const vehicle = vehicles[i];
      const detailUrl = vehicle.dealershipUrl;

      const imageProgress = 75 + Math.round(((i + 1) / totalVehicles) * 25);
      broadcast(`Fetching images ${i + 1}/${totalVehicles}...`, imageProgress);

      if (!detailUrl || detailUrl === url) continue;

      try {
        await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 2000));

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
        await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 500));

        const galleryImages: string[] = await page.evaluate(() => {
          const MAX_IMAGES = 15;
          const seen = new Set<string>();
          const results: string[] = [];
          const allImgs = Array.from(document.querySelectorAll('img'));

          for (const img of allImgs) {
            if (results.length >= MAX_IMAGES) break;
            const src = (img as any).getAttribute('data-src') ||
              (img as any).getAttribute('data-lazy-src') ||
              (img as any).getAttribute('data-original') ||
              (img as any).getAttribute('data-img') ||
              img.src || '';
            if (!src || src.startsWith('data:')) continue;
            if (src.endsWith('.svg')) continue;
            if (src.includes('cargurus.com')) continue;
            if (src.includes('placeholder')) continue;
            if (src.includes('spinner') || src.includes('loading')) continue;
            if (src.includes('logo') || src.includes('badge') || src.includes('icon')) continue;
            if (img.naturalWidth > 0 && img.naturalWidth < 80) continue;
            if (img.naturalHeight > 0 && img.naturalHeight < 80) continue;

            const normalized = src.split('?')[0];
            if (seen.has(normalized)) continue;
            seen.add(normalized);
            results.push(src);
          }
          return results;
        });

        if (galleryImages.length > 0) {
          vehicle.imageUrl = galleryImages.join(',');
        }
      } catch (e) {
        console.log(`Failed to fetch detail images for ${vehicle.title}: ${(e as Error).message}`);
      }
    }
  }

  // ── Main scraping orchestrator ────────────────────────────────────
  async function scrapeInventory(jobId: string, url: string, options: any = {}) {
    const job = await storage.getScrapingJob(jobId);
    if (!job) throw new Error("Job not found");

    await storage.updateScrapingJob(jobId, {
      status: "running",
      startedAt: new Date(),
    });

    const maxVehicles = options?.maxVehicles || job.maxVehicles || 50;
    let usedStrategy = "";
    let browserRef: any = null;

    function broadcast(msg: string, progress: number) {
      broadcastProgress(jobId, {
        progress,
        vehiclesFound: 0,
        processed: 0,
        errors: 0,
        statusMessage: msg,
      });
      storage.updateScrapingJob(jobId, { progress }).catch(() => {});
    }

    try {
      let vehicles: any[] = [];

      // ── Strategy 1: Platform API probing ──
      broadcast("Strategy 1: Probing platform APIs...", 5);
      const apiResult = await tryApiProbing(jobId, url, maxVehicles, broadcast);
      if (apiResult && apiResult.length >= 2) {
        vehicles = apiResult;
        usedStrategy = "Platform API";
        console.log(`[Orchestrator] Strategy 1 succeeded: ${vehicles.length} vehicles`);
      }

      // ── Strategy 2: Puppeteer network interception ──
      if (vehicles.length < 2) {
        broadcast("Strategy 2: Intercepting live API calls...", 30);
        const interceptResult = await tryNetworkInterception(jobId, url, maxVehicles, broadcast);

        if (interceptResult) {
          browserRef = interceptResult.browser;

          if (interceptResult.vehicles.length >= 2) {
            vehicles = interceptResult.vehicles;
            usedStrategy = "Network interception";
            console.log(`[Orchestrator] Strategy 2 succeeded: ${vehicles.length} vehicles`);
          } else if (interceptResult.page) {
            // ── Strategy 3: HTML parsing (using the already-open browser) ──
            broadcast("Strategy 3: Parsing HTML...", 55);
            const htmlResult = await tryHtmlParsing(interceptResult.page, url, maxVehicles, broadcast);
            if (htmlResult.length > 0) {
              vehicles = htmlResult;
              usedStrategy = "HTML parsing";
              console.log(`[Orchestrator] Strategy 3 succeeded: ${vehicles.length} vehicles`);
            }

            // Collect detail-page images if we got vehicles via HTML
            if (vehicles.length > 0) {
              await collectDetailImages(vehicles, interceptResult.page, url, broadcast);
            }
          }
        }
      }

      if (vehicles.length === 0) {
        throw new Error("No vehicles found. The site may be blocking automated access or has an unsupported layout. Try importing a CSV file instead.");
      }

      broadcast(`Saving ${vehicles.length} vehicles (via ${usedStrategy})...`, 95);

      for (const vehicleData of vehicles) {
        await storage.createVehicle({
          ...vehicleData,
          scrapingJobId: jobId,
        });
      }

      await storage.updateScrapingJob(jobId, {
        status: "completed",
        completedAt: new Date(),
        progress: 100,
        vehiclesFound: vehicles.length,
        vehiclesProcessed: vehicles.length,
      });

      broadcastProgress(jobId, {
        progress: 100,
        vehiclesFound: vehicles.length,
        processed: vehicles.length,
        errors: 0,
        statusMessage: `Scraping completed (${usedStrategy}): ${vehicles.length} vehicles found`,
        completed: true,
      });

      return vehicles;
    } catch (error: any) {
      await storage.updateScrapingJob(jobId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error?.message || "Unknown error",
      });

      broadcastProgress(jobId, {
        error: error?.message || "Unknown error",
        statusMessage: "Scraping failed",
        completed: true,
      });

      throw error;
    } finally {
      if (browserRef) {
        await browserRef.close();
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
        case "facebook": {
          const fbRows: any[][] = [];
          fbRows.push(["Facebook Marketplace Bulk Upload Template"]);
          fbRows.push(["You can create up to 50 listings at once. When you are finished, be sure to save or export this as an XLS/XLSX file."]);
          fbRows.push([
            'REQUIRED | Plain text (up to 150 characters',
            'REQUIRED | A whole number in $',
            'REQUIRED | Supported values: "New"; "Used - Like New"; "Used - Good"; "Used - Fair"',
            'OPTIONAL | Plain text (up to 5000 characters)',
            'OPTIONAL | Type of listing',
            'OPTIONAL | '
          ]);
          fbRows.push(["TITLE", "PRICE", "CONDITION", "DESCRIPTION", "CATEGORY", "OFFER SHIPPING"]);

          for (const vehicle of vehicles as any[]) {
            const titleParts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean);
            const fbTitle = (titleParts.length >= 2 ? titleParts.join(" ") : vehicle.title || "Vehicle").slice(0, 150);

            const priceStr = String(vehicle.price || "0").replace(/[^0-9]/g, "");
            const fbPrice = parseInt(priceStr, 10) || 0;

            const descLines = [
              vehicle.title || "",
              vehicle.mileage ? `Mileage: ${vehicle.mileage}` : "",
              vehicle.exteriorColor ? `Exterior Color: ${vehicle.exteriorColor}` : "",
              vehicle.interiorColor ? `Interior Color: ${vehicle.interiorColor}` : "",
              vehicle.transmission ? `Transmission: ${vehicle.transmission}` : "",
              vehicle.drivetrain ? `Drivetrain: ${vehicle.drivetrain}` : "",
              vehicle.vin ? `VIN: ${vehicle.vin}` : "",
              "",
              "Contact us for more details and to schedule a test drive!"
            ].filter((l) => l !== undefined).join("\n");

            fbRows.push([
              fbTitle,
              fbPrice,
              "Used - Good",
              descLines.trim(),
              "Vehicles & Parts//Cars & Trucks",
              "No"
            ]);
          }

          const fbWs = XLSX.utils.aoa_to_sheet(fbRows);
          const fbWb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(fbWb, fbWs, "Bulk Upload");
          const fbBuffer = XLSX.write(fbWb, { type: "buffer", bookType: "xlsx" });

          res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          res.setHeader("Content-Disposition", 'attachment; filename="facebook_marketplace_upload.xlsx"');
          res.send(fbBuffer);
          break;
        }
          
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
