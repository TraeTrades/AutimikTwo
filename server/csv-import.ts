import type { Express } from "express";
import { storage } from "./storage";
import multer from "multer";
import { parse } from "csv-parse/sync";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  valuePattern?: RegExp;
  valueHint?: string;
}

const VEHICLE_FIELDS: FieldDef[] = [
  {
    key: "stockNumber",
    label: "Stock Number",
    required: true,
    aliases: ["stock", "stock#", "stock_number", "stocknumber", "stock number", "unit", "unit#", "unit_number", "id"],
  },
  {
    key: "year",
    label: "Year",
    required: true,
    aliases: ["year", "yr", "model_year", "modelyear", "vehicle_year", "veh_year"],
    valuePattern: /^(19|20)\d{2}$/,
    valueHint: "4-digit year (e.g. 2021)",
  },
  {
    key: "make",
    label: "Make",
    required: true,
    aliases: ["make", "manufacturer", "brand", "vehicle_make", "veh_make", "mfr"],
  },
  {
    key: "model",
    label: "Model",
    required: true,
    aliases: ["model", "model_name", "vehicle_model", "veh_model"],
  },
  {
    key: "exteriorColor",
    label: "Color",
    required: true,
    aliases: ["color", "exterior_color", "ext_color", "extcolor", "colour", "exterior colour", "body_color"],
  },
  {
    key: "vin",
    label: "VIN",
    required: false,
    aliases: ["vin", "vin#", "vin_number", "vehicle_id", "vehicle_identification_number"],
    valuePattern: /^[A-HJ-NPR-Z0-9]{17}$/i,
    valueHint: "17-character alphanumeric",
  },
  {
    key: "price",
    label: "Price",
    required: false,
    aliases: ["price", "selling_price", "list_price", "msrp", "internet_price", "sale_price", "asking_price", "retail_price"],
    valuePattern: /^\$?[\d,]+(\.\d{2})?$/,
    valueHint: "Dollar amount (e.g. $25,000)",
  },
  {
    key: "mileage",
    label: "Mileage",
    required: false,
    aliases: ["mileage", "miles", "odometer", "odo", "odometer_reading", "current_mileage"],
    valuePattern: /^[\d,]+$/,
    valueHint: "Numeric miles (e.g. 32000)",
  },
  {
    key: "trim",
    label: "Trim",
    required: false,
    aliases: ["trim", "trim_level", "trim_line", "grade", "series", "sub_model", "submodel"],
  },
  {
    key: "transmission",
    label: "Transmission",
    required: false,
    aliases: ["transmission", "trans", "gearbox", "transmission_type"],
  },
  {
    key: "drivetrain",
    label: "Drivetrain",
    required: false,
    aliases: ["drivetrain", "drive_type", "driveline", "4wd", "awd", "fwd", "rwd"],
  },
  {
    key: "fuelType",
    label: "Fuel Type",
    required: false,
    aliases: ["fuel", "fuel_type", "fueltype", "fuel_economy", "engine_fuel"],
  },
  {
    key: "interiorColor",
    label: "Interior Color",
    required: false,
    aliases: ["interior", "interior_color", "int_color", "intcolor", "interior_colour"],
  },
  {
    key: "imageUrl",
    label: "Image URL",
    required: false,
    aliases: ["image", "image_url", "photo", "photo_url", "picture", "pic", "img", "thumbnail"],
    valuePattern: /^https?:\/\/.+/i,
    valueHint: "URL starting with http/https",
  },
  {
    key: "dealershipUrl",
    label: "Vehicle URL",
    required: false,
    aliases: ["url", "vehicle_url", "listing_url", "detail_url", "link", "webpage"],
    valuePattern: /^https?:\/\/.+/i,
    valueHint: "URL starting with http/https",
  },
];

const crmMappingStore = new Map<string, Record<string, string>>();

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function scoreHeaderMatch(header: string, field: FieldDef): number {
  const h = normalize(header);
  if (field.aliases.some(a => normalize(a) === h)) return 100;
  if (field.aliases.some(a => h.includes(normalize(a)) || normalize(a).includes(h))) return 75;
  if (normalize(field.key) === h) return 70;
  return 0;
}

function scoreValueMatch(samples: string[], field: FieldDef): number {
  if (!field.valuePattern || samples.length === 0) return 0;
  const hits = samples.filter(v => v && field.valuePattern!.test(v.trim())).length;
  return Math.round((hits / samples.length) * 40);
}

function analyzeColumn(
  header: string,
  samples: string[],
  savedMappings?: Record<string, string>
): { fieldKey: string | null; confidence: number; source: "saved" | "auto" | "none" } {
  if (savedMappings && savedMappings[header]) {
    return { fieldKey: savedMappings[header], confidence: 100, source: "saved" };
  }

  let best: { fieldKey: string; score: number } | null = null;

  for (const field of VEHICLE_FIELDS) {
    const headerScore = scoreHeaderMatch(header, field);
    const valueScore = scoreValueMatch(samples, field);
    const total = Math.min(headerScore + valueScore, 100);
    if (total > 0 && (!best || total > best.score)) {
      best = { fieldKey: field.key, score: total };
    }
  }

  if (!best || best.score < 30) return { fieldKey: null, confidence: 0, source: "none" };
  return { fieldKey: best.fieldKey, confidence: best.score, source: "auto" };
}

