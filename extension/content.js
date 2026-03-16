var ADAPTERS = {
  facebook: {
    "id": "facebook",
    "name": "Facebook Marketplace",
    "version": "1.1.0",
    "match": ["*://www.facebook.com/marketplace/create/vehicle*"],
    "strategy": "react_controlled",
    "timing": {
      "afterField": 500,
      "afterDropdown": 300,
      "afterDescription": 200,
      "afterPhotos": 1500,
      "settle": 1500,
      "phaseSettle": 1200
    },
    "requiredFields": ["price", "year", "make", "model", "mileage"],
    "optionalFields": ["vin", "title", "condition", "fuelType", "transmission", "drivetrain", "exteriorColor", "interiorColor", "bodyStyle", "description"],
    "fields": {
      "price": {
        "selector": ["input[aria-label=\"Price\"]", "input[placeholder*=\"Price\"]", "input[name*=\"price\"]"],
        "type": "input"
      },
      "year": {
        "selector": ["input[aria-label=\"Year\"]", "input[placeholder*=\"Year\"]"],
        "type": "input"
      },
      "make": {
        "selector": ["input[aria-label=\"Make\"]", "input[placeholder*=\"Make\"]"],
        "type": "input"
      },
      "model": {
        "selector": ["input[aria-label=\"Model\"]", "input[placeholder*=\"Model\"]"],
        "type": "input"
      },
      "mileage": {
        "selector": ["input[aria-label=\"Mileage\"]", "input[placeholder*=\"Mileage\"]", "input[placeholder*=\"miles\"]"],
        "type": "input"
      },
      "condition": {
        "selector": ["[aria-label=\"Condition\"]", "[aria-label*=\"Condition\"]"],
        "type": "dropdown",
        "valueMap": {
          "new": "new",
          "used": "used - good",
          "cpo": "used - like new",
          "certified": "used - like new",
          "excellent": "used - like new",
          "good": "used - good",
          "fair": "used - fair"
        },
        "default": "used - good"
      },
      "fuelType": {
        "selector": ["[aria-label=\"Fuel type\"]", "[aria-label*=\"Fuel type\"]"],
        "type": "dropdown",
        "valueMap": {
          "gas": "gasoline",
          "unleaded": "gasoline",
          "phev": "plug-in hybrid",
          "plug-in hybrid": "plug-in hybrid",
          "plug in hybrid": "plug-in hybrid",
          "electric": "electric",
          "ev": "electric",
          "diesel": "diesel",
          "hybrid": "hybrid",
          "flex": "flex fuel",
          "flex fuel": "flex fuel",
          "e85": "flex fuel"
        }
      },
      "transmission": {
        "selector": ["[aria-label=\"Transmission\"]", "[aria-label*=\"Transmission\"]"],
        "type": "dropdown",
        "valueMap": {
          "auto": "automatic transmission",
          "automatic": "automatic transmission",
          "at": "automatic transmission",
          "manual": "manual transmission",
          "mt": "manual transmission",
          "cvt": "cvt transmission"
        }
      },
      "drivetrain": {
        "selector": ["[aria-label=\"Drivetrain\"]", "[aria-label*=\"Drivetrain\"]"],
        "type": "dropdown",
        "valueMap": {
          "awd": "all-wheel drive",
          "4wd": "four-wheel drive",
          "4x4": "four-wheel drive",
          "fwd": "front-wheel drive",
          "rwd": "rear-wheel drive",
          "2wd": "rear-wheel drive"
        }
      },
      "exteriorColor": {
        "selector": ["[aria-label=\"Exterior color\"]", "[aria-label*=\"Exterior color\"]"],
        "type": "dropdown"
      },
      "interiorColor": {
        "selector": ["[aria-label=\"Interior color\"]", "[aria-label*=\"Interior color\"]"],
        "type": "dropdown"
      },
      "bodyStyle": {
        "selector": ["[aria-label=\"Vehicle type\"]", "[aria-label*=\"Vehicle type\"]"],
        "type": "dropdown",
        "valueMap": {
          "suv": "suv",
          "crossover": "suv",
          "cuv": "suv",
          "truck": "truck",
          "pickup": "truck",
          "pickup truck": "truck",
          "sedan": "sedan",
          "coupe": "coupe",
          "convertible": "convertible",
          "minivan": "minivan",
          "van": "van",
          "wagon": "wagon",
          "hatchback": "hatchback"
        }
      },
      "description": {
        "selector": [
          "textarea[aria-label=\"Description\"]",
          "[aria-label*=\"Description\"]",
          "div[role=\"textbox\"][aria-label*=\"escription\"]",
          "div[contenteditable=\"true\"]",
          "textarea"
        ],
        "type": "description"
      }
    }
  },

  craigslist: {
    "id": "craigslist",
    "name": "Craigslist",
    "version": "1.0.0",
    "match": ["*://*.craigslist.org/post*"],
    "strategy": "standard_html",
    "timing": {
      "afterField": 300,
      "afterDropdown": 200,
      "afterDescription": 200,
      "afterPhotos": 0,
      "settle": 1000
    },
    "fields": {
      "price": {
        "selector": ["input[name=\"price\"]", "input#price", "input[placeholder*=\"price\"]"],
        "type": "input"
      },
      "year": {
        "selector": ["input[name=\"auto_year\"]", "input#auto_year", "select[name=\"auto_year\"]"],
        "type": "input"
      },
      "make": {
        "selector": ["input[name=\"auto_make_model\"]", "input#auto_make_model"],
        "type": "input",
        "composite": ["make", "model"]
      },
      "mileage": {
        "selector": ["input[name=\"auto_miles\"]", "input#auto_miles"],
        "type": "input"
      },
      "condition": {
        "selector": ["select[name=\"condition\"]", "select#condition"],
        "type": "select",
        "valueMap": {
          "new": "new",
          "used": "good",
          "cpo": "like new",
          "certified": "like new",
          "excellent": "excellent",
          "good": "good",
          "fair": "fair",
          "salvage": "salvage"
        },
        "default": "good"
      },
      "fuelType": {
        "selector": ["select[name=\"auto_fuel_type\"]", "select#auto_fuel_type"],
        "type": "select",
        "valueMap": {
          "gas": "gas",
          "unleaded": "gas",
          "diesel": "diesel",
          "hybrid": "hybrid",
          "electric": "electric",
          "ev": "electric"
        }
      },
      "transmission": {
        "selector": ["select[name=\"auto_transmission\"]", "select#auto_transmission"],
        "type": "select",
        "valueMap": {
          "auto": "automatic",
          "automatic": "automatic",
          "at": "automatic",
          "manual": "manual",
          "mt": "manual"
        }
      },
      "drivetrain": {
        "selector": ["select[name=\"auto_drivetrain\"]", "select#auto_drivetrain"],
        "type": "select",
        "valueMap": {
          "awd": "4wd",
          "4wd": "4wd",
          "4x4": "4wd",
          "fwd": "fwd",
          "rwd": "rwd",
          "2wd": "rwd"
        }
      },
      "exteriorColor": {
        "selector": ["select[name=\"auto_paint\"]", "select#auto_paint"],
        "type": "select"
      },
      "bodyStyle": {
        "selector": ["select[name=\"auto_body_type\"]", "select#auto_body_type"],
        "type": "select",
        "valueMap": {
          "suv": "SUV",
          "crossover": "SUV",
          "cuv": "SUV",
          "truck": "pickup",
          "pickup": "pickup",
          "pickup truck": "pickup",
          "sedan": "sedan",
          "coupe": "coupe",
          "convertible": "convertible",
          "minivan": "mini-van",
          "van": "van",
          "wagon": "wagon",
          "hatchback": "hatchback"
        }
      },
      "description": {
        "selector": ["textarea[name=\"PostingBody\"]", "textarea#PostingBody", "textarea"],
        "type": "description"
      }
    }
  },

  offerup: {
    "id": "offerup",
    "name": "OfferUp",
    "version": "1.0.0",
    "match": ["*://offerup.com/post*", "*://www.offerup.com/post*"],
    "strategy": "react_controlled",
    "timing": {
      "afterField": 400,
      "afterDropdown": 300,
      "afterDescription": 200,
      "afterPhotos": 0,
      "settle": 1200
    },
    "fields": {
      "price": {
        "selector": ["input[name=\"price\"]", "input[data-testid=\"price\"]", "input[placeholder*=\"Price\"]", "input[aria-label*=\"Price\"]"],
        "type": "input"
      },
      "title": {
        "selector": ["input[name=\"title\"]", "input[data-testid=\"title\"]", "input[placeholder*=\"Title\"]", "input[aria-label*=\"Title\"]"],
        "type": "input"
      },
      "year": {
        "selector": ["input[name=\"year\"]", "select[name=\"year\"]", "input[aria-label*=\"Year\"]"],
        "type": "input"
      },
      "make": {
        "selector": ["input[name=\"make\"]", "select[name=\"make\"]", "input[aria-label*=\"Make\"]"],
        "type": "input"
      },
      "model": {
        "selector": ["input[name=\"model\"]", "select[name=\"model\"]", "input[aria-label*=\"Model\"]"],
        "type": "input"
      },
      "mileage": {
        "selector": ["input[name=\"mileage\"]", "input[name=\"miles\"]", "input[aria-label*=\"Mileage\"]", "input[placeholder*=\"Mileage\"]"],
        "type": "input"
      },
      "condition": {
        "selector": ["select[name=\"condition\"]", "button[aria-label*=\"Condition\"]", "[data-testid*=\"condition\"]"],
        "type": "dropdown",
        "valueMap": {
          "new": "New",
          "used": "Good",
          "cpo": "Like new",
          "certified": "Like new",
          "excellent": "Like new",
          "good": "Good",
          "fair": "Fair"
        },
        "default": "Good"
      },
      "transmission": {
        "selector": ["select[name=\"transmission\"]", "button[aria-label*=\"Transmission\"]", "[data-testid*=\"transmission\"]"],
        "type": "dropdown",
        "valueMap": {
          "auto": "Automatic",
          "automatic": "Automatic",
          "at": "Automatic",
          "manual": "Manual",
          "mt": "Manual",
          "cvt": "CVT"
        }
      },
      "drivetrain": {
        "selector": ["select[name=\"drivetrain\"]", "button[aria-label*=\"Drivetrain\"]", "[data-testid*=\"drivetrain\"]"],
        "type": "dropdown",
        "valueMap": {
          "awd": "AWD",
          "4wd": "4WD",
          "4x4": "4WD",
          "fwd": "FWD",
          "rwd": "RWD",
          "2wd": "RWD"
        }
      },
      "fuelType": {
        "selector": ["select[name=\"fuelType\"]", "button[aria-label*=\"Fuel\"]", "[data-testid*=\"fuel\"]"],
        "type": "dropdown",
        "valueMap": {
          "gas": "Gasoline",
          "unleaded": "Gasoline",
          "diesel": "Diesel",
          "hybrid": "Hybrid",
          "electric": "Electric",
          "ev": "Electric"
        }
      },
      "description": {
        "selector": ["textarea[name=\"description\"]", "textarea[aria-label*=\"Description\"]", "textarea"],
        "type": "description"
      }
    }
  }
};

