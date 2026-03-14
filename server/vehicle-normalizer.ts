export interface NormalizedVehicle {
  vin: string;
  title: string;
  price: string;
  mileage: string;
  imageUrl: string;
  make: string;
  model: string;
  year: number | null;
  transmission: string;
  interiorColor: string;
  exteriorColor: string;
  stockNumber: string;
  dealershipUrl: string;
  trim: string;
  type: string;
  drivetrain: string;
  fuelType: string;
}

const VEHICLE_FIELD_ALIASES: Record<string, string[]> = {
  vin: ["vin", "vin_number", "vinNumber", "vehicle_identification_number"],
  year: ["year", "modelYear", "model_year", "vehicleYear"],
  make: ["make", "manufacturer", "brand", "vehicleMake"],
  model: ["model", "vehicleModel", "model_name"],
  trim: ["trim", "trimLevel", "trim_level", "series"],
  price: [
    "price",
    "askingPrice",
    "asking_price",
    "listPrice",
    "list_price",
    "salePrice",
    "sale_price",
    "internetPrice",
    "internet_price",
    "msrp",
    "retailPrice",
  ],
  mileage: ["mileage", "miles", "odometer", "odo", "mileageValue"],
  stockNumber: [
    "stockNumber",
    "stock_number",
    "stockNo",
    "stock",
    "stockId",
    "stock_id",
  ],
  transmission: [
    "transmission",
    "trans",
    "transmissionType",
    "transmission_type",
  ],
  exteriorColor: [
    "exteriorColor",
    "exterior_color",
    "extColor",
    "colorExterior",
    "color",
  ],
  interiorColor: [
    "interiorColor",
    "interior_color",
    "intColor",
    "colorInterior",
  ],
  drivetrain: ["drivetrain", "driveType", "drive_type", "driveTrain"],
  fuelType: ["fuelType", "fuel_type", "fuel", "fuelEconomy"],
  type: ["type", "bodyType", "body_type", "bodyStyle", "body_style", "vehicleType"],
  imageUrl: [
    "imageUrl",
    "image_url",
    "photo",
    "photoUrl",
    "photo_url",
    "thumbnail",
    "thumbnailUrl",
    "primaryPhoto",
    "primary_photo",
    "mainImage",
  ],
  images: [
    "images",
    "photos",
    "imageUrls",
    "image_urls",
    "photoUrls",
    "photo_urls",
    "gallery",
    "media",
  ],
  dealershipUrl: [
    "dealershipUrl",
    "detailUrl",
    "detail_url",
    "url",
    "link",
    "vdpUrl",
    "vehicleUrl",
  ],
  title: ["title", "name", "vehicleName", "displayTitle", "heading"],
};

function findField(obj: Record<string, any>, fieldName: string): any {
  const aliases = VEHICLE_FIELD_ALIASES[fieldName] || [fieldName];
  for (const alias of aliases) {
    if (obj[alias] !== undefined && obj[alias] !== null && obj[alias] !== "") {
      return obj[alias];
    }
    const lowerAlias = alias.toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lowerAlias) {
        return obj[key];
      }
    }
  }
  return undefined;
}

