# 0815weather

An interactive 3D weather application with real-time global weather data and a weather-guessing game.

## Features

- **Interactive 3D Globe** — Rotate and zoom a Three.js-powered globe to explore weather worldwide
- **Real-Time Weather** — Current conditions (temperature, humidity, wind, pressure, visibility) and 5-day forecasts
- **Weather Overlays** — Visualize temperature, precipitation, and wind patterns across the globe
- **Multiple Globe Layers** — Toggle between plain, borders, capitals, and cities views
- **Weather Guessing Game** — Test your geography knowledge across four difficulty levels with a scoring system
- **City Search** — Search any city globally and jump to it on the globe
- **Favourite Cities** — Bookmark cities for quick access (persisted in localStorage)
- **Global Weather Ticker** — Scrolling banner showing live temperatures in major world cities

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Three.js | 3D globe rendering |
| Vite | Build tool and dev server |
| Open-Meteo API | Free weather forecast data |
| Nominatim (OpenStreetMap) | Reverse geocoding |
| OpenMeteo Geocoding API | City name search |

No API keys required — all external services are free and open.

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── components/
│   ├── Globe.jsx           # 3D globe visualization
│   ├── WeatherPanel.jsx    # Weather info display
│   ├── GameMode.jsx        # Weather guessing game
│   ├── LandingPage.jsx     # Landing/hero page
│   ├── SearchBar.jsx       # City search input
│   ├── DateTime.jsx        # Current date/time display
│   ├── WeatherTicker.jsx   # Scrolling global weather ticker
│   ├── GlobeControls.jsx   # Zoom and layer toggle controls
│   └── FavouriteCities.jsx # Saved cities management
├── hooks/
│   └── useFavourites.js    # localStorage persistence hook
├── utils/
│   ├── api.js              # External API calls
│   ├── coordinates.js      # Lat/lon to 3D coordinate conversion
│   ├── weatherCodes.jsx    # WMO weather code interpretation
│   └── weatherOverlay.js   # Canvas-based weather overlays
└── data/
    └── geoData.js          # World capitals and major cities
```

## Game Mode

The weather guessing game challenges you to identify a mystery location based on its current weather conditions.

| Difficulty | Target |
|---|---|
| Easy | Well-known world capitals |
| Moderate | Major cities |
| Hard | Smaller cities |
| Extreme | Remote locations |

Each round starts with 1000 points. Use hints (continent, country, population, hemisphere, first letter) at a point cost to narrow it down. A full game runs for 3 rounds.

## Built By

This project was fully designed, implemented, and built by **Claude Code** (Anthropic's AI coding agent), with a developer acting in an advisory role only — providing direction and feedback, but writing no code.
