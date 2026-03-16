var FormScanner = (function () {
  function log(...args) {
    console.log("[Autimik:FormScanner]", ...args);
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function getLabel(el) {
    if (el.id) {
      var labelEl = document.querySelector('label[for="' + el.id + '"]');
      if (labelEl) return labelEl.textContent.trim();
    }
    var parent = el.closest("label");
    if (parent) return parent.textContent.trim();
    var ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel;
    var ariaLabelledBy = el.getAttribute("aria-labelledby");
    if (ariaLabelledBy) {
      var labelledEl = document.getElementById(ariaLabelledBy);
      if (labelledEl) return labelledEl.textContent.trim();
    }
    var prev = el.previousElementSibling;
    if (prev && (prev.tagName === "LABEL" || prev.tagName === "SPAN" || prev.tagName === "DIV")) {
      var text = prev.textContent.trim();
      if (text.length < 60) return text;
    }
    return "";
  }

  function getSelectOptions(el) {
    if (el.tagName !== "SELECT") return [];
    var options = [];
    var optEls = el.querySelectorAll("option");
    for (var i = 0; i < optEls.length; i++) {
      options.push({
        value: optEls[i].value,
        text: optEls[i].textContent.trim()
      });
    }
    return options;
  }

  function buildSelector(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
    if (el.getAttribute("aria-label")) return el.tagName.toLowerCase() + '[aria-label="' + el.getAttribute("aria-label") + '"]';
    var parent = el.parentElement;
    if (parent) {
      var children = Array.from(parent.children).filter(function (c) { return c.tagName === el.tagName; });
      var idx = children.indexOf(el);
      if (idx >= 0) {
        var parentSel = parent.id ? "#" + CSS.escape(parent.id) : parent.tagName.toLowerCase();
        return parentSel + " > " + el.tagName.toLowerCase() + ":nth-of-type(" + (idx + 1) + ")";
      }
    }
    return el.tagName.toLowerCase();
  }

  function scanPage() {
    log("Scanning page for fillable form elements...");
    var elements = [];
    var inputTypes = ["text", "number", "tel", "email", "url", "search", ""];

    var inputs = document.querySelectorAll("input, textarea, select, div[contenteditable='true'], [role='textbox'], [role='combobox'], [role='listbox']");

    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (!isVisible(el)) continue;

      var tagName = el.tagName.toLowerCase();
      var type = (el.getAttribute("type") || "").toLowerCase();

      if (tagName === "input" && ["hidden", "submit", "button", "checkbox", "radio", "file", "image", "reset", "color"].indexOf(type) !== -1) {
        continue;
      }

      var fieldInfo = {
        tag: tagName,
        type: type || (tagName === "textarea" ? "textarea" : tagName === "select" ? "select" : "text"),
        selector: buildSelector(el),
        label: getLabel(el),
        name: el.name || "",
        id: el.id || "",
        placeholder: el.placeholder || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        role: el.getAttribute("role") || "",
        currentValue: el.value || el.textContent || ""
      };

      if (tagName === "select") {
        fieldInfo.options = getSelectOptions(el);
      }

      elements.push(fieldInfo);
    }

    log("Found", elements.length, "fillable elements");
    return {
      url: window.location.href,
      title: document.title,
      elements: elements
    };
  }

  return {
    scanPage: scanPage,
    isVisible: isVisible,
    getLabel: getLabel,
    buildSelector: buildSelector
  };
})();