function formatPrice(val: any): string {
  if (!val) return "N/A";
  const str = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return "N/A";
  return "$" + num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatMileage(val: any): string {
  if (!val) return "N/A";
  const str = String(val).replace(/[^0-9]/g, "");
  const num = parseInt(str);
  if (isNaN(num) || num <= 0) return "N/A";
  return num.toLocaleString("en-US") + " miles";
}

function extractImages(obj: Record<string, any>): string {
  const singleImg = findField(obj, "imageUrl");
  const multiImg = findField(obj, "images");

  if (multiImg) {
    if (Array.isArray(multiImg)) {
      const urls = multiImg
        .slice(0, 15)
        .map((item: any) => {
          if (typeof item === "string") return item;
          if (item?.url) return item.url;
          if (item?.src) return item.src;
          if (item?.href) return item.href;
          return null;
        })
        .filter(Boolean);
      if (urls.length > 0) return urls.join(",");
    }
    if (typeof multiImg === "string" && multiImg.includes(",")) {
      return multiImg;
    }
  }

  if (singleImg) return String(singleImg);
  return "";
}

export function normalizeVehicle(
  raw: Record<string, any>,
  sourceUrl: string
): NormalizedVehicle | null {
  const year = findField(raw, "year");
  const make = findField(raw, "make");
  const model = findField(raw, "model");

  if (!year && !make && !model) return null;

  const parsedYear = year ? parseInt(String(year)) : null;
  if (parsedYear && (parsedYear < 1900 || parsedYear > 2030)) return null;

  const makeStr = make ? String(make).trim() : "";
  const modelStr = model ? String(model).trim() : "";
  const trimStr = findField(raw, "trim") ? String(findField(raw, "trim")).trim() : "";

  let title = findField(raw, "title");
  if (!title && parsedYear && makeStr) {
    title = `${parsedYear} ${makeStr} ${modelStr}`.trim();
  }

  const vin = findField(raw, "vin");
  const stockNumber = findField(raw, "stockNumber");
  const vinStr = vin
    ? String(vin)
    : stockNumber
      ? String(stockNumber)
      : `AUTO${parsedYear || ""}${makeStr.substring(0, 3).toUpperCase()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  return {
    vin: vinStr,
    title: title ? String(title).trim() : `${parsedYear || ""} ${makeStr} ${modelStr}`.trim(),
    price: formatPrice(findField(raw, "price")),
    mileage: formatMileage(findField(raw, "mileage")),
    imageUrl: extractImages(raw),
    make: makeStr,
    model: modelStr,
    year: parsedYear,
    transmission: findField(raw, "transmission")
      ? String(findField(raw, "transmission")).trim()
      : "",
    interiorColor: findField(raw, "interiorColor")
      ? String(findField(raw, "interiorColor")).trim()
      : "",
    exteriorColor: findField(raw, "exteriorColor")
      ? String(findField(raw, "exteriorColor")).trim()
      : "",
    stockNumber: stockNumber ? String(stockNumber) : "",
    dealershipUrl: findField(raw, "dealershipUrl")
      ? String(findField(raw, "dealershipUrl"))
      : sourceUrl,
    trim: trimStr,
    type: findField(raw, "type") ? String(findField(raw, "type")).trim() : "",
    drivetrain: findField(raw, "drivetrain")
      ? String(findField(raw, "drivetrain")).trim()
      : "",
    fuelType: findField(raw, "fuelType")
      ? String(findField(raw, "fuelType")).trim()
      : "",
  };
}

export function looksLikeVehicleData(data: any): boolean {
  if (!Array.isArray(data)) return false;
  if (data.length < 2) return false;

  let vehicleCount = 0;
  for (const item of data.slice(0, 10)) {
    if (typeof item !== "object" || item === null) continue;
    const keys = Object.keys(item).map((k) => k.toLowerCase());
    let matchCount = 0;
    const vehicleFields = [
      "year",
      "make",
      "model",
      "price",
      "vin",
      "mileage",
      "stock",
      "odometer",
      "trim",
      "transmission",
    ];
    for (const field of vehicleFields) {
      if (keys.some((k) => k.includes(field))) matchCount++;
    }
    if (matchCount >= 3) vehicleCount++;
  }

  return vehicleCount >= 2;
}

export function extractVehicleArray(data: any): any[] | null {
  if (Array.isArray(data) && looksLikeVehicleData(data)) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (Array.isArray(val) && looksLikeVehicleData(val)) {
        return val;
      }
    }

    for (const key of Object.keys(data)) {
      const val = data[key];
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        for (const subKey of Object.keys(val)) {
          const subVal = val[subKey];
          if (Array.isArray(subVal) && looksLikeVehicleData(subVal)) {
            return subVal;
          }
        }
      }
    }
  }

  return null;
}
