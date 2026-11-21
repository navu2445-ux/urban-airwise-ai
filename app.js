const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const AQI_API = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const state = {
  cityLabel: "",
  aqiData: null,
  context: null,
  lastDecision: ""
};

function classifyAqi(aqi) {
  const numericAqi = Number(aqi);
  if (!Number.isFinite(numericAqi) || numericAqi < 0) {
    return { label: "Unknown", color: "#64748b", textColor: "#ffffff" };
  }
  if (numericAqi <= 50) {
    return { label: "Good", color: "#22c55e", textColor: "#052e16" };
  }
  if (numericAqi <= 100) {
    return { label: "Moderate", color: "#eab308", textColor: "#1e1b4b" };
  }
  if (numericAqi <= 150) {
    return { label: "Unhealthy for Sensitive Groups", color: "#f97316", textColor: "#1c1917" };
  }
  if (numericAqi <= 200) {
    return { label: "Unhealthy", color: "#ef4444", textColor: "#ffffff" };
  }
  return { label: "Very Unhealthy / Hazardous", color: "#991b1b", textColor: "#ffffff" };
}

function buildContextPrompt(cityLabel, aqiData, context) {
  return [
    "You are AirWise AI, an urban air quality and personal health decision assistant.",
    "Analyze the live air telemetry and user context to give a clear, practical decision.",
    `Location: ${cityLabel}`,
    `US AQI: ${aqiData.usAqi} (${classifyAqi(aqiData.usAqi).label})`,
    `PM2.5: ${aqiData.pm25} ug/m3, PM10: ${aqiData.pm10} ug/m3, Ozone (O3): ${aqiData.ozone} ug/m3`,
    `Planned Activity: ${context.activity}`,
    `Health Sensitivity: ${context.health}`,
    "Provide concise bullet points covering:",
    "1) Go / Modify / Avoid Decision",
    "2) Mask & Indoor/Outdoor Action",
    "3) Safer Timing or Alternative"
  ].join("\n");
}

function buildFallbackDecision(cityLabel, aqiData, context) {
  const category = classifyAqi(aqiData.usAqi).label;
  const sensitive = context.health !== "Healthy Adult";
  const highRisk = aqiData.usAqi > 100 || (sensitive && aqiData.usAqi > 50);

  const verdict = highRisk
    ? "MODIFY OR MOVE INDOORS"
    : "SAFE WITH NORMAL PRECAUTIONS";

  const maskAdvice = aqiData.usAqi > 100 || (sensitive && aqiData.usAqi > 75)
    ? "Wear a well-fitted N95/FFP2 respirator outdoors; keep windows closed and use indoor filtration if available."
    : "A mask is optional for brief outdoor movement; monitor symptoms if sensitive.";

  const timingAdvice =
    "Prefer early morning or post-rain hours when traffic and boundary-layer particulate buildup are typically lower.";

  return [
    `[Local Context Decision — ${cityLabel} | ${category}]`,
    `• Decision (${context.activity} / ${context.health}): ${verdict}`,
    `• Mask & Air Action: ${maskAdvice}`,
    `• Timing & Alternative: ${timingAdvice}`
  ].join("\n");
}

async function fetchCityCoordinates(cityName) {
  const cleaned = String(cityName || "").trim();
  if (!cleaned) {
    throw new Error("Please enter a valid city name.");
  }
  const url = `${GEO_API}?name=${encodeURIComponent(cleaned)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Geocoding service unavailable.");
  }
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No location found for "${cleaned}".`);
  }
  const place = data.results[0];
  const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  return { latitude: place.latitude, longitude: place.longitude, label };
}

async function fetchAirQuality(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "us_aqi,pm10,pm2_5,ozone"
  });
  const res = await fetch(`${AQI_API}?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Air quality telemetry request failed.");
  }
  const data = await res.json();
  const current = data.current || {};
  return {
    usAqi: current.us_aqi ?? 0,
    pm25: current.pm2_5 ?? 0,
    pm10: current.pm10 ?? 0,
    ozone: current.ozone ?? 0
  };
}

async function callGemini(apiKey, promptText) {
  const trimmedKey = String(apiKey || "").trim();
  if (!trimmedKey) {
    return null;
  }
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(trimmedKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });
  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status}). Check your API key or quota.`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API.");
  }
  return text.trim();
}

function renderTelemetry(label, aqiData) {
  const resultsSection = document.getElementById("resultsSection");
  const locationTitle = document.getElementById("locationTitle");
  const badge = document.getElementById("aqiBadge");
  const info = classifyAqi(aqiData.usAqi);

  resultsSection.hidden = false;
  locationTitle.textContent = label;
  badge.textContent = `Air Quality: ${info.label}`;
  badge.style.backgroundColor = info.color;
  badge.style.color = info.textColor;

  document.getElementById("usAqi").textContent = String(aqiData.usAqi);
  document.getElementById("pm25").textContent = String(aqiData.pm25);
  document.getElementById("pm10").textContent = String(aqiData.pm10);
  document.getElementById("ozone").textContent = String(aqiData.ozone);
}

async function handleAnalyze() {
  const apiKey = document.getElementById("apiKeyInput").value;
  const city = document.getElementById("cityInput").value;
  const activity = document.getElementById("activitySelect").value;
  const health = document.getElementById("healthSelect").value;
  const btn = document.getElementById("analyzeBtn");
  const aiBox = document.getElementById("aiDecisionBox");

  btn.disabled = true;
  btn.textContent = "Analyzing...";

  try {
    const place = await fetchCityCoordinates(city);
    const aqiData = await fetchAirQuality(place.latitude, place.longitude);
    const context = { activity, health };

    state.cityLabel = place.label;
    state.aqiData = aqiData;
    state.context = context;

    renderTelemetry(place.label, aqiData);

    const prompt = buildContextPrompt(place.label, aqiData, context);
    try {
      const geminiReply = await callGemini(apiKey, prompt);
      state.lastDecision = geminiReply || buildFallbackDecision(place.label, aqiData, context);
    } catch (aiErr) {
      state.lastDecision =
        `${buildFallbackDecision(place.label, aqiData, context)}\n\n(Note: ${aiErr.message})`;
    }
    aiBox.textContent = state.lastDecision;
  } catch (err) {
    document.getElementById("resultsSection").hidden = false;
    aiBox.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Analyze Air Quality & Get AI Decision";
  }
}

async function handleFollowUp() {
  const question = document.getElementById("chatInput").value.trim();
  const replyBox = document.getElementById("chatReplyBox");
  const apiKey = document.getElementById("apiKeyInput").value;

  if (!question) return;
  replyBox.hidden = false;

  if (!state.aqiData || !state.context) {
    replyBox.textContent = "Please run an air quality analysis first.";
    return;
  }

  replyBox.textContent = "Thinking...";
  const followUpPrompt = [
    buildContextPrompt(state.cityLabel, state.aqiData, state.context),
    `User Question: ${question}`,
    "Answer directly, concisely, and practically based on the AQI and user profile."
  ].join("\n");

  try {
    const answer = await callGemini(apiKey, followUpPrompt);
    replyBox.textContent =
      answer ||
      "Add your Gemini API key above for custom conversational answers, or rely on the context decision shown above.";
  } catch (err) {
    replyBox.textContent = `Could not reach Gemini API: ${err.message}`;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("analyzeBtn")?.addEventListener("click", handleAnalyze);
    document.getElementById("askBtn")?.addEventListener("click", handleFollowUp);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { classifyAqi, buildContextPrompt, buildFallbackDecision };
}
