const assert = require("assert");
const {
  classifyAqi,
  buildContextPrompt,
  buildFallbackDecision
} = require("./app.js");

function runTests() {
  assert.strictEqual(classifyAqi(28).label, "Good");
  assert.strictEqual(classifyAqi(82).label, "Moderate");
  assert.strictEqual(classifyAqi(130).label, "Unhealthy for Sensitive Groups");
  assert.strictEqual(classifyAqi(175).label, "Unhealthy");
  assert.strictEqual(classifyAqi(240).label, "Very Unhealthy / Hazardous");
  assert.strictEqual(classifyAqi(-5).label, "Unknown");

  const sampleAqi = { usAqi: 72, pm25: 19.5, pm10: 42.0, ozone: 54.0 };
  const asthmaContext = {
    activity: "Outdoor Jogging / Intense Exercise",
    health: "Asthma / Respiratory Sensitivity"
  };

  const prompt = buildContextPrompt("Chandigarh, India", sampleAqi, asthmaContext);
  assert(prompt.includes("Chandigarh, India"));
  assert(prompt.includes("72"));
  assert(prompt.includes("Asthma / Respiratory Sensitivity"));

  const fallback = buildFallbackDecision("Chandigarh, India", sampleAqi, asthmaContext);
  assert(fallback.includes("MODIFY OR MOVE INDOORS"));
  assert(fallback.includes("N95/FFP2"));

  console.log("All AirWise AI unit tests passed successfully.");
}

runTests();
