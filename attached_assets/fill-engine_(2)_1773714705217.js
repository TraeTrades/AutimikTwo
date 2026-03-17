var FillEngine = (function () {
  var MAX_PHOTOS = 20;
  var BATCH_SIZE = 5;

  function log(...args) {
    console.log("[Autimik:FillEngine]", ...args);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function normalizeForVerify(s) {
    return String(s).replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
  }

  function waitFor(selectors, timeout) {
    var selectorList = Array.isArray(selectors) ? selectors : [selectors];
    // If any fb-label selectors are present, use resolveElement
    var hasFbLabel = selectorList.some(function (s) { return s.startsWith("fb-label:"); });
    if (hasFbLabel) return resolveElement(selectorList, timeout || 8000);

    timeout = timeout || 8000;
    return new Promise(function (resolve, reject) {
      for (var i = 0; i < selectorList.length; i++) {
        var el = document.querySelector(selectorList[i]);
        if (el) {
          log("Found element immediately:", selectorList[i]);
          return resolve(el);
        }
      }

      var observer = new MutationObserver(function () {
        for (var j = 0; j < selectorList.length; j++) {
          var el = document.querySelector(selectorList[j]);
          if (el) {
            log("Found element via observer:", selectorList[j]);
            observer.disconnect();
            clearTimeout(timer);
            resolve(el);
            return;
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      var timer = setTimeout(function () {
        observer.disconnect();
        reject(new Error("Timeout waiting for: " + selectorList.join(" | ")));
      }, timeout);
    });
  }

  function setNativeValue(element, value) {
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    );
    var nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    );
    var setter =
      element.tagName === "TEXTAREA"
        ? nativeTextareaValueSetter && nativeTextareaValueSetter.set
        : nativeInputValueSetter && nativeInputValueSetter.set;

    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Facebook no longer uses aria-label on form fields.
  // Instead each field has a <span id="_r_xx_">Label Text</span> and the
  // interactive element (label[role="combobox"] or input) carries
  // aria-labelledby="_r_xx_".  This helper finds the element that way.
  function findByLabelText(labelText) {
    var spans = document.querySelectorAll("span[id]");
    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      if (span.textContent.trim() === labelText) {
        var id = span.id;
        // Look for aria-labelledby match (dropdowns)
        var el = document.querySelector('[aria-labelledby="' + id + '"]');
        if (el) return el;
        // Look for input/textarea inside the same label container
        var container = span.closest("label");
        if (container) {
          var input = container.querySelector("input, textarea");
          if (input) return input;
        }
      }
    }
    return null;
  }

  // Selector variant that tries aria-label first, then falls back to label-text search.
  // Use "fb-label:Label Text" as a selector string to trigger the fallback.
  function resolveElement(selectorList, timeout) {
    timeout = timeout || 8000;
    return new Promise(function (resolve, reject) {
      // Separate fb-label directives from real CSS selectors
      var fbLabels = [];
      var cssSelectors = [];
      selectorList.forEach(function (s) {
        if (s.startsWith("fb-label:")) {
          fbLabels.push(s.slice("fb-label:".length));
        } else {
          cssSelectors.push(s);
        }
      });

      function tryFind() {
        // Try CSS selectors first
        for (var i = 0; i < cssSelectors.length; i++) {
          var el = document.querySelector(cssSelectors[i]);
          if (el) return el;
        }
        // Try fb-label text search
        for (var j = 0; j < fbLabels.length; j++) {
          var el2 = findByLabelText(fbLabels[j]);
          if (el2) return el2;
        }
        return null;
      }

      var found = tryFind();
      if (found) {
        log("Found element immediately:", selectorList[0]);
        return resolve(found);
      }

      var observer = new MutationObserver(function () {
        var el = tryFind();
        if (el) {
          log("Found element via observer");
          observer.disconnect();
          clearTimeout(timer);
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      var timer = setTimeout(function () {
        observer.disconnect();
        reject(new Error("Timeout waiting for: " + selectorList.join(" | ")));
      }, timeout);
    });
  }

  function resolveValueMap(value, valueMap) {
    if (!value || !valueMap) return value;
    var key = String(value).toLowerCase().trim();
    // Exact match first
    if (valueMap[key]) return valueMap[key];
    // Partial match — check if any valueMap key appears inside the value
    // This handles long DMS strings like "Automatic 8-Spd Sport w/Steptronic..."
    var keys = Object.keys(valueMap);
    for (var i = 0; i < keys.length; i++) {
      if (key.includes(keys[i])) return valueMap[keys[i]];
    }
    return value;
  }

  async function typeCharByChar(element, text) {
    var str = String(text);
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      element.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keypress", { key: ch, bubbles: true }));

      var nativeSetter = Object.getOwnPropertyDescriptor(
        element.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        "value"
      );
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(element, str.substring(0, i + 1));
      } else {
        element.value = str.substring(0, i + 1);
      }

      element.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
      element.dispatchEvent(new KeyboardEvent("keyup", { key: ch, bubbles: true }));

      if (i < str.length - 1) {
        await sleep(15);
      }
    }
  }

  async function fillInputReact(selectors, value, options) {
    options = options || {};
    var label = options.label || "field";
    var timeout = options.timeout || 8000;
    if (!value) return { field: label, status: "skipped" };

    for (var attempt = 1; attempt <= 3; attempt++) {
      try {
        var el = await waitFor(selectors, timeout);
        el.scrollIntoView({ block: "center", behavior: "instant" });
        await sleep(100);

        el.focus();
        el.click();
        await sleep(80);

        el.dispatchEvent(new KeyboardEvent("keydown", { key: "a", code: "KeyA", ctrlKey: true, bubbles: true }));
        document.execCommand("selectAll", false, null);
        await sleep(30);

        await typeCharByChar(el, String(value));
        await sleep(150);
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.blur();
        await sleep(200);

        var actual = el.value || "";
        var expectedNorm = normalizeForVerify(String(value)).substring(0, 6);
        if (expectedNorm.length > 0 && normalizeForVerify(actual).includes(expectedNorm)) {
          log("Filled (react)", label, "with:", value);
          return { field: label, status: "filled", value: value };
        }

        setNativeValue(el, String(value));
        await sleep(200);
        el.blur();
        await sleep(100);

        var recheck = el.value || "";
        if (normalizeForVerify(recheck).includes(expectedNorm)) {
          log("Filled (react fallback)", label, "with:", value);
          return { field: label, status: "filled", value: value };
        }

        log("Verify failed for", label, "expected:", value, "got:", recheck);
      } catch (e) {
        if (attempt === 3) return { field: label, status: "failed", error: e.message };
        await sleep(500);
      }
    }
    return { field: label, status: "failed", error: "Exhausted retries" };
  }

  async function fillInputField(selectors, value, options) {
    options = options || {};
    var label = options.label || "field";
    var timeout = options.timeout || 8000;
    if (!value) return { field: label, status: "skipped" };

    for (var attempt = 1; attempt <= 3; attempt++) {
      try {
        var el = await waitFor(selectors, timeout);
        el.scrollIntoView({ block: "center", behavior: "instant" });
        el.focus();
        await sleep(100);
        setNativeValue(el, String(value));
        await sleep(150);

        var actual = el.value || "";
        var expectedNorm = normalizeForVerify(String(value)).substring(0, 8);
        if (normalizeForVerify(actual).includes(expectedNorm)) {
          log("Filled", label, "with:", value);
          return { field: label, status: "filled", value: value };
        }

        el.click();
        await sleep(200);
        setNativeValue(el, String(value));
        el.blur();
        await sleep(200);

        var recheck = el.value || "";
        if (normalizeForVerify(recheck).includes(expectedNorm)) {
          log("Filled", label, "(retry) with:", value);
          return { field: label, status: "filled", value: value };
        }
      } catch (e) {
        if (attempt === 3) return { field: label, status: "failed", error: e.message };
        await sleep(500);
      }
    }
    return { field: label, status: "failed", error: "Exhausted retries" };
  }

  async function fillDropdownField(selectors, value, options) {
    options = options || {};
    var label = options.label || "dropdown";
    var valueMap = options.valueMap;
    var timeout = options.timeout || 4000;
    if (!value) {
      log("Skipping empty dropdown:", label);
      return { field: label, status: "skipped" };
    }
    try {
      var resolvedValue = resolveValueMap(value, valueMap);
      var trigger = await waitFor(selectors, timeout);
      log("Opening dropdown:", label);
      trigger.click();
      await waitFor('[role="option"]', 2500).catch(function () {});

      var normalizedValue = String(resolvedValue).toLowerCase().trim();
      var optionSelectors = document.querySelectorAll('[role="option"], [role="listbox"] [role="option"]');
      var matched = false;
      for (var i = 0; i < optionSelectors.length; i++) {
        var opt = optionSelectors[i];
        var text = (opt.textContent || "").toLowerCase().trim();
        if (text === normalizedValue || text.includes(normalizedValue)) {
          log("Selecting option:", opt.textContent);
          opt.click();
          matched = true;
          break;
        }
      }
      if (!matched) {
        var allOptions = document.querySelectorAll('[role="option"]');
        for (var j = 0; j < allOptions.length; j++) {
          var opt2 = allOptions[j];
          var text2 = (opt2.textContent || "").toLowerCase().trim();
          if (text2 === normalizedValue || text2.includes(normalizedValue)) {
            log("Selecting option (broad search):", opt2.textContent);
            opt2.click();
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        log("No matching option found for", label, ":", value);
        document.body.click();
        return { field: label, status: "failed", error: "No matching option" };
      }
      await sleep(options.afterDelay || 300);
      return { field: label, status: "filled", value: resolvedValue };
    } catch (e) {
      log("Could not select dropdown", label, ":", e.message);
      return { field: label, status: "failed", error: e.message };
    }
  }

  async function fillSelectField(selectors, value, options) {
    options = options || {};
    var label = options.label || "select";
    var valueMap = options.valueMap;
    var timeout = options.timeout || 4000;
    if (!value) {
      log("Skipping empty select:", label);
      return { field: label, status: "skipped" };
    }
    try {
      var resolvedValue = resolveValueMap(value, valueMap);
      var selectEl = await waitFor(selectors, timeout);
      if (selectEl.tagName !== "SELECT") {
        return await fillDropdownField(selectors, value, options);
      }
      log("Filling select:", label, "with:", resolvedValue);
      var normalizedValue = String(resolvedValue).toLowerCase().trim();
      var optionEls = selectEl.querySelectorAll("option");
      var bestMatch = null;
      for (var i = 0; i < optionEls.length; i++) {
        var optText = (optionEls[i].textContent || "").toLowerCase().trim();
        var optVal = (optionEls[i].value || "").toLowerCase().trim();
        if (optText === normalizedValue || optVal === normalizedValue) {
          bestMatch = optionEls[i];
          break;
        }
        if (!bestMatch && (optText.includes(normalizedValue) || optVal.includes(normalizedValue))) {
          bestMatch = optionEls[i];
        }
      }
      if (bestMatch) {
        selectEl.value = bestMatch.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        selectEl.dispatchEvent(new Event("input", { bubbles: true }));
        log("Selected:", bestMatch.textContent);
        return { field: label, status: "filled", value: bestMatch.value };
      }
      log("No matching option for select", label, ":", value);
      return { field: label, status: "failed", error: "No matching option" };
    } catch (e) {
      log("Could not fill select", label, ":", e.message);
      return { field: label, status: "failed", error: e.message };
    }
  }

  async function fillDescriptionField(selectors, text, options) {
    options = options || {};
    var label = options.label || "description";
    var timeout = options.timeout || 4000;
    if (!text) return { field: label, status: "skipped" };

    // Truncate at first page break (\f / form feed)
    var pageBreak = text.indexOf("\f");
    if (pageBreak !== -1) {
      text = text.substring(0, pageBreak).trimEnd();
      log("Description truncated at page break");
    }
    // Respect character limit
    if (options.maxLength && text.length > options.maxLength) {
      text = text.substring(0, options.maxLength);
      log("Description truncated to", options.maxLength, "chars");
    }
    if (!text) return { field: label, status: "skipped" };

    try {
      var el = await waitFor(selectors, timeout);
      log("Filling description");
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        el.focus();
        el.click();
        await sleep(80);
        setNativeValue(el, text);
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.blur();
      } else {
        el.focus();
        el.textContent = "";
        document.execCommand("insertText", false, text);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      log("Description filled");
      return { field: label, status: "filled", value: "(description)" };
    } catch (e) {
      log("Could not fill description:", e.message);
      return { field: label, status: "failed", error: e.message };
    }
  }

  function fetchImageViaBackground(url) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        { type: "FETCH_IMAGE", payload: { url: url } },
        function (response) {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!response || !response.success) {
            return reject(new Error((response && response.error) || "Unknown fetch error"));
          }
          resolve(response);
        }
      );
    });
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(",");
    var mime = parts[0].match(/:(.*?);/)[1];
    var raw = atob(parts[1]);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function fetchBatch(urls) {
    var results = await Promise.allSettled(
      urls.map(function (url) {
        return fetchImageViaBackground(url).then(function (result) {
          var blob = dataUrlToBlob(result.dataUrl);
          var fileName = url.split("/").pop().split("?")[0] || "vehicle.jpg";
          return new File([blob], fileName, { type: result.mimeType || blob.type || "image/jpeg" });
        });
      })
    );
    var files = [];
    for (var i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        files.push(results[i].value);
      } else {
        log("Failed to fetch image:", urls[i], results[i].reason && results[i].reason.message);
      }
    }
    return files;
  }

  async function uploadPhotos(imageUrls, photoConfig) {
    if (!imageUrls || imageUrls.length === 0) {
      log("No images to upload");
      return { field: "photos", status: "skipped" };
    }
    if (photoConfig && photoConfig.enabled === false) {
      log("Photo upload disabled for this adapter");
      return { field: "photos", status: "skipped" };
    }

    var capped = imageUrls.slice(0, MAX_PHOTOS);
    if (imageUrls.length > MAX_PHOTOS) {
      log("Capping images from", imageUrls.length, "to", MAX_PHOTOS);
    }

    try {
      var selector = (photoConfig && photoConfig.selector) || 'input[type="file"][accept*="image"]';
      var fileInput = await waitFor([selector], 8000);
      log("Found file input, fetching", capped.length, "images in batches of", BATCH_SIZE);

      var allFiles = [];
      for (var b = 0; b < capped.length; b += BATCH_SIZE) {
        var batch = capped.slice(b, b + BATCH_SIZE);
        log("Fetching batch", Math.floor(b / BATCH_SIZE) + 1, "of", Math.ceil(capped.length / BATCH_SIZE));
        var batchFiles = await fetchBatch(batch);
        allFiles.push.apply(allFiles, batchFiles);
      }

      if (allFiles.length > 0) {
        var dt = new DataTransfer();
        allFiles.forEach(function (f) { dt.items.add(f); });
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        log("Uploaded", allFiles.length, "photos");
        return { field: "photos", status: "filled", value: allFiles.length + " photos" };
      }
      return { field: "photos", status: "failed", error: "No images fetched successfully" };
    } catch (e) {
      log("Could not upload photos:", e.message);
      return { field: "photos", status: "failed", error: e.message };
    }
  }

  function buildDescription(vehicle) {
    var lines = [];
    if (vehicle.year && vehicle.make && vehicle.model) {
      lines.push(vehicle.year + " " + vehicle.make + " " + vehicle.model);
    }
    if (vehicle.trim) lines.push("Trim: " + vehicle.trim);
    if (vehicle.mileage) lines.push("Mileage: " + vehicle.mileage + " miles");
    if (vehicle.transmission) lines.push("Transmission: " + vehicle.transmission);
    if (vehicle.drivetrain) lines.push("Drivetrain: " + vehicle.drivetrain);
    if (vehicle.fuelType) lines.push("Fuel Type: " + vehicle.fuelType);
    if (vehicle.exteriorColor) lines.push("Exterior Color: " + vehicle.exteriorColor);
    if (vehicle.interiorColor) lines.push("Interior Color: " + vehicle.interiorColor);
    if (vehicle.vin) lines.push("VIN: " + vehicle.vin);
    if (vehicle.stockNumber) lines.push("Stock #: " + vehicle.stockNumber);
    lines.push("");
    lines.push("Contact us for more details and to schedule a test drive!");
    return lines.join("\n");
  }

  function extractUrls(str) {
    if (!str || typeof str !== "string") return [];
    var matches = str.match(/https?:\/\/[^\s,;|"'\[\]<>]+/g);
    return matches ? matches.map(function (u) { return u.replace(/[)}\]]+$/, ""); }) : [];
  }

  function collectImageUrls(vehicle) {
    var urls = [];
    if (vehicle.imageUrls && Array.isArray(vehicle.imageUrls) && vehicle.imageUrls.length > 0) {
      for (var i = 0; i < vehicle.imageUrls.length; i++) {
        var extracted = extractUrls(String(vehicle.imageUrls[i]));
        urls.push.apply(urls, extracted);
      }
    } else if (typeof vehicle.imageUrl === "string" && vehicle.imageUrl.trim().length > 0) {
      var parsed = extractUrls(vehicle.imageUrl);
      urls.push.apply(urls, parsed);
    }
    var unique = [];
    var seen = {};
    for (var j = 0; j < urls.length; j++) {
      if (!seen[urls[j]]) {
        seen[urls[j]] = true;
        unique.push(urls[j]);
      }
    }
    return unique.slice(0, MAX_PHOTOS);
  }

  // Typeahead: type the value into an input to filter options, then click the match.
  // Used for FB's Make field which is a long searchable list, not a static combobox.
  async function fillTypeaheadField(selectors, value, options) {
    options = options || {};
    var label = options.label || "typeahead";
    if (!value) return { field: label, status: "skipped" };

    for (var attempt = 1; attempt <= 3; attempt++) {
      try {
        var el = await waitFor(selectors, options.timeout || 8000);
        el.scrollIntoView({ block: "center", behavior: "instant" });
        el.focus();
        el.click();
        await sleep(150);

        // Clear any existing value then type the search term
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "a", code: "KeyA", ctrlKey: true, bubbles: true }));
        document.execCommand("selectAll", false, null);
        await sleep(30);
        await typeCharByChar(el, String(value));
        await sleep(600); // wait for FB to filter the list

        // Now find the matching option
        var normalizedValue = String(value).toLowerCase().trim();
        var opts = document.querySelectorAll('[role="option"]');
        var matched = false;
        for (var i = 0; i < opts.length; i++) {
          var text = (opts[i].textContent || "").toLowerCase().trim();
          if (text === normalizedValue || text.startsWith(normalizedValue)) {
            log("Selecting typeahead option:", opts[i].textContent);
            opts[i].click();
            matched = true;
            break;
          }
        }
        if (matched) {
          await sleep(300);
          return { field: label, status: "filled", value: value };
        }
        if (attempt === 3) {
          log("No typeahead option found for", label, ":", value);
          return { field: label, status: "failed", error: "No matching option" };
        }
        await sleep(400);
      } catch (e) {
        if (attempt === 3) return { field: label, status: "failed", error: e.message };
        await sleep(500);
      }
    }
    return { field: label, status: "failed", error: "Exhausted retries" };
  }

  async function fillInputFieldStandard(selectors, value, options) {
    options = options || {};
    var label = options.label || "field";
    var timeout = options.timeout || 8000;
    if (!value) return { field: label, status: "skipped" };

    try {
      var el = await waitFor(selectors, timeout);
      el.scrollIntoView({ block: "center", behavior: "instant" });
      el.focus();
      await sleep(100);
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(150);
      log("Filled (standard)", label, "with:", value);
      return { field: label, status: "filled", value: value };
    } catch (e) {
      return { field: label, status: "failed", error: e.message };
    }
  }

  async function fillField(fieldConfig, value, options) {
    options = options || {};
    var selectors = fieldConfig.selector || fieldConfig.selectors;
    if (!Array.isArray(selectors)) selectors = [selectors];
    var strategy = options.strategy || "react_controlled";
    var fieldOptions = {
      label: options.label || fieldConfig.label || "field",
      valueMap: fieldConfig.valueMap,
      afterDelay: options.afterDelay,
      timeout: options.timeout,
      maxLength: fieldConfig.maxLength
    };

    switch (fieldConfig.type) {
      case "typeahead":
        return await fillTypeaheadField(selectors, value, fieldOptions);
      case "input":
        if (strategy === "react_controlled") {
          return await fillInputReact(selectors, value, fieldOptions);
        }
        if (strategy === "standard_html") {
          return await fillInputFieldStandard(selectors, value, fieldOptions);
        }
        return await fillInputField(selectors, value, fieldOptions);
      case "dropdown":
        return await fillDropdownField(selectors, value, fieldOptions);
      case "select":
        return await fillSelectField(selectors, value, fieldOptions);
      case "description":
        return await fillDescriptionField(selectors, value, fieldOptions);
      default:
        if (strategy === "react_controlled") {
          return await fillInputReact(selectors, value, fieldOptions);
        }
        if (strategy === "standard_html") {
          return await fillInputFieldStandard(selectors, value, fieldOptions);
        }
        return await fillInputField(selectors, value, fieldOptions);
    }
  }

  return {
    log: log,
    sleep: sleep,
    normalizeForVerify: normalizeForVerify,
    waitFor: waitFor,
    findByLabelText: findByLabelText,
    resolveElement: resolveElement,
    setNativeValue: setNativeValue,
    resolveValueMap: resolveValueMap,
    fillInputField: fillInputField,
    fillInputReact: fillInputReact,
    fillTypeaheadField: fillTypeaheadField,
    fillDropdownField: fillDropdownField,
    fillSelectField: fillSelectField,
    fillDescriptionField: fillDescriptionField,
    fetchImageViaBackground: fetchImageViaBackground,
    dataUrlToBlob: dataUrlToBlob,
    uploadPhotos: uploadPhotos,
    buildDescription: buildDescription,
    collectImageUrls: collectImageUrls,
    fillField: fillField
  };
})();
