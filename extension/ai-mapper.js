var AIMapper = (function () {
  function log(...args) {
    console.log("[Autimik:AIMapper]", ...args);
  }

  function getApiKey() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get("autimik_api_key", function (result) {
        resolve(result.autimik_api_key || null);
      });
    });
  }

  function buildPrompt(formSnapshot, vehicleFields) {
    return 'You are a vehicle listing form auto-filler assistant. Given a form snapshot from a webpage and the available vehicle data (field names and their actual values), produce a JSON mapping that tells me which form element to fill with which vehicle field.\n\nVehicle data (field name -> value):\n' + JSON.stringify(vehicleFields, null, 2) + '\n\nForm snapshot (array of form elements on the page):\n' + JSON.stringify(formSnapshot.elements, null, 2) + '\n\nReturn a JSON array of mapping objects. Each object must have:\n- "selector": the CSS selector string from the form element\n- "vehicleField": the vehicle data field name to use (e.g. "price", "year", "make", "model", etc.)\n- "type": one of "input", "select", "dropdown", "description"\n- "valueMap": (optional) an object mapping vehicle values to form option values, only needed for select/dropdown fields where the vehicle value needs to be translated to a specific option text/value\n\nOnly include mappings where you are confident the form field matches a vehicle data field. Respond with ONLY the JSON array, no other text.';
  }

  async function callClaudeAPI(apiKey, prompt) {
    log("Calling Claude API...");
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      var errText = await response.text();
      throw new Error("Claude API error: " + response.status + " " + errText);
    }

    var data = await response.json();
    var text = data.content && data.content[0] && data.content[0].text;
    if (!text) throw new Error("Empty response from Claude API");

    var jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Could not parse JSON array from Claude response");

    return JSON.parse(jsonMatch[0]);
  }

  async function generateMapping(formSnapshot, vehicle) {
    var apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error("No AI API key configured. Open extension settings to add your Anthropic API key.");
    }

    var vehicleData = {};
    for (var k in vehicle) {
      if (vehicle[k] && k !== "id" && k !== "imageUrls" && k !== "imageUrl") {
        vehicleData[k] = vehicle[k];
      }
    }

    var prompt = buildPrompt(formSnapshot, vehicleData);
    var mapping = await callClaudeAPI(apiKey, prompt);

    log("AI generated mapping with", mapping.length, "fields");
    return mapping;
  }

  return {
    generateMapping: generateMapping,
    getApiKey: getApiKey
  };
})();
