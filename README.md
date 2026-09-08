# 📍 Timeline Crack

> **A user-friendly, high-performance web application to watch and replay your visited timeline with interactive maps, playback animation, time scrubbing, and travel analytics.**

Built for [aroshwijesinghe/timeline_crack](https://github.com/aroshwijesinghe/timeline_crack).

---

## ✨ Features

- 🗺️ **Interactive Multi-Layer Map**
  - Instant map rendering powered by Leaflet (no Google Maps API key required).
  - Switch between **Dark Matter**, **Voyager (Streets)**, **Satellite Imagery**, and **Standard OSM**.
  - Visited places numbered sequentially with arrival/departure times, stay durations, and direct links to Google Maps.
  - Travel routes color-coded by transport mode (Driving: Blue, Walking: Green, Cycling: Cyan, Motorcycle: Amber, Bus: Purple).
  - Toggleable **Raw GPS Breadcrumbs** (visualize thousands of phone location pings).

- ⏱️ **Watch Timeline Mode (Animated Playback Engine)**
  - Replay your day's journey across time with a smooth moving marker and HUD.
  - Play / Pause / Reset controls + keyboard shortcut (<kbd>Space</kbd> to toggle playback).
  - Variable playback speeds: `1x`, `5x`, `15x`, `30x`, `60x`, `120x`.
  - Interactive timeline scrubber slider with real-time timestamp readout.
  - Auto-follow camera toggle keeping the moving marker centered.

- 📅 **Day-by-Day Navigation & Chronological Feed**
  - Dropdown selector and `<` / `>` day buttons.
  - Chronological card feed of every stop and travel segment for the day.
  - Filter by **All**, **Stops Only**, or **Travel Only**.
  - Click any card to fly the camera directly to that location on the map.

- 📊 **Travel Analytics & Stats Dashboard**
  - Total days tracked, total distance covered (km), places visited, and raw GPS signal count.
  - Breakdown by transport mode with distance and time percentages.

- 🔒 **100% Client-Side Privacy**
  - All file reading, JSON parsing, and visualization runs strictly in your local browser memory.
  - Your personal location history is **never** uploaded or transmitted to any server.

- 📥 **Universal JSON Support**
  - Supports modern Google Maps mobile export format (`semanticSegments`, `rawSignals`, `latLng` with degree symbols).
  - Supports legacy Google Takeout formats (`timelineObjects`, `placeVisit`, `activitySegment`, `locations`).
  - Includes a built-in interactive demo tour of Sri Lanka (Colombo → Kandy → Peradeniya) for instant preview.

- 📤 **Export Capabilities**
  - Export any selected day directly into **GeoJSON** format for use in GIS tools, QGIS, or Google Earth.

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/aroshwijesinghe/timeline_crack.git
cd timeline_crack
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production

```bash
npm run build
npm run preview
```

The output in the `dist/` directory is static HTML/JS/CSS ready to deploy to GitHub Pages, Vercel, Netlify, or Cloudflare Pages.

---

## 📱 How to Get Your Google Maps `Timeline.json` File

### Option 1: If you have an Android Phone
1. Pull down your phone's notification shade and tap the **Settings** (gear icon).
2. Scroll down and select **Location**, then tap **Location Services**.
3. Select **Timeline** (you may need to select your specific Google account if you have more than one).
4. Under the Timeline settings page, look for and tap **Export Timeline data**.
5. Tap **Continue**, and the phone will generate and download a file named `Timeline.json` to your local storage or files app.

### Option 2: If you have an iPhone (iOS)
1. Open the **Google Maps** app on your iPhone.
2. Tap your **Profile icon** in the upper right corner and select **Settings**.
3. Scroll down and select **Personal content**.
4. Look for the option labeled **Export Timeline data** and tap it to generate and save your local `Timeline.json` data package.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Glassmorphism aesthetic
- **Map & Routing**: [Leaflet](https://leafletjs.com/) + OpenStreetMap / Esri ArcGIS tiles (100% free, no API key required)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📄 License

MIT License. Free and open source for personal and commercial use.