function log(...args) {
  console.log("[Autimik]", ...args);
}

function findAdapter(url) {
  for (var id in ADAPTERS) {
    var adapter = ADAPTERS[id];
    for (var i = 0; i < adapter.match.length; i++) {
      var pattern = adapter.match[i]
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      if (new RegExp("^" + pattern + "$").test(url)) {
        log("Matched adapter:", adapter.name);
        return adapter;
      }
    }
  }
  log("No adapter matched for:", url);
  return null;
}

function resolveVehicleValue(vehicle, fieldName, adapterField) {
  if (adapterField && adapterField.composite) {
    return adapterField.composite.map(function (f) { return vehicle[f] || ""; }).filter(Boolean).join(" ");
  }
  var value = vehicle[fieldName];
  if (!value && fieldName === "condition") {
    value = adapterField && adapterField.default ? adapterField.default : "used";
  }
  if (!value && fieldName === "title") {
    value = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  }
  return value || "";
}

function buildSummary(results) {
  var filled = 0;
  var failed = 0;
  var skipped = 0;
  var failedFields = [];
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === "filled") filled++;
    else if (results[i].status === "failed") {
      failed++;
      failedFields.push(results[i].field);
    }
    else if (results[i].status === "skipped") skipped++;
  }
  return {
    total: results.length,
    filled: filled,
    failed: failed,
    skipped: skipped,
    failedFields: failedFields,
    results: results
  };
}

