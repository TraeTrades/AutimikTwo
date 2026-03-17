/* Autimik Training Mode — Visual Point-and-Click Adapter Builder
 * Injected into the listing page when user clicks "Train" in the popup.
 */

(function () {
  if (window.__autimikTrainerLoaded) return;
  window.__autimikTrainerLoaded = true;

  var TRAIN_REQUIRED = ["year", "make", "model", "mileage", "price"];
  var TRAIN_OPTIONAL = ["description", "bodyStyle", "exteriorColor", "interiorColor",
    "condition", "fuelType", "transmission", "drivetrain", "vin", "title"];

  var FIELD_LABELS = {
    year: "Year", make: "Make", model: "Model", mileage: "Mileage", price: "Price",
    description: "Description", bodyStyle: "Body Style", exteriorColor: "Exterior Color",
    interiorColor: "Interior Color", condition: "Condition", fuelType: "Fuel Type",
    transmission: "Transmission", drivetrain: "Drivetrain", vin: "VIN", title: "Title"
  };

  var TrainerState = {
    active: false,
    hostname: "",
    fieldQueue: [],
    currentField: null,
    mappedFields: {},
    skippedFields: [],
    panelEl: null,
    hoverHandler: null,
    clickHandler: null,
    lastHovered: null
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("autimik-trainer-styles")) return;
    var style = document.createElement("style");
    style.id = "autimik-trainer-styles";
    style.textContent = [
      ".autimik-hover-target {",
      "  outline: 2px solid #60a5fa !important;",
      "  outline-offset: 2px !important;",
      "  background-color: rgba(96,165,250,0.08) !important;",
      "  cursor: crosshair !important;",
      "}",
      ".autimik-selected-field {",
      "  outline: 2px solid #22c55e !important;",
      "  outline-offset: 2px !important;",
      "  background-color: rgba(34,197,94,0.08) !important;",
      "}",
      "#autimik-trainer-panel {",
      "  position: fixed;",
      "  top: 16px;",
      "  right: 16px;",
      "  width: 280px;",
      "  background: #0f172a;",
      "  border: 1px solid #334155;",
      "  border-radius: 10px;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
      "  font-size: 13px;",
      "  color: #e2e8f0;",
      "  z-index: 2147483647;",
      "  box-shadow: 0 8px 32px rgba(0,0,0,0.5);",
      "  user-select: none;",
      "}",
      "#autimik-trainer-panel .atp-header {",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: space-between;",
      "  padding: 12px 14px;",
      "  border-bottom: 1px solid #1e293b;",
      "  background: #0a0f1e;",
      "  border-radius: 10px 10px 0 0;",
      "}",
      "#autimik-trainer-panel .atp-title {",
      "  font-size: 13px;",
      "  font-weight: 700;",
      "  color: #a78bfa;",
      "  letter-spacing: 0.3px;",
      "}",
      "#autimik-trainer-panel .atp-close {",
      "  background: transparent;",
      "  border: none;",
      "  color: #64748b;",
      "  cursor: pointer;",
      "  font-size: 16px;",
      "  line-height: 1;",
      "  padding: 0 2px;",
      "}",
      "#autimik-trainer-panel .atp-close:hover { color: #ef4444; }",
      "#autimik-trainer-panel .atp-body { padding: 12px 14px; }",
      "#autimik-trainer-panel .atp-prompt {",
      "  font-size: 13px;",
      "  color: #e2e8f0;",
      "  margin-bottom: 8px;",
      "  line-height: 1.5;",
      "}",
      "#autimik-trainer-panel .atp-field-name {",
      "  color: #a78bfa;",
      "  font-weight: 700;",
      "}",
      "#autimik-trainer-panel .atp-selector {",
      "  font-size: 10px;",
      "  color: #64748b;",
      "  font-family: monospace;",
      "  background: #1e293b;",
      "  padding: 4px 6px;",
      "  border-radius: 4px;",
      "  margin: 6px 0;",
      "  word-break: break-all;",
      "  max-height: 40px;",
      "  overflow: hidden;",
      "}",
      "#autimik-trainer-panel .atp-btn-row {",
      "  display: flex;",
      "  gap: 6px;",
      "  margin-top: 8px;",
      "}",
      "#autimik-trainer-panel .atp-btn {",
      "  flex: 1;",
      "  padding: 5px 0;",
      "  border-radius: 5px;",
      "  font-size: 12px;",
      "  font-weight: 600;",
      "  cursor: pointer;",
      "  border: none;",
      "}",
      "#autimik-trainer-panel .atp-btn-confirm {",
      "  background: #22c55e;",
      "  color: #fff;",
      "}",
      "#autimik-trainer-panel .atp-btn-confirm:hover { background: #16a34a; }",
      "#autimik-trainer-panel .atp-btn-repick {",
      "  background: transparent;",
      "  border: 1px solid #374151 !important;",
      "  color: #9ca3af;",
      "}",
      "#autimik-trainer-panel .atp-btn-repick:hover { border-color: #60a5fa !important; color: #60a5fa; }",
      "#autimik-trainer-panel .atp-btn-skip {",
      "  background: transparent;",
      "  border: 1px solid #374151 !important;",
      "  color: #9ca3af;",
      "  font-size: 11px;",
      "}",
      "#autimik-trainer-panel .atp-btn-skip:hover { border-color: #fbbf24 !important; color: #fbbf24; }",
      "#autimik-trainer-panel .atp-field-list {",
      "  max-height: 160px;",
      "  overflow-y: auto;",
      "  margin-top: 10px;",
      "  border-top: 1px solid #1e293b;",
      "  padding-top: 8px;",
      "}",
      "#autimik-trainer-panel .atp-field-list::-webkit-scrollbar { width: 3px; }",
      "#autimik-trainer-panel .atp-field-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }",
      "#autimik-trainer-panel .atp-field-item {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 6px;",
      "  padding: 3px 0;",
      "  font-size: 11px;",
      "  color: #64748b;",
      "}",
      "#autimik-trainer-panel .atp-field-item.mapped { color: #22c55e; }",
      "#autimik-trainer-panel .atp-field-item.current { color: #a78bfa; font-weight: 600; }",
      "#autimik-trainer-panel .atp-field-item.skipped { color: #fbbf24; text-decoration: line-through; }",
      "#autimik-trainer-panel .atp-dot {",
      "  width: 6px; height: 6px;",
      "  border-radius: 50%;",
      "  background: currentColor;",
      "  flex-shrink: 0;",
      "}",
      "#autimik-trainer-panel .atp-save-row {",
      "  margin-top: 10px;",
      "  padding-top: 10px;",
      "  border-top: 1px solid #1e293b;",
      "}",
      "#autimik-trainer-panel .atp-btn-save {",
      "  width: 100%;",
      "  padding: 7px 0;",
      "  background: #a78bfa;",
      "  color: #fff;",
      "  border: none;",
      "  border-radius: 6px;",
      "  font-size: 12px;",
      "  font-weight: 700;",
      "  cursor: pointer;",
      "}",
      "#autimik-trainer-panel .atp-btn-save:hover { background: #8b5cf6; }",
      "#autimik-trainer-panel .atp-btn-save:disabled { background: #334155; color: #64748b; cursor: default; }",
      "#autimik-trainer-panel .atp-notice {",
      "  font-size: 11px;",
      "  color: #fbbf24;",
      "  margin-bottom: 8px;",
      "  padding: 4px 6px;",
      "  background: rgba(251,191,36,0.08);",
      "  border-radius: 4px;",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function removeStyles() {
    var s = document.getElementById("autimik-trainer-styles");
    if (s) s.parentNode.removeChild(s);
  }

  // ── Selector generation ──────────────────────────────────────────────────────

  function generateBestSelector(el) {
    // Priority: id → name → aria-label → data-testid → placeholder → positional
    if (el.id) {
      return "#" + CSS.escape(el.id);
    }
    var tag = el.tagName.toLowerCase();
    if (el.getAttribute("name")) {
      return tag + "[name=\"" + el.getAttribute("name") + "\"]";
    }
    if (el.getAttribute("aria-label")) {
      return tag + "[aria-label=\"" + el.getAttribute("aria-label") + "\"]";
    }
    if (el.getAttribute("data-testid")) {
      return tag + "[data-testid=\"" + el.getAttribute("data-testid") + "\"]";
    }
    if (el.getAttribute("placeholder")) {
      return tag + "[placeholder=\"" + el.getAttribute("placeholder") + "\"]";
    }
    // Positional fallback
    var role = el.getAttribute("role");
    if (role) {
      return tag + "[role=\"" + role + "\"]";
    }
    // nth-child positional
    var parent = el.parentElement;
    if (parent) {
      var siblings = Array.prototype.slice.call(parent.children);
      var idx = siblings.indexOf(el) + 1;
      var parentSel = parent.id ? "#" + CSS.escape(parent.id) : parent.tagName.toLowerCase();
      return parentSel + " > " + tag + ":nth-child(" + idx + ")";
    }
    return tag;
  }

  function detectFieldType(el) {
    var tag = el.tagName.toLowerCase();
    var role = (el.getAttribute("role") || "").toLowerCase();
    if (tag === "select") return "select";
    if (role === "combobox" || role === "listbox") return "dropdown";
    if (tag === "div" && (role === "combobox" || el.getAttribute("aria-haspopup"))) return "dropdown";
    if (tag === "textarea") return "description";
    if (el.getAttribute("contenteditable") === "true") return "description";
    return "input";
  }

  function getSelectOptions(el) {
    if (el.tagName.toLowerCase() !== "select") return undefined;
    var opts = [];
    for (var i = 0; i < el.options.length; i++) {
      opts.push({ value: el.options[i].value, text: el.options[i].text.trim() });
    }
    return opts;
  }

  // ── Fillable element detection ───────────────────────────────────────────────

  function isFillable(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    var role = (el.getAttribute("role") || "").toLowerCase();
    if (role === "combobox" || role === "listbox" || role === "textbox") return true;
    if (el.getAttribute("contenteditable") === "true") return true;
    if (el.getAttribute("aria-haspopup")) return true;
    return false;
  }

  // ── Panel rendering ──────────────────────────────────────────────────────────

  function createPanel() {
    var panel = document.createElement("div");
    panel.id = "autimik-trainer-panel";
    document.body.appendChild(panel);
    TrainerState.panelEl = panel;
    return panel;
  }

  function renderPanel() {
    var panel = TrainerState.panelEl;
    if (!panel) return;

    var allFields = TRAIN_REQUIRED.concat(TRAIN_OPTIONAL);
    var mapped = Object.keys(TrainerState.mappedFields);
    var skipped = TrainerState.skippedFields;
    var currentField = TrainerState.currentField;
    var pendingQueue = TrainerState.fieldQueue;

    // Check for existing adapter notice
    var hasExisting = false; // Will be set dynamically

    var html = '<div class="atp-header">';
    html += '<span class="atp-title">&#127919; Autimik Training</span>';
    html += '<button class="atp-close" id="atp-close">&#10005;</button>';
    html += "</div>";
    html += '<div class="atp-body">';

    if (TrainerState.existingAdapter) {
      html += '<div class="atp-notice">Replacing existing adapter for this site.</div>';
    }

    if (currentField) {
      html += '<div class="atp-prompt">Click the <span class="atp-field-name">' +
        (FIELD_LABELS[currentField] || currentField).toUpperCase() + "</span> field on the page</div>";

      if (TrainerState.pendingSelection) {
        var sel = TrainerState.pendingSelection;
        html += '<div class="atp-prompt" style="color:#22c55e;">Mapped <b>' +
          (FIELD_LABELS[currentField] || currentField) + '</b></div>';
        html += '<div class="atp-selector">' + sel.selector + "</div>";
        html += '<div class="atp-btn-row">';
        html += '<button class="atp-btn atp-btn-confirm" id="atp-confirm">Confirm</button>';
        html += '<button class="atp-btn atp-btn-repick" id="atp-repick">Pick Different</button>';
        html += "</div>";
      } else {
        html += '<div class="atp-btn-row">';
        html += '<button class="atp-btn atp-btn-skip" id="atp-skip">Skip this field</button>';
        html += "</div>";
      }
    } else if (pendingQueue.length === 0) {
      html += '<div class="atp-prompt" style="color:#22c55e;">All fields mapped! Click Save to finish.</div>';
    }

    // Field list
    html += '<div class="atp-field-list">';
    allFields.forEach(function (f) {
      var isRequired = TRAIN_REQUIRED.indexOf(f) !== -1;
      var label = (FIELD_LABELS[f] || f) + (isRequired ? " *" : "");
      var cls = "atp-field-item";
      var indicator = "";
      if (TrainerState.mappedFields[f]) {
        cls += " mapped";
        indicator = "&#10003;";
      } else if (skipped.indexOf(f) !== -1) {
        cls += " skipped";
        indicator = "\u2014";
      } else if (f === currentField) {
        cls += " current";
        indicator = "&#9654;";
      } else {
        indicator = "\u00b7";
      }
      html += '<div class="' + cls + '"><span class="atp-dot"></span>' + indicator + " " + label + "</div>";
    });
    html += "</div>";

    // Save button
    html += '<div class="atp-save-row">';
    var canSave = mapped.length > 0;
    html += '<button class="atp-btn-save" id="atp-save"' + (canSave ? "" : " disabled") + ">Save Adapter</button>";
    html += "</div>";

    html += "</div>"; // atp-body

    panel.innerHTML = html;

    // Bind events
    var closeBtn = panel.querySelector("#atp-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { destroyTrainingUI(); });

    var confirmBtn = panel.querySelector("#atp-confirm");
    if (confirmBtn) confirmBtn.addEventListener("click", function () { confirmSelection(); });

    var repickBtn = panel.querySelector("#atp-repick");
    if (repickBtn) repickBtn.addEventListener("click", function () { repickSelection(); });

    var skipBtn = panel.querySelector("#atp-skip");
    if (skipBtn) skipBtn.addEventListener("click", function () { skipCurrentField(); });

    var saveBtn = panel.querySelector("#atp-save");
    if (saveBtn) saveBtn.addEventListener("click", function () { saveAndExit(); });
  }

  // ── Training flow ─────────────────────────────────────────────────────────────

  function startTraining() {
    if (TrainerState.active) return;
    TrainerState.active = true;
    TrainerState.hostname = window.location.hostname;
    TrainerState.fieldQueue = TRAIN_REQUIRED.concat(TRAIN_OPTIONAL).slice();
    TrainerState.currentField = null;
    TrainerState.mappedFields = {};
    TrainerState.skippedFields = [];
    TrainerState.pendingSelection = null;
    TrainerState.existingAdapter = false;

    // Check if there's an existing adapter
    chrome.storage.local.get("autimik_custom_adapters", function (result) {
      var adapters = result.autimik_custom_adapters || {};
      if (adapters[TrainerState.hostname]) {
        TrainerState.existingAdapter = true;
      }
      injectStyles();
      createPanel();
      attachHoverListener();
      attachClickListener();
      promptNextField();
    });
  }

  function promptNextField() {
    TrainerState.pendingSelection = null;
    if (TrainerState.fieldQueue.length === 0) {
      TrainerState.currentField = null;
      renderPanel();
      return;
    }
    TrainerState.currentField = TrainerState.fieldQueue.shift();
    renderPanel();
  }

  function skipCurrentField() {
    if (!TrainerState.currentField) return;
    TrainerState.skippedFields.push(TrainerState.currentField);
    promptNextField();
  }

  function repickSelection() {
    // Remove selection ring from last selected element
    var selected = document.querySelector(".autimik-selected-field");
    if (selected) selected.classList.remove("autimik-selected-field");
    TrainerState.pendingSelection = null;
    renderPanel();
  }

  function confirmSelection() {
    if (!TrainerState.pendingSelection || !TrainerState.currentField) return;
    var sel = TrainerState.pendingSelection;
    TrainerState.mappedFields[TrainerState.currentField] = {
      selector: [sel.selector],
      type: sel.type,
      options: sel.options
    };
    promptNextField();
  }

  // ── Hover highlighting ────────────────────────────────────────────────────────

  function attachHoverListener() {
    TrainerState.hoverHandler = function (e) {
      var el = e.target;
      // Skip our own panel
      if (TrainerState.panelEl && TrainerState.panelEl.contains(el)) return;

      // Remove from last hovered
      if (TrainerState.lastHovered && TrainerState.lastHovered !== el) {
        TrainerState.lastHovered.classList.remove("autimik-hover-target");
      }

      if (isFillable(el)) {
        el.classList.add("autimik-hover-target");
        TrainerState.lastHovered = el;
      } else {
        TrainerState.lastHovered = null;
      }
    };
    document.body.addEventListener("mouseover", TrainerState.hoverHandler, true);
  }

  function detachHoverListener() {
    if (TrainerState.hoverHandler) {
      document.body.removeEventListener("mouseover", TrainerState.hoverHandler, true);
      TrainerState.hoverHandler = null;
    }
    // Clean up hover classes
    var hovered = document.querySelectorAll(".autimik-hover-target");
    for (var i = 0; i < hovered.length; i++) {
      hovered[i].classList.remove("autimik-hover-target");
    }
  }

  // ── Click interception ────────────────────────────────────────────────────────

  function attachClickListener() {
    TrainerState.clickHandler = function (e) {
      var el = e.target;
      // Allow clicks inside our panel
      if (TrainerState.panelEl && TrainerState.panelEl.contains(el)) return;

      e.preventDefault();
      e.stopPropagation();

      if (!TrainerState.currentField) return;
      if (!isFillable(el)) return;

      // Remove previous selected ring
      var prev = document.querySelector(".autimik-selected-field");
      if (prev) prev.classList.remove("autimik-selected-field");

      el.classList.remove("autimik-hover-target");
      el.classList.add("autimik-selected-field");

      var selector = generateBestSelector(el);
      var type = detectFieldType(el);
      var options = getSelectOptions(el);

      TrainerState.pendingSelection = { selector: selector, type: type, options: options, el: el };
      renderPanel();
    };
    document.body.addEventListener("click", TrainerState.clickHandler, true);
  }

  function detachClickListener() {
    if (TrainerState.clickHandler) {
      document.body.removeEventListener("click", TrainerState.clickHandler, true);
      TrainerState.clickHandler = null;
    }
  }

  // ── Adapter assembly ──────────────────────────────────────────────────────────

  function buildAdapterFromMappings() {
    var hostname = TrainerState.hostname;
    var fields = {};
    var requiredFields = [];
    var optionalFields = [];

    TRAIN_REQUIRED.forEach(function (f) {
      if (TrainerState.mappedFields[f]) {
        var cfg = TrainerState.mappedFields[f];
        fields[f] = { selector: cfg.selector, type: cfg.type };
        if (cfg.options) fields[f].options = cfg.options;
        requiredFields.push(f);
      }
    });

    TRAIN_OPTIONAL.forEach(function (f) {
      if (TrainerState.mappedFields[f]) {
        var cfg = TrainerState.mappedFields[f];
        fields[f] = { selector: cfg.selector, type: cfg.type };
        if (cfg.options) fields[f].options = cfg.options;
        optionalFields.push(f);
      }
    });

    return {
      id: "custom_" + hostname.replace(/\./g, "_"),
      name: "Custom: " + hostname,
      version: "1.0.0",
      trainedAt: Date.now(),
      match: ["*://" + hostname + "/*"],
      strategy: "standard_html",
      timing: {
        afterField: 400,
        afterDropdown: 300,
        afterDescription: 200,
        settle: 1000
      },
      requiredFields: requiredFields,
      optionalFields: optionalFields,
      fields: fields
    };
  }

  // ── Save and cleanup ──────────────────────────────────────────────────────────

  function saveAndExit() {
    var adapter = buildAdapterFromMappings();
    var hostname = TrainerState.hostname;

    chrome.runtime.sendMessage(
      { type: "SAVE_ADAPTER", payload: { hostname: hostname, adapter: adapter } },
      function () {
        // Show confirmation
        var panel = TrainerState.panelEl;
        if (panel) {
          panel.querySelector(".atp-body").innerHTML =
            '<div style="padding:16px 0;text-align:center;">' +
            '<div style="font-size:22px;">&#10003;</div>' +
            '<div style="color:#22c55e;font-weight:700;margin-top:8px;">Adapter saved!</div>' +
            '<div style="color:#64748b;font-size:11px;margin-top:4px;">' + hostname + "</div>" +
            "</div>";
        }

        setTimeout(function () {
          destroyTrainingUI();
          try {
            chrome.runtime.sendMessage({ type: "TRAINING_COMPLETE", payload: { hostname: hostname } });
          } catch (e) { /* popup may be closed */ }
        }, 2000);
      }
    );
  }

  function destroyTrainingUI() {
    TrainerState.active = false;
    detachHoverListener();
    detachClickListener();

    // Remove panel
    if (TrainerState.panelEl) {
      TrainerState.panelEl.parentNode && TrainerState.panelEl.parentNode.removeChild(TrainerState.panelEl);
      TrainerState.panelEl = null;
    }

    // Remove CSS classes from page elements
    var selected = document.querySelectorAll(".autimik-selected-field");
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("autimik-selected-field");

    removeStyles();
    TrainerState.currentField = null;
    TrainerState.pendingSelection = null;
  }

  // ── Message listener ──────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === "START_TRAINING") startTraining();
    if (message.type === "STOP_TRAINING") destroyTrainingUI();
  });

})();