export function registerCsvImportRoutes(app: Express) {

  app.post("/api/csv-import/analyze", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const crmName: string = req.body.crmName || "";
      const savedMappings = crmName ? crmMappingStore.get(crmName) : undefined;

      const content = req.file.buffer.toString("utf-8");
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];

      if (records.length === 0) return res.status(400).json({ error: "CSV file is empty" });

      const headers = Object.keys(records[0]);
      const sampleSize = Math.min(5, records.length);
      const totalRows = records.length;

      const columns = headers.map(header => {
        const samples = records.slice(0, sampleSize).map(r => r[header] || "").filter(Boolean);
        const { fieldKey, confidence, source } = analyzeColumn(header, samples, savedMappings);
        const fieldDef = fieldKey ? VEHICLE_FIELDS.find(f => f.key === fieldKey) : null;

        return {
          header,
          samples,
          fieldKey,
          confidence,
          source,
          bucket: confidence >= 85 ? "auto" : confidence >= 60 ? "review" : "unmapped",
          required: fieldDef?.required || false,
          fieldLabel: fieldDef?.label || null,
          valueHint: fieldDef?.valueHint || null,
        };
      });

      res.json({
        headers,
        columns,
        totalRows,
        sampleRows: records.slice(0, 5),
        hasSavedMappings: !!savedMappings,
        crmName,
        summary: {
          auto: columns.filter(c => c.bucket === "auto").length,
          review: columns.filter(c => c.bucket === "review").length,
          unmapped: columns.filter(c => c.bucket === "unmapped").length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Analysis failed" });
    }
  });

  app.post("/api/csv-import/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const mappings: Record<string, string> = JSON.parse(req.body.mappings || "{}");
      const crmName: string = req.body.crmName || "";
      const saveMappings: boolean = req.body.saveMappings === "true";

      if (saveMappings && crmName) {
        crmMappingStore.set(crmName, mappings);
      }

      const content = req.file.buffer.toString("utf-8");
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];

      const headerToField: Record<string, string> = {};
      for (const [header, fieldKey] of Object.entries(mappings)) {
        if (fieldKey) headerToField[header] = fieldKey;
      }

      const results = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        rows: [] as { row: number; status: string; message: string; vehicle?: string }[],
      };

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNum = i + 1;

        try {
          const vehicleData: Record<string, any> = {};
          for (const [header, value] of Object.entries(record)) {
            const fieldKey = headerToField[header];
            if (fieldKey && value) {
              vehicleData[fieldKey] = value.trim();
            }
          }

          const hasMinimum = (vehicleData.year && vehicleData.make && vehicleData.model) || vehicleData.stockNumber;
          if (!hasMinimum) {
            results.skipped++;
            results.rows.push({ row: rowNum, status: "skipped", message: "Missing required fields (year/make/model or stock number)" });
            continue;
          }

          if (vehicleData.year) vehicleData.year = parseInt(vehicleData.year, 10) || null;
          if (vehicleData.price) vehicleData.price = vehicleData.price.replace(/[$,]/g, "");
          if (vehicleData.mileage) vehicleData.mileage = vehicleData.mileage.replace(/[,\s]/g, "") + " miles";

          if (!vehicleData.title && vehicleData.year && vehicleData.make && vehicleData.model) {
            vehicleData.title = `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
          }
          if (!vehicleData.title) vehicleData.title = vehicleData.stockNumber || "Untitled Vehicle";
          if (!vehicleData.vin) vehicleData.vin = vehicleData.stockNumber || `IMP-${Date.now()}-${i}`;

          const stockNumber = vehicleData.stockNumber;
          let existing: any = null;

          if (stockNumber) {
            existing = await storage.getVehicleByStockNumber(stockNumber);
          }

          const label = vehicleData.title;

          if (existing) {
            await storage.updateVehicle(existing.id, vehicleData);
            results.updated++;
            results.rows.push({ row: rowNum, status: "updated", message: "Updated existing vehicle", vehicle: label });
          } else {
            await storage.createVehicle(vehicleData as any);
            results.inserted++;
            results.rows.push({ row: rowNum, status: "inserted", message: "Imported successfully", vehicle: label });
          }
        } catch (err: any) {
          results.failed++;
          results.rows.push({ row: rowNum, status: "failed", message: err.message || "Unknown error" });
        }
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Import failed" });
    }
  });

  app.get("/api/csv-import/crm-names", (_req, res) => {
    res.json({ names: Array.from(crmMappingStore.keys()) });
  });
}