var REQUIRED_FIELDS = ["price", "year", "make", "model"];

var DEFAULT_REQUIRED_ORDER = ["price", "year", "make", "model", "mileage"];
var DEFAULT_OPTIONAL_ORDER = ["vin", "title", "condition", "fuelType", "transmission",
                              "drivetrain", "exteriorColor", "interiorColor", "bodyStyle", "description"];

async function fillFieldGroup(vehicle, adapter, fieldNames, timeoutOverride) {
  var results = [];
  var timing = adapter.timing || {};
  for (var i = 0; i < fieldNames.length; i++) {
    var fieldName = fieldNames[i];
    var fieldConfig = adapter.fields[fieldName];
    if (!fieldConfig) continue;

    var value = resolveVehicleValue(vehicle, fieldName, fieldConfig);
    if (fieldName === "description" && !value) {
      value = vehicle.description || FillEngine.buildDescription(vehicle);
    }

    var fillTimeout = timeoutOverride;
    if (!fillTimeout) {
      fillTimeout = (fieldConfig.type === "dropdown" || fieldConfig.type === "select" || fieldConfig.type === "description") ? 4000 : 8000;
    }

    var result = await FillEngine.fillField(fieldConfig, value, {
      label: fieldName,
      strategy: adapter.strategy,
      afterDelay: fieldConfig.type === "dropdown" ? timing.afterDropdown : timing.afterField,
      timeout: fillTimeout
    });
    results.push(result);

    var delay = fieldConfig.type === "dropdown" || fieldConfig.type === "select"
      ? (timing.afterDropdown || 300)
      : (timing.afterField || 500);
    await FillEngine.sleep(delay);
  }
  return results;
}

