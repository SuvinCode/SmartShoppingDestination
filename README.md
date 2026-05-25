# Docket - Australian Grocery Savings Optimizer

Docket is a premium, multi-service application designed to help Australian households save money on groceries. The application aggregates weekly catalogue specials and pricing from major Australian supermarkets (**Coles** and **Woolworths**), optimizes shopping lists, computes travel-aware savings, and provides split-shopping recommendations.

The project features a **C# ASP.NET Core** backend, a **Python FastAPI** AI microservice for receipt OCR and fuzzy string matching, and a **Vite + React** glassmorphic frontend.

---

## Key Features

1. **Receipt OCR Scanning**: Upload a photo of a Coles or Woolworths receipt. The Python AI service extracts product names and quantities, which are fuzzy-matched against the database catalog to populate your list.
2. **Split-Shopping Recommendations**: Docket determines if split-shopping (buying the cheapest items at both Coles and Woolworths) makes sense by checking if the extra savings exceed fuel costs and a user-defined savings threshold.
3. **Smart Autocomplete Search**: Autocompletes generic product names and standard pack sizes (e.g. "Devondale Full Cream Milk 2L") rather than store-branded lines, making basket comparison seamless.
4. **Loyalty Card Valuations**: Integrates Flybuys (Coles) and Everyday Rewards (Woolworths) points values into calculations. Points are converted to cash equivalent offsets (0.5% point rebates + special bonus points) and deducted from totals.
5. **Distance & Fuel Cost Adjustment**: Factoring in true transportation overheads (Distance in km × 2 × Fuel cost/km) so users know their real bottom-line cost before leaving home.
6. **Savings analytics Dashboard**: View cumulative savings, total spent, and average savings over time via custom interactive SVG charts and shopping logs.

---

## Tech Stack & Architecture

```
  ┌─────────────────────────────────────────────────────────┐
  │                   React Frontend (Vite)                 │
  │                  (Port 5173 - Client UI)                │
  └────────────────────────────┬────────────────────────────┘
                               │ HTTP REST
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   C# Web API Backend                    │
  │                 (Port 5100 - SQLite DB)                 │
  └────────────────────────────┬────────────────────────────┘
                               │ HTTP Client
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                  Python AI Microservice                 │
  │               (Port 8000 - OCR & Fuzzy Match)           │
  └─────────────────────────────────────────────────────────┘
```

*   **Frontend**: React, Vite, Lucide-React, Custom Glassmorphic Vanilla CSS.
*   **Backend**: C# ASP.NET Core 8.0, Entity Framework Core with SQLite, Comparison Engine.
*   **AI Service**: Python 3.12, FastAPI, RapidFuzz (fuzzy matching), Pillow (OCR preprocessing).

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
