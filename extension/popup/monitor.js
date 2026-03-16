var spinner = document.getElementById("spinner");
var vehicleBar = document.getElementById("vehicleBar");
var logArea = document.getElementById("logArea");
var statusBar = document.getElementById("statusBar");

var startTime = Date.now();
var fillDone = false;

function fmt(ts) {
  var elapsed = ((ts - startTime) / 1000).toFixed(1);
  return "+" + elapsed + "s";
}

function appendEntry(step, detail, cls, ts) {
  var text = step + (detail ? " — " + detail : "");
  var div = document.createElement("div");
  div.className = "log-entry " + (cls || "");
  div.innerHTML =
    '<span class="ts">' + fmt(ts || Date.now()) + '</span>' +
    '<span class="msg">' + escHtml(text) + '</span>';
  logArea.appendChild(div);
  logArea.scrollTop = logArea.scrollHeight;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setStatus(text, cls) {
  statusBar.textContent = text;
  statusBar.className = "status-bar " + (cls || "active");
}

function setDone(success, msg) {
  fillDone = true;
  spinner.className = "spinner " + (success ? "done" : "fail");
  if (success) {
    appendEntry(msg || "Fill complete", "", "done");
    setStatus(msg || "Fill complete", "done");
  } else {
    appendEntry(msg || "Fill failed", "", "fail");
    setStatus(msg || "Fill failed", "fail");
  }
}

// Parse vehicle label from URL param
(function () {
  var params = new URLSearchParams(window.location.search);
  var label = params.get("v");
  if (label) {
    vehicleBar.innerHTML = 'Filling: <span>' + escHtml(decodeURIComponent(label)) + '</span>';
  }
})();

// Load existing log entries from service worker (catches pre-open entries)
chrome.runtime.sendMessage({ type: "GET_FILL_LOG" }, function (resp) {
  if (resp && resp.log && resp.log.length > 0) {
    startTime = resp.log[0].ts;
    resp.log.forEach(function (entry) {
      appendEntry(entry.step, entry.detail, "step", entry.ts);
    });
  }
});

// Listen for live FILL_STATUS messages
chrome.runtime.onMessage.addListener(function (message) {
  if (message.type === "FILL_STATUS" && message.payload && !fillDone) {
    var step = message.payload.step || "";
    var detail = message.payload.detail || "";
    appendEntry(step, detail, "step");
    setStatus(step + (detail ? " " + detail : ""));
  }

  if (message.type === "FILL_DONE") {
    setDone(message.payload.success, message.payload.message);
  }
});