async function fillWithAdapter(vehicle, adapter) {
  log("Filling with adapter:", adapter.name);
  var timing = adapter.timing || {};
  var results = [];

  var requiredOrder = adapter.requiredFields || DEFAULT_REQUIRED_ORDER;
  var optionalOrder = adapter.optionalFields || DEFAULT_OPTIONAL_ORDER;

  log("Phase 1: Filling required fields:", requiredOrder.join(", "));
  var requiredResults = await fillFieldGroup(vehicle, adapter, requiredOrder, 8000);
  results.push.apply(results, requiredResults);

  var phaseSettle = timing.phaseSettle || 1000;
  log("Waiting", phaseSettle, "ms for form to settle before optional fields...");
  await FillEngine.sleep(phaseSettle);

  log("Phase 2: Filling optional fields:", optionalOrder.join(", "));
  var optionalResults = await fillFieldGroup(vehicle, adapter, optionalOrder, 4000);
  results.push.apply(results, optionalResults);

  var imageUrls = FillEngine.collectImageUrls(vehicle);
  if (imageUrls.length > 0) {
    var photoResult = await FillEngine.uploadPhotos(imageUrls, adapter.photos);
    results.push(photoResult);
    if (timing.afterPhotos) await FillEngine.sleep(timing.afterPhotos);
  }

  log("Form fill complete. Settling...");
  await FillEngine.sleep(timing.settle || 1500);

  return buildSummary(results);
}

async function fillWithAI(vehicle) {
  log("No adapter found, attempting AI-powered form detection...");

  var cachedMapping = await MappingCache.get(window.location.href);
  var mapping;

  if (cachedMapping) {
    log("Using cached AI mapping");
    mapping = cachedMapping;
  } else {
    var snapshot = FormScanner.scanPage();
    if (snapshot.elements.length === 0) {
      throw new Error("No fillable form elements found on this page");
    }
    mapping = await AIMapper.generateMapping(snapshot, vehicle);
    await MappingCache.set(window.location.href, mapping);
  }

  var results = [];
  for (var i = 0; i < mapping.length; i++) {
    var map = mapping[i];
    var value = vehicle[map.vehicleField];
    if (map.vehicleField === "description" && !value) {
      value = FillEngine.buildDescription(vehicle);
    }
    if (!value) {
      results.push({ field: map.vehicleField, status: "skipped" });
      continue;
    }

    var fieldConfig = {
      selector: [map.selector],
      type: map.type || "input",
      valueMap: map.valueMap
    };
    var result = await FillEngine.fillField(fieldConfig, value, { label: map.vehicleField });
    results.push(result);
    await FillEngine.sleep(400);
  }

  var imageUrls = FillEngine.collectImageUrls(vehicle);
  if (imageUrls.length > 0) {
    var photoResult = await FillEngine.uploadPhotos(imageUrls);
    results.push(photoResult);
  }

  log("AI form fill complete. Settling...");
  await FillEngine.sleep(1200);

  return buildSummary(results);
}

async function fillForm(vehicle) {
  log("Starting form fill for:", vehicle.year, vehicle.make, vehicle.model);

  var adapter = findAdapter(window.location.href);
  var summary;

  if (adapter) {
    summary = await fillWithAdapter(vehicle, adapter);
  } else {
    summary = await fillWithAI(vehicle);
  }

  var requiredFailed = summary.failedFields.filter(function (f) {
    return REQUIRED_FIELDS.indexOf(f) !== -1;
  });
  if (requiredFailed.length > 0) {
    var msg = "Failed to fill required fields: " + requiredFailed.join(", ");
    log(msg);
    throw new Error(msg);
  }

  log("Done! Summary:", summary);
  return summary;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "PING") {
    sendResponse({ alive: true });
    return;
  }

  if (message.type === "FILL_FORM") {
    log("Received FILL_FORM message");
    fillForm(message.payload)
      .then(function (summary) {
        sendResponse({ success: true, summary: summary });
      })
      .catch(function (err) {
        log("Form fill error:", err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

log("Content script loaded on:", window.location.href);
