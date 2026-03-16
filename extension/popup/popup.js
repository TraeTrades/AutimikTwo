var SITE_URLS = {
  facebook: "https://www.facebook.com/marketplace/create/vehicle",
  craigslist: "https://post.craigslist.org/",
  offerup: "https://offerup.com/post/"
};

var SITE_PATTERNS = {
  facebook: "facebook.com/marketplace/create/vehicle",
  craigslist: "craigslist.org/post",
  offerup: "offerup.com/post"
};

var COLUMN_ALIASES = {
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
  condition: ["condition"]
};

function vehicleKey(v) {
  if (v.vin && v.vin.length >= 6) return "vin:" + v.vin.toUpperCase();
  if (v.stockNumber && v.stockNumber.length >= 2) return "stk:" + v.stockNumber;
  return "id:" + v.id;
}

var vehicles = [];
var listedMap = {};
var isOnTargetPage = false;
var currentTabUrl = "";
var autoAdvance = false;
var lastVehicle = null;

var uploadView = document.getElementById("uploadView");
var inventoryView = document.getElementById("inventoryView");
var vehicleList = document.getElementById("vehicleList");
var searchInput = document.getElementById("searchInput");
var statusBar = document.getElementById("statusBar");
var btnClear = document.getElementById("btnClear");
var btnAuto = document.getElementById("btnAuto");
var dropZone = document.getElementById("dropZone");
var fileInput = document.getElementById("fileInput");
var toast = document.getElementById("toast");
var targetSiteSelect = document.getElementById("targetSite");
var siteSelectorDiv = document.getElementById("siteSelector");
var settingsPanel = document.getElementById("settingsPanel");
var btnSettings = document.getElementById("btnSettings");
var apiKeyInput = document.getElementById("apiKeyInput");
var btnSaveKey = document.getElementById("btnSaveKey");
var btnClearCache = document.getElementById("btnClearCache");
var errorDialog = document.getElementById("errorDialog");
var errorTitle = document.getElementById("errorTitle");
var errorBody = document.getElementById("errorBody");
var errorSteps = document.getElementById("errorSteps");
var btnRetry = document.getElementById("btnRetry");
var btnDismiss = document.getElementById("btnDismiss");

var monitorWindowId = null;

function openMonitorWindow(vehicleLabel) {
  var url = chrome.runtime.getURL("popup/monitor.html") +
    "?v=" + encodeURIComponent(vehicleLabel || "");
  if (monitorWindowId !== null) {
    chrome.windows.get(monitorWindowId, function (win) {
      if (chrome.runtime.lastError || !win) {
        monitorWindowId = null;
        createMonitorWindow(url);
      } else {
        chrome.windows.update(monitorWindowId, { focused: true });
      }
    });
  } else {
    createMonitorWindow(url);
  }
}

function createMonitorWindow(url) {
  chrome.windows.create(
    { url: url, type: "popup", width: 360, height: 420, focused: false },
    function (win) { monitorWindowId = win ? win.id : null; }
  );
}

function showErrorDialog(title, body, steps) {
  errorTitle.textContent = title;
  errorBody.textContent = body;
  errorSteps.innerHTML = "";
  steps.forEach(function (step) {
    var li = document.createElement("li");
    li.textContent = step;
    errorSteps.appendChild(li);
  });
  errorDialog.classList.remove("hidden");
}

function hideErrorDialog() {
  errorDialog.classList.add("hidden");
}

function categorizeError(err) {
  var msg = (err || "").toLowerCase();
  if (msg.includes("could not connect") || msg.includes("lasterror") || msg.includes("receiving end does not exist")) {
    return {
      title: "Connection Lost",
      body: "The listing tab disconnected before the fill could complete.",
      steps: ["Refresh the listing tab", "Click List It again"]
    };
  }
  if (msg.includes("inject") || msg.includes("scripting")) {
    return {
      title: "Injection Failed",
      body: "The extension could not inject into the listing page.",
      steps: ["Reload the extension at chrome://extensions", "Try again"]
    };
  }
  if (msg.includes("required fields")) {
    return {
      title: "Fill Incomplete",
      body: "One or more required fields could not be filled.",
      steps: ["Make sure the form is fully loaded", "Try again"]
    };
  }
  if (msg.includes("no fillable")) {
    return {
      title: "Page Not Recognized",
      body: "No fillable form was found on the current tab.",
      steps: ["Make sure you are on the listing form page", "Try again"]
    };
  }
  return {
    title: "Unexpected Error",
    body: err || "An unknown error occurred.",
    steps: ["Refresh the listing tab", "Try again"]
  };
}

