# Docket - Australian Grocery Savings Optimizer

Docket is a premium, multi-service application designed to help Australian households save money on groceries. The application aggregates weekly catalogue specials and pricing from major Australian supermarkets (**Coles** and **Woolworths**), optimizes shopping lists, computes travel-aware savings, and provides split-shopping recommendations.

The project features a **C# ASP.NET Core** backend, a **Python FastAPI** AI microservice for receipt OCR and fuzzy string matching, and a **Vite + React** glassmorphic frontend.

---

## Key Features

1. **Receipt Upload & Data Extraction**: When a user uploads a receipt photo, an OCR model extracts names, quantities, and prices, which ML normalizes (e.g. "WW CHKN BRST 500G" to "Chicken Breast 500g") and builds a personalized purchasing profile.
2. **Price Intelligence Layer**: Ingests weekly catalog data from Coles and Woolworths to calculate personalized basket totals, predict special discount cycles, recommend equivalent substitute items, and highlight store price sensitivity.
3. **Google Maps Integration**: Locates the closest stores with real-time drive times and distance. Incorporates transportation fuel overheads and plots optimal route directions for multi-stop split-shopping trips.
4. **The Data Flywheel**: Compounds saving accuracy over a 4-to-6-week receipt upload cycle, feeding anonymized, aggregated regional price matches back into the matching database.
5. **Modern Tech Stack**: Integrated via Google Vision API / AWS Textract for OCR scanning, RapidFuzz string normalization, and the Google Maps Platform for geolocated routes.
6. **Top-5 Store Ranking Engine**: A 6-phase algorithm that analyses receipt purchase history, ranks all 5 major Australian supermarkets (Coles, Woolworths, Aldi, IGA, Costco) by a weighted savings score (factoring in active specials and item-level discount mapping), layers in a proximity ranking, and outputs a combined trade-off recommendation with optional split-shop routing. Also returns geolocated distance to stores on receipt upload.

---

## Tech Stack & Architecture

### Service Routing Overview
```
  ┌─────────────────────────────────────────────────────────────┐
  │                    React Frontend (Vite)                    │
  │  - Local: http://localhost:5173                             │
  │  - Render (Static): https://docket-web-2cxk.onrender.com     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ HTTP REST
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                     C# Web API Backend                      │
  │  - Local: http://localhost:5100                             │
  │  - Render (Docker Web): https://docket-backend-jm71.onrender.com │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ HTTP Client
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                    Python AI Microservice                   │
  │  - Local: http://localhost:8000                             │
  │  - Render (Docker Web): https://smartshoppingdestination.onrender.com │
  └─────────────────────────────────────────────────────────────┘
```

### Technology Matrix
*   **Frontend**: React, Vite, Lucide-React, Custom Glassmorphic Vanilla CSS.
*   **Backend**: C# ASP.NET Core 8.0, Entity Framework Core with SQLite.
*   **AI Service**: Python 3.12, FastAPI, RapidFuzz (fuzzy matching), Pillow (OCR preprocessing).
*   **Deployment & Hosting**: Fully deployed on **Render** using a multi-service blueprint (`render.yaml`):
    *   **docket-web** (Vite Static Site): Serves the frontend client SPA.
    *   **docket-backend** (Docker web service): Exposes the ASP.NET Core 8 Web API.
    *   **docket-api** (Docker web service): Hosts the FastAPI OCR & matching python service.

---

## How to Run the Application

Follow these steps to spin up the entire ecosystem.

### Prerequisite
Ensure you have the .NET 8.0 SDK, Python 3.12, and Node.js installed on your Linux machine.

### Quick Start (Recommended)
You can launch all three services simultaneously (Python AI, C# Backend, and React Frontend) using the root startup script:
```bash
./start.sh
```
This script handles starting the C# backend and Python service in the background (piping logs to `backend-service.log` and `python-service.log` respectively), boots the React Vite dev server in the foreground, and automatically cleans up and shuts down all background processes when you press `Ctrl+C`.

---

### Manual Service Start (Alternative)
If you prefer running services in separate terminal windows, use the following manual commands:

#### Step 1: Start the Python AI Service (Port 8000)
```bash
cd ai-service && ./run.sh
```

#### Step 2: Start the C# Backend API (Port 5100)
```bash
~/.dotnet/dotnet run --project backend/backend.csproj
```

#### Step 3: Start the React Frontend Dev Server (Port 5173)
```bash
npm --prefix frontend run dev
```

---

## Guide to Testing Features In-App

For a seamless evaluation, Docket is equipped with simulated dataset helpers:

1. **Quick Login**: On the auth page, click **Quick Demo Login** to sign in instantly with the pre-seeded account (`demo` / `password`).
2. **Interactive Comparison**: Add items using the search bar (e.g. type `milk` or `cheese`). You will see live Coles vs Woolworths prices update instantly on the right.
3. **Simulating Receipt OCR Scan**: In the **Optimize Basket** tab, click **Coles OCR** or **Woolies OCR** to simulate uploading a receipt. It triggers the backend parsing flow and adds extracted catalog matches to your shopping list.
4. **Loyalty Integration**: Click **Flybuys Sync** or **Rewards Sync** to simulate pulling previous grocery purchases, filling your shopping list with your usual items.
5. **Adjusting Settings**: Under **My Settings**, move the travel distance sliders or toggle card memberships. Return to **Optimize Basket** to observe how the price totals and recommended store choices adapt in real-time.
6. **Checkout & Chart**: Click **Checkout & Log Savings** on a list. It clears the basket, updates the database logs, and redirects to **Savings History**, updating the custom SVG savings line chart dynamically.
