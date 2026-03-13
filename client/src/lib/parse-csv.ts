import type { DemoVehicle } from "./demo-vehicles";

const COLUMN_ALIASES: Record<string, string[]> = {
  year: ["year", "yr", "model_year"],
  make: ["make", "manufacturer", "brand"],
  model: ["model", "model_name"],
  trim: ["trim", "trim_level", "series"],
  vin: ["vin", "vin#", "vin_number"],
  stockNumber: ["stock", "stock#", "stock_number", "unit"],
  price: ["price", "selling_price", "list_price", "msrp", "internet_price"],
  mileage: ["mileage", "miles", "odometer"],
  exteriorColor: ["color", "exterior_color", "ext_color", "colour"],
  transmission: ["transmission", "trans"],
  fuelType: ["fuel", "fuel_type"],
  condition: ["condition"],
  description: ["description"],
};

function parseCSVText(text: string): string[][] {
  const results: string[][] = [];
  let fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (current.length > 0 || fields.length > 0) {
        fields.push(current);
        results.push(fields);
        fields = [];
        current = "";
      }
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || fields.length > 0) {
    fields.push(current);
    results.push(fields);
  }
  return results;
}

function autoMapColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalized = headers.map((h) =>
    h.toLowerCase().trim().replace(/[^a-z0-9_#]/g, "_")
  );

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      for (const alias of aliases) {
        const normAlias = alias.replace(/[^a-z0-9_#]/g, "_");
        if (h === normAlias || h === alias || h.includes(normAlias)) {
          if (mapping[field] === undefined) {
            mapping[field] = i;
          }
          break;
        }
      }
    }
  }
  return mapping;
}

export function processCSV(text: string): DemoVehicle[] {
  const rows: DemoVehicle[] = [];
  let headers: string[] | null = null;
  let mapping: Record<string, number> | null = null;

  for (const fields of parseCSVText(text)) {
    if (!headers) {
      headers = fields;
      mapping = autoMapColumns(headers);
      continue;
    }
    const vehicle: any = { id: "csv_" + rows.length + "_" + Date.now() };
    for (const [field, colIdx] of Object.entries(mapping!)) {
      const val = fields[colIdx] !== undefined ? fields[colIdx].trim() : "";
      vehicle[field] = val;
    }
    if (vehicle.price) {
      vehicle.price = vehicle.price.replace(/[^0-9.]/g, "");
    }
    if (vehicle.mileage) {
      vehicle.mileage = vehicle.mileage.replace(/[^0-9]/g, "");
    }
    if (vehicle.make || vehicle.model) {
      rows.push(vehicle as DemoVehicle);
    }
  }
  return rows;
}
