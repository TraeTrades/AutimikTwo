const COLUMN_ALIASES = {
  year: ["year", "yr", "model_year"],
  make: ["make", "manufacturer", "brand"],
  model: ["model", "model_name"],
  trim: ["trim", "trim_level", "series"],
  vin: ["vin", "vin#", "vin_number"],
  stockNumber: ["stock", "stock#", "stock_number", "unit"],
  price: ["price", "selling_price", "list_price", "msrp", "internet_price"],
  mileage: ["mileage", "miles", "odometer"],
  exteriorColor: ["color", "exterior_color", "ext_color", "colour"],
  interiorColor: ["interior", "interior_color", "int_color"],
  transmission: ["transmission", "trans"],
  drivetrain: ["drivetrain", "drive_type", "driveline"],
  fuelType: ["fuel", "fuel_type"],
  bodyStyle: ["body", "body_style", "body_type", "vehicle_type"],
  imageUrl: ["image", "image_url", "photo", "photo_url", "picture", "img", "images"],
  imageUrls: ["photos", "image_urls", "photo_urls"],
  title: ["title"],
  description: ["description"],
  condition: ["condition"],
};

let vehicles = [];
let listedMap = {};
let isOnFBPage = false;

const uploadView = document.getElementById("uploadView");
const inventoryView = document.getElementById("inventoryView");
const vehicleList = document.getElementById("vehicleList");
const searchInput = document.getElementById("searchInput");
const statusBar = document.getElementById("statusBar");
const btnClear = document.getElementById("btnClear");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const toast = document.getElementById("toast");

function showToast(message, type) {
  toast.textContent = message;
  toast.className = "toast " + type;
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function setStatus(text) {
  statusBar.textContent = text;
}

function parseCSV(text) {
  const results = [];
  let fields = [];
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

function autoMapColumns(headers) {
  const mapping = {};
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_#]/g, "_"));

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

function processCSV(text) {
  const rows = [];
  let headers = null;
  let mapping = null;

  for (const fields of parseCSV(text)) {
    if (!headers) {
      headers = fields;
      mapping = autoMapColumns(headers);
      continue;
    }
    const vehicle = { id: "v_" + rows.length + "_" + Date.now() };
    for (const [field, colIdx] of Object.entries(mapping)) {
      let val = fields[colIdx] !== undefined ? fields[colIdx].trim() : "";
      if (field === "imageUrls" && val) {
        vehicle.imageUrls = val.split(/[|;]/).map((u) => u.trim()).filter(Boolean);
      } else {
        vehicle[field] = val;
      }
    }
    if (vehicle.price) {
      vehicle.price = vehicle.price.replace(/[^0-9.]/g, "");
    }
    if (vehicle.mileage) {
      vehicle.mileage = vehicle.mileage.replace(/[^0-9]/g, "");
    }
    if (vehicle.make || vehicle.model || vehicle.title) {
      rows.push(vehicle);
    }
  }
  return rows;
}

function renderVehicles(filter) {
  vehicleList.innerHTML = "";
  const query = (filter || "").toLowerCase();
  const filtered = vehicles.filter((v) => {
    if (!query) return true;
    const text = [v.year, v.make, v.model, v.trim, v.vin, v.stockNumber, v.title]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  });

  if (!isOnFBPage) {
    const warn = document.createElement("div");
    warn.className = "wrong-page";
    warn.innerHTML = `
      <span class="wrong-page-icon">&#9888;&#65039;</span>
      <p>You're not on the Facebook Marketplace vehicle listing page.</p>
      <a id="openFBLink" href="#">Open FB Marketplace &rarr;</a>
    `;
    vehicleList.appendChild(warn);
    warn.querySelector("#openFBLink").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: "https://www.facebook.com/marketplace/create/vehicle" });
    });
  }

  if (filtered.length === 0 && query) {
    vehicleList.innerHTML += '<div style="text-align:center;padding:20px;color:#64748b;font-size:13px;">No vehicles match your search</div>';
  }

  filtered.forEach((v) => {
    const isListed = !!listedMap[v.id];
    const card = document.createElement("div");
    card.className = "vehicle-card" + (isListed ? " listed" : "");

    const thumbSrc = v.imageUrl || (v.imageUrls && v.imageUrls[0]) || "";
    const displayTitle = v.title || [v.year, v.make, v.model].filter(Boolean).join(" ");
    const priceDisplay = v.price ? "$" + Number(v.price).toLocaleString() : "";
    const mileageDisplay = v.mileage ? Number(v.mileage).toLocaleString() + " mi" : "";

    if (thumbSrc) {
      const img = document.createElement("img");
      img.className = "vehicle-thumb";
      img.src = thumbSrc;
      img.alt = displayTitle;
      img.onerror = function () { this.style.display = "none"; };
      card.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "vehicle-thumb";
      card.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "vehicle-info";
    const titleEl = document.createElement("div");
    titleEl.className = "vehicle-title";
    titleEl.textContent = displayTitle;
    info.appendChild(titleEl);
    const meta = document.createElement("div");
    meta.className = "vehicle-meta";
    if (priceDisplay) {
      const priceSpan = document.createElement("span");
      priceSpan.textContent = priceDisplay;
      meta.appendChild(priceSpan);
    }
    if (mileageDisplay) {
      const mileSpan = document.createElement("span");
      mileSpan.textContent = mileageDisplay;
      meta.appendChild(mileSpan);
    }
    info.appendChild(meta);
    card.appendChild(info);

    if (isListed) {
      const badge = document.createElement("div");
      badge.className = "listed-badge";
      badge.textContent = "Listed";
      card.appendChild(badge);
    } else {
      const btn = document.createElement("button");
      btn.className = "btn-list";
      btn.dataset.id = v.id;
      btn.textContent = "List It";
      card.appendChild(btn);
    }

    vehicleList.appendChild(card);
  });

  setStatus(filtered.length + " of " + vehicles.length + " vehicles");
}

