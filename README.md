# AirWise AI — Smart Urban Air Quality & Health Decision Assistant

AirWise AI is a context-aware urban air quality assistant that combines real-time environmental telemetry from **Open-Meteo** with **Google Gemini (`gemini-2.5-flash`)** to generate practical, personalized decisions for daily outdoor and indoor activities.

## Challenge Alignment
- **Smart, Dynamic Assistant:** Synthesizes live US AQI, PM2.5, PM10, and Ozone ($\text{O}_3$) data with user context and supports interactive follow-up questions.
- **Logical Decision Making Based on User Context:** Evaluates planned activities (such as outdoor jogging, commuting, or indoor ventilation) alongside health sensitivity profiles (such as asthma/respiratory sensitivity, elderly/children, or cardiovascular conditions).
- **Practical Real-World Usability:** Mobile-first responsive interface with graceful rule-based fallback advice when no API key is entered.

## Architecture & Tech Stack
- **Frontend:** Semantic HTML5, responsive CSS, and modular vanilla JavaScript (`index.html`, `app.js`).
- **Air Quality & Geocoding APIs:** Open-Meteo Geocoding API and Open-Meteo Air Quality API.
- **Generative AI Integration:** Google Gemini API (`gemini-2.5-flash`) for context-aware recommendations and follow-up Q&A.

## Security & Privacy Practices
- **No Hardcoded Secrets:** API keys are never committed to source control; users enter their Gemini API key at runtime in the browser session.
- **Safe DOM Rendering:** Dynamic telemetry and AI outputs are rendered using `textContent` rather than raw HTML injection.

## Accessibility & Testing
- **Accessibility:** Uses semantic landmarks, explicit form labels, focus outlines, and `aria-live="polite"` announcements for dynamic updates.
- **Unit Testing:** Run `node test.js` to verify AQI classification, context prompt construction, and sensitive-health fallback logic.