function showToast(message, type) {
  toast.textContent = message;
  toast.className = "toast " + type;
  requestAnimationFrame(function () {
    toast.classList.add("show");
  });
  setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

function setStatus(text) {
  statusBar.textContent = text;
}

function updateStatus() {
  if (vehicles.length === 0) {
    setStatus("Ready");
    return;
  }
  var listedCount = vehicles.filter(function (v) { return !!listedMap[vehicleKey(v)]; }).length;
  var unlistedCount = vehicles.length - listedCount;
  setStatus(listedCount + " listed \u00b7 " + unlistedCount + " remaining \u00b7 " + vehicles.length + " total");
}

function getSelectedSite() {
  return targetSiteSelect.value;
}

function isKnownSiteUrl(url) {
  for (var key in SITE_PATTERNS) {
    if (url.includes(SITE_PATTERNS[key])) return true;
  }
  return false;
}

function checkPageMatch() {
  var site = getSelectedSite();
  if (site === "current") {
    return currentTabUrl && currentTabUrl.startsWith("https://");
  }
  var pattern = SITE_PATTERNS[site];
  return pattern && currentTabUrl.includes(pattern);
}

function getWrongPageMessage() {
  var site = getSelectedSite();
  if (site === "current") {
    if (!currentTabUrl || !currentTabUrl.startsWith("https://")) {
      return "Navigate to a listing site first (HTTPS required). The current tab is not a supported page.";
    }
    if (!isKnownSiteUrl(currentTabUrl)) {
      return "This is an unknown listing site. AI mode will be used to detect form fields. An Anthropic API key is required (see settings).";
    }
    return "";
  }
  var siteNames = {
    facebook: "Facebook Marketplace vehicle listing page",
    craigslist: "Craigslist posting page",
    offerup: "OfferUp posting page"
  };
  return "You're not on the " + (siteNames[site] || "correct listing page") + ".";
}

function getOpenLink() {
  var site = getSelectedSite();
  return SITE_URLS[site] || SITE_URLS.facebook;
}

function getSiteName() {
  var site = getSelectedSite();
  var names = {
    facebook: "FB Marketplace",
    craigslist: "Craigslist",
    offerup: "OfferUp"
  };
  return names[site] || "listing site";
}

function parseCSV(text) {
  var results = [];
  var fields = [];
  var current = "";
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
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
  var mapping = {};
  var normalized = headers.map(function (h) { return h.toLowerCase().trim().replace(/[^a-z0-9_#]/g, "_"); });

  for (var field in COLUMN_ALIASES) {
    var aliases = COLUMN_ALIASES[field];
    for (var i = 0; i < normalized.length; i++) {
      var h = normalized[i];
      for (var j = 0; j < aliases.length; j++) {
        var alias = aliases[j];
        var normAlias = alias.replace(/[^a-z0-9_#]/g, "_");
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
  var rows = [];
  var headers = null;
  var mapping = null;

  var parsed = parseCSV(text);
  for (var r = 0; r < parsed.length; r++) {
    var fields = parsed[r];
    if (!headers) {
      headers = fields;
      mapping = autoMapColumns(headers);
      continue;
    }
    var vehicle = { id: "v_" + rows.length + "_" + Date.now() };
    for (var field in mapping) {
      var colIdx = mapping[field];
      var val = fields[colIdx] !== undefined ? fields[colIdx].trim() : "";
      if (field === "imageUrls" && val) {
        vehicle.imageUrls = val.split(/[\s,|;]+/).map(function (u) { return u.trim(); }).filter(function (u) { return u.startsWith("http"); });
      } else if (field === "imageUrl" && val) {
        var urls = val.split(/[\s,|;]+/).map(function (u) { return u.trim(); }).filter(function (u) { return u.startsWith("http"); });
        if (urls.length > 1) {
          vehicle.imageUrls = (vehicle.imageUrls || []).concat(urls);
        } else {
          vehicle[field] = val;
        }
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

function getNextUnlisted(currentVehicleId) {
  var idx = vehicles.findIndex(function (v) { return v.id === currentVehicleId; });
  for (var i = idx + 1; i < vehicles.length; i++) {
    if (!listedMap[vehicleKey(vehicles[i])]) return vehicles[i];
  }
  return null;
}

function listVehicle(vehicle) {
  lastVehicle = vehicle;
  var label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.title || "Vehicle";
  openMonitorWindow(label);

  var btn = vehicleList.querySelector('.btn-list[data-id="' + vehicle.id + '"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Filling...";
  }
  setStatus("Filling form...");

  var targetSite = getSelectedSite();

  chrome.runtime.sendMessage(
    { type: "LIST_VEHICLE", payload: { vehicle: vehicle, targetSite: targetSite } },
    function (response) {
      if (chrome.runtime.lastError) {
        var errMsg = chrome.runtime.lastError.message || "";
        chrome.runtime.sendMessage({ type: "FILL_DONE", payload: { success: false, message: errMsg } });
        var info = categorizeError(errMsg);
        showErrorDialog(info.title, info.body, info.steps);
        if (btn) { btn.disabled = false; btn.textContent = "List It"; }
        return;
      }
      if (response && response.success) {
        chrome.runtime.sendMessage({ type: "FILL_DONE", payload: { success: true, message: "Listed successfully!" } });
        var key = vehicleKey(vehicle);
        listedMap[key] = { timestamp: Date.now() };
        showToast("Listed! \u2713", "success");
        renderVehicles(searchInput.value);
        if (autoAdvance) {
          var next = getNextUnlisted(vehicle.id);
          if (next) {
            setTimeout(function () { listVehicle(next); }, 2000);
          } else {
            setStatus("All vehicles listed!");
          }
        } else {
          updateStatus();
        }
      } else {
        var err = response ? response.error : "Unknown error";
        chrome.runtime.sendMessage({ type: "FILL_DONE", payload: { success: false, message: err } });
        var info = categorizeError(err);
        showErrorDialog(info.title, info.body, info.steps);
        if (btn) { btn.disabled = false; btn.textContent = "List It"; }
      }
    }
  );
}

function renderVehicles(filter) {
  vehicleList.innerHTML = "";
  var query = (filter || "").toLowerCase();
  var filtered = vehicles.filter(function (v) {
    if (!query) return true;
    var text = [v.year, v.make, v.model, v.trim, v.vin, v.stockNumber, v.title]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  });

  isOnTargetPage = checkPageMatch();
  var wrongPageMsg = getWrongPageMessage();

  if (!isOnTargetPage) {
    var warn = document.createElement("div");
    warn.className = "wrong-page";
    warn.innerHTML =
      '<span class="wrong-page-icon">&#9888;&#65039;</span>' +
      '<p>' + wrongPageMsg + '</p>' +
      '<a id="openSiteLink" href="#">Open ' + getSiteName() + ' &rarr;</a>';
    vehicleList.appendChild(warn);
    warn.querySelector("#openSiteLink").addEventListener("click", function (e) {
      e.preventDefault();
      chrome.tabs.create({ url: getOpenLink() });
    });
  } else if (getSelectedSite() === "current" && wrongPageMsg) {
    var info = document.createElement("div");
    info.className = "wrong-page";
    info.style.borderColor = "#1e40af";
    info.innerHTML =
      '<span class="wrong-page-icon">&#128300;</span>' +
      '<p style="color:#93c5fd;">' + wrongPageMsg + '</p>';
    vehicleList.appendChild(info);
  }

  if (filtered.length === 0 && query) {
    vehicleList.innerHTML += '<div style="text-align:center;padding:20px;color:#64748b;font-size:13px;">No vehicles match your search</div>';
  }

  filtered.forEach(function (v) {
    var isListed = !!listedMap[vehicleKey(v)];
    var card = document.createElement("div");
    card.className = "vehicle-card" + (isListed ? " listed" : "");

    var thumbSrc = v.imageUrl || (v.imageUrls && v.imageUrls[0]) || "";
    var displayTitle = v.title || [v.year, v.make, v.model].filter(Boolean).join(" ");
    var priceDisplay = v.price ? "$" + Number(v.price).toLocaleString() : "";
    var mileageDisplay = v.mileage ? Number(v.mileage).toLocaleString() + " mi" : "";

    if (thumbSrc) {
      var img = document.createElement("img");
      img.className = "vehicle-thumb";
      img.src = thumbSrc;
      img.alt = displayTitle;
      img.onerror = function () { this.style.display = "none"; };
      card.appendChild(img);
    } else {
      var placeholder = document.createElement("div");
      placeholder.className = "vehicle-thumb";
      card.appendChild(placeholder);
    }

    var info = document.createElement("div");
    info.className = "vehicle-info";
    var titleEl = document.createElement("div");
    titleEl.className = "vehicle-title";
    titleEl.textContent = displayTitle;
    info.appendChild(titleEl);
    var meta = document.createElement("div");
    meta.className = "vehicle-meta";
    if (priceDisplay) {
      var priceSpan = document.createElement("span");
      priceSpan.textContent = priceDisplay;
      meta.appendChild(priceSpan);
    }
    if (mileageDisplay) {
      var mileSpan = document.createElement("span");
      mileSpan.textContent = mileageDisplay;
      meta.appendChild(mileSpan);
    }
    info.appendChild(meta);
    card.appendChild(info);

    if (isListed) {
      var badge = document.createElement("div");
      badge.className = "listed-badge";
      badge.textContent = "Listed";
      card.appendChild(badge);
    } else {
      var btn = document.createElement("button");
      btn.className = "btn-list";
      btn.dataset.id = v.id;
      btn.textContent = "List It";
      card.appendChild(btn);
    }

    vehicleList.appendChild(card);
  });

  updateStatus();
}

function showUploadView() {
  uploadView.classList.remove("hidden");
  inventoryView.classList.add("hidden");
  siteSelectorDiv.classList.add("hidden");
  btnClear.classList.add("hidden");
  btnAuto.classList.add("hidden");
  setStatus("Ready");
}

function showInventoryView() {
  uploadView.classList.add("hidden");
  inventoryView.classList.remove("hidden");
  siteSelectorDiv.classList.remove("hidden");
  btnClear.classList.remove("hidden");
  btnAuto.classList.remove("hidden");
  renderVehicles(searchInput.value);
}

function handleFile(file) {
  if (!file || !file.name.endsWith(".csv")) {
    showToast("Please upload a CSV file", "error");
    return;
  }
  setStatus("Reading CSV...");
  var reader = new FileReader();
  reader.onload = function (e) {
    var text = e.target.result;
    vehicles = processCSV(text);
    if (vehicles.length === 0) {
      showToast("No vehicles found in CSV", "error");
      setStatus("Ready");
      return;
    }
    chrome.runtime.sendMessage(
      { type: "SAVE_INVENTORY", payload: { vehicles: vehicles } },
      function () {
        showToast(vehicles.length + " vehicles loaded", "success");
        showInventoryView();
      }
    );
  };
  reader.readAsText(file);
}

dropZone.addEventListener("click", function () { fileInput.click(); });
fileInput.addEventListener("change", function (e) {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
dropZone.addEventListener("dragover", function (e) {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", function () {
  dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", function (e) {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

searchInput.addEventListener("input", function () {
  renderVehicles(searchInput.value);
});

targetSiteSelect.addEventListener("change", function () {
  renderVehicles(searchInput.value);
});

vehicleList.addEventListener("click", function (e) {
  var btn = e.target.closest(".btn-list");
  if (!btn) return;
  var vehicleId = btn.dataset.id;
  var vehicle = vehicles.find(function (v) { return v.id === vehicleId; });
  if (!vehicle) return;
  listVehicle(vehicle);
});

btnClear.addEventListener("click", function () {
  if (!confirm("Clear all inventory data?")) return;
  chrome.runtime.sendMessage({ type: "CLEAR_INVENTORY" }, function () {
    vehicles = [];
    listedMap = {};
    autoAdvance = false;
    btnAuto.textContent = "Auto: OFF";
    btnAuto.classList.remove("on");
    showToast("Inventory cleared", "success");
    showUploadView();
  });
});

btnAuto.addEventListener("click", function () {
  autoAdvance = !autoAdvance;
  btnAuto.textContent = autoAdvance ? "Auto: ON" : "Auto: OFF";
  btnAuto.classList.toggle("on", autoAdvance);
});

btnSettings.addEventListener("click", function () {
  settingsPanel.classList.toggle("hidden");
  if (!settingsPanel.classList.contains("hidden")) {
    chrome.runtime.sendMessage({ type: "GET_API_KEY" }, function (response) {
      if (response && response.apiKey) {
        apiKeyInput.value = response.apiKey;
      }
    });
  }
});

btnSaveKey.addEventListener("click", function () {
  var key = apiKeyInput.value.trim();
  chrome.runtime.sendMessage({ type: "SAVE_API_KEY", payload: { apiKey: key } }, function () {
    showToast(key ? "API key saved" : "API key cleared", "success");
  });
});

btnClearCache.addEventListener("click", function () {
  chrome.runtime.sendMessage({ type: "CLEAR_SITE_CACHE" }, function () {
    showToast("Site cache cleared", "success");
  });
});

btnRetry.addEventListener("click", function () {
  hideErrorDialog();
  if (lastVehicle) listVehicle(lastVehicle);
});

btnDismiss.addEventListener("click", function () {
  hideErrorDialog();
  updateStatus();
});

chrome.runtime.onMessage.addListener(function (message) {
  if (message.type === "FILL_STATUS" && message.payload) {
    var step = message.payload.step || "";
    var detail = message.payload.detail || "";
    setStatus(step + (detail ? " " + detail : ""));
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  if (tabs[0] && tabs[0].url) {
    currentTabUrl = tabs[0].url;
  }

  chrome.runtime.sendMessage({ type: "GET_INVENTORY" }, function (invResponse) {
    chrome.runtime.sendMessage({ type: "GET_LISTED" }, function (listedResponse) {
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