function showUploadView() {
  uploadView.classList.remove("hidden");
  inventoryView.classList.add("hidden");
  btnClear.classList.add("hidden");
  setStatus("Ready");
}

function showInventoryView() {
  uploadView.classList.add("hidden");
  inventoryView.classList.remove("hidden");
  btnClear.classList.remove("hidden");
  renderVehicles(searchInput.value);
}

function handleFile(file) {
  if (!file || !file.name.endsWith(".csv")) {
    showToast("Please upload a CSV file", "error");
    return;
  }
  setStatus("Reading CSV...");
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    vehicles = processCSV(text);
    if (vehicles.length === 0) {
      showToast("No vehicles found in CSV", "error");
      setStatus("Ready");
      return;
    }
    chrome.runtime.sendMessage(
      { type: "SAVE_INVENTORY", payload: { vehicles } },
      () => {
        showToast(vehicles.length + " vehicles loaded", "success");
        showInventoryView();
      }
    );
  };
  reader.readAsText(file);
}

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

searchInput.addEventListener("input", () => {
  renderVehicles(searchInput.value);
});

vehicleList.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-list");
  if (!btn) return;
  const vehicleId = btn.dataset.id;
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return;

  btn.disabled = true;
  btn.textContent = "Filling...";
  setStatus("Filling form...");

  chrome.runtime.sendMessage(
    { type: "LIST_VEHICLE", payload: { vehicle } },
    (response) => {
      if (response && response.success) {
        chrome.runtime.sendMessage(
          { type: "MARK_LISTED", payload: { vehicleId } },
          () => {
            listedMap[vehicleId] = { timestamp: Date.now() };
            showToast("Listed! \u2713", "success");
            setStatus("Ready");
            renderVehicles(searchInput.value);
          }
        );
      } else {
        const err = response ? response.error : "Unknown error";
        showToast("Error: " + err, "error");
        setStatus("Ready");
        btn.disabled = false;
        btn.textContent = "List It";
      }
    }
  );
});

btnClear.addEventListener("click", () => {
  if (!confirm("Clear all inventory data?")) return;
  chrome.runtime.sendMessage({ type: "CLEAR_INVENTORY" }, () => {
    vehicles = [];
    listedMap = {};
    showToast("Inventory cleared", "success");
    showUploadView();
  });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    isOnFBPage = tabs[0].url.includes("facebook.com/marketplace/create/vehicle");
  }

  chrome.runtime.sendMessage({ type: "GET_INVENTORY" }, (invResponse) => {
    chrome.runtime.sendMessage({ type: "GET_LISTED" }, (listedResponse) => {
      if (listedResponse && listedResponse.listed) {
        listedMap = listedResponse.listed;
      }
      if (invResponse && invResponse.vehicles && invResponse.vehicles.length > 0) {
        vehicles = invResponse.vehicles;
        showInventoryView();
      } else {
        showUploadView();
      }
    });
  });
});
