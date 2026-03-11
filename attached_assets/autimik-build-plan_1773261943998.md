# Autimik — Full Product Build Plan
### From Inventory Scraper → Shiftly-Style Facebook Marketplace Tool

---

## Table of Contents
1. [Product Vision](#product-vision)
2. [What Autimik 2.0 Already Has](#what-autimik-20-already-has)
3. [Architecture Overview](#architecture-overview)
4. [Phase 1 — MVP Browser Extension](#phase-1--mvp-browser-extension)
5. [Phase 2 — Dashboard Upgrades](#phase-2--dashboard-upgrades)
6. [Phase 3 — Scraper Overhaul](#phase-3--scraper-overhaul)
7. [Phase 4 — Paid Tier & Monetization](#phase-4--paid-tier--monetization)
8. [File Structure](#file-structure)
9. [Browser Extension Deep Dive](#browser-extension-deep-dive)
10. [API Contract](#api-contract)
11. [CSV/DMS Import Spec](#csvdms-import-spec)
12. [Tech Stack Decisions](#tech-stack-decisions)
13. [Prioritized Task List](#prioritized-task-list)

---

## Product Vision

**Autimik** is a tool for car salespeople that lets them list vehicles on Facebook Marketplace in seconds — not minutes.

A salesperson installs the browser extension, logs into Facebook normally with their own account, opens the Marketplace listing form, and the extension auto-fills every field (title, price, mileage, description, year, make, model, photos) using vehicle data pulled from either:

- Their dealership's own inventory website (scraped via Autimik's backend), or
- A CSV/DMS export they upload to the Autimik dashboard

Think **Shiftly** — but built for individual salespeople and small dealerships, with a browser extension as the primary UX.

---

## What Autimik 2.0 Already Has

### ✅ Keep As-Is (Strong Foundation)
| Component | What It Does | Value |
|---|---|---|
| `server/routes.ts` | REST API with job management | Solid — just extend it |
| `shared/schema.ts` | Vehicle + Job schema (Drizzle/Postgres) | Good data model, minor additions needed |
| Facebook export format | CSV formatted for FB Marketplace | **Directly useful** for the extension |
| WebSocket progress feed | Real-time scraping updates | Keep for dashboard |
| Export to CSV/JSON/Excel | Multi-format data export | Keep and extend |

### ⚠️ Needs Rework
| Component | Problem | Fix |
|---|---|---|
| Scraper (`scrapeInventory`) | Hardcoded for CarPlace Motors only | Make it generic + site-configurable |
| VIN handling | Fake VINs generated when not found | Integrate NHTSA VIN decoder API |
| No auth system | User table exists but no login flow | Add JWT or session-based auth |
| No CSV import | Only scraping as data source | Add upload endpoint |

### ❌ Missing Entirely
- Browser extension
- Extension ↔ backend API auth
- Subscription/payment system
- Multi-dealership support
- Image downloading (FB needs actual files, not URLs)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  SALESPERSON                        │
│                                                     │
│  ┌──────────────┐        ┌────────────────────────┐ │
│  │   Dashboard  │        │   Browser Extension    │ │
│  │  (React App) │        │   (Chrome/Firefox)     │ │
│  │              │        │                        │ │
│  │ • Upload CSV │        │ • Detects FB Marketplace│ │
│  │ • View cars  │        │ • Shows vehicle picker │ │
│  │ • Manage jobs│        │ • Auto-fills the form  │ │
│  └──────┬───────┘        └──────────┬─────────────┘ │
│         │                           │               │
└─────────┼───────────────────────────┼───────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────────┐
│              Autimik Backend (Node/Express)          │
│                                                     │
│  POST /api/auth/login                               │
│  GET  /api/vehicles          ← extension calls this │
│  POST /api/vehicles/import   ← CSV upload           │
│  POST /api/scraping-jobs     ← trigger scrape       │
│  GET  /api/vehicles/:id/images ← image proxy        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              PostgreSQL Database
              (Neon Serverless)
```

---

## Phase 1 — MVP Browser Extension

**Goal:** A salesperson opens `facebook.com/marketplace/create/vehicle` and the extension pops up, lets them pick a car from their inventory, and fills the form.

### Step 1 — Create the Extension Project

Create a new folder `extension/` at the root of the repo:

```
extension/
├── manifest.json
├── background.js
├── content.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Step 2 — manifest.json (Manifest V3)

```json
{
  "manifest_version": 3,
  "name": "Autimik — List Cars Fast",
  "version": "1.0.0",
  "description": "Auto-fill Facebook Marketplace vehicle listings from your dealership inventory.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://www.facebook.com/*",
    "https://YOUR_BACKEND_URL/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.facebook.com/marketplace/create/vehicle*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

### Step 3 — popup.js (Vehicle Picker UI)

The popup is what the user sees when they click the extension icon. It:
1. Checks if the user is logged in to Autimik
2. Shows a searchable list of their vehicles
3. When they click a vehicle → sends it to `content.js` to fill the form

```javascript
// popup/popup.js

const API_BASE = 'https://YOUR_BACKEND_URL';

async function getToken() {
  return new Promise(resolve => chrome.storage.local.get('autimik_token', d => resolve(d.autimik_token)));
}

async function fetchVehicles(search = '') {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/vehicles?search=${search}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function init() {
  const token = await getToken();

  if (!token) {
    showLoginForm();
    return;
  }

  const vehicles = await fetchVehicles();
  renderVehicleList(vehicles);
}

function renderVehicleList(vehicles) {
  const list = document.getElementById('vehicle-list');
  list.innerHTML = vehicles.map(v => `
    <div class="vehicle-card" data-id="${v.id}">
      <img src="${v.imageUrl}" />
      <div>
        <strong>${v.year} ${v.make} ${v.model}</strong>
        <span>${v.price}</span>
        <span>${v.mileage}</span>
      </div>
      <button class="list-btn" data-vehicle='${JSON.stringify(v)}'>List This Car</button>
    </div>
  `).join('');

  document.querySelectorAll('.list-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const vehicle = JSON.parse(e.target.dataset.vehicle);
      injectVehicle(vehicle);
    });
  });
}

async function injectVehicle(vehicle) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'FILL_FORM', vehicle });
}

init();
```

### Step 4 — content.js (Form Auto-Fill)

This is injected into the Facebook Marketplace vehicle listing page. It listens for the `FILL_FORM` message and fills each field.

```javascript
// content.js

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'FILL_FORM') {
    fillMarketplaceForm(message.vehicle);
  }
});

async function fillMarketplaceForm(vehicle) {
  // Facebook uses React-controlled inputs — must use native input value setter
  function setInputValue(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setSelectValue(select, value) {
    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    nativeSelectValueSetter.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Wait for field to appear, then fill
  async function waitAndFill(selector, value, type = 'input') {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          if (type === 'select') setSelectValue(el, value);
          else setInputValue(el, value);
          resolve();
        }
      }, 300);
      setTimeout(() => { clearInterval(interval); resolve(); }, 10000); // 10s timeout
    });
  }

  // Fill each field — selectors will need validation/updates as FB changes their DOM
  await waitAndFill('input[placeholder*="Price"]', vehicle.price?.replace(/[^0-9]/g, ''));
  await waitAndFill('input[placeholder*="Year"]', String(vehicle.year));
  await waitAndFill('input[placeholder*="Make"]', vehicle.make);
  await waitAndFill('input[placeholder*="Model"]', vehicle.model);
  await waitAndFill('input[placeholder*="Mileage"]', vehicle.mileage?.replace(/[^0-9]/g, ''));

  // Description
  const descField = document.querySelector('textarea[placeholder*="Description"]');
  if (descField) {
    setInputValue(descField, buildDescription(vehicle));
  }

  console.log('[Autimik] Form filled for:', vehicle.title);
}

function buildDescription(v) {
  return [
    `${v.year} ${v.make} ${v.model}`,
    v.mileage ? `Mileage: ${v.mileage}` : '',
    v.transmission ? `Transmission: ${v.transmission}` : '',
    v.interiorColor ? `Interior: ${v.interiorColor}` : '',
    v.vin ? `VIN: ${v.vin}` : '',
    '',
    'Contact us to schedule a test drive!'
  ].filter(Boolean).join('\n');
}
```

> ⚠️ **Important:** Facebook changes their DOM selectors frequently. You'll need to periodically audit and update the selectors in `content.js`. Consider storing selectors in a config endpoint on your backend so you can update them without a new extension release.

### Step 5 — Login Flow in the Extension

Add a simple login form in the popup that calls your backend:

```javascript
// In popup.js
async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    chrome.storage.local.set({ autimik_token: data.token });
    init(); // re-render with vehicles
  }
}
```

---

## Phase 2 — Dashboard Upgrades

These changes go into the existing React dashboard (`client/src/`).

### 2.1 — CSV/DMS Import

Add a new page `client/src/pages/import.tsx`:

```typescript
// Key features:
// 1. Drag-and-drop CSV upload
// 2. Column mapper (user maps their CSV columns to Autimik fields)
// 3. Preview table before confirming import
// 4. Handles common DMS formats: CDK, Reynolds & Reynolds, DealerSocket
```

Add backend endpoint in `server/routes.ts`:

```typescript
app.post('/api/vehicles/import', upload.single('file'), async (req, res) => {
  const { buffer } = req.file;
  const records = parse(buffer, { columns: true, skip_empty_lines: true });
  
  const vehicles = records.map(mapRowToVehicle);
  const saved = await Promise.all(vehicles.map(v => storage.createVehicle(v)));
  
  res.json({ imported: saved.length, vehicles: saved });
});
```

### 2.2 — Auth System

Add JWT auth to the backend. Every extension API call needs a valid token.

```typescript
// server/auth.ts
import jwt from 'jsonwebtoken';

export function generateToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

Apply `authMiddleware` to all `/api/vehicles` routes so the extension can only access the logged-in user's vehicles.

### 2.3 — Image Downloading

FB Marketplace benefits from actual uploaded images, not just URLs. Add an image proxy/downloader:

```typescript
// server/routes.ts — add this endpoint
app.post('/api/vehicles/:id/download-images', async (req, res) => {
  const vehicle = await storage.getVehicle(req.params.id);
  if (!vehicle?.imageUrl) return res.status(404).json({ error: 'No image' });

  const response = await fetch(vehicle.imageUrl);
  const buffer = await response.arrayBuffer();
  const filename = `vehicle_${vehicle.id}.jpg`;
  
  // Save to disk or S3
  fs.writeFileSync(`./uploads/${filename}`, Buffer.from(buffer));
  
  await storage.updateVehicle(vehicle.id, { localImagePath: `/uploads/${filename}` });
  res.json({ success: true, path: `/uploads/${filename}` });
});
```

---

## Phase 3 — Scraper Overhaul

The current scraper is hardcoded for one site. Make it generic.

### 3.1 — Site Config Schema

Add a `dealershipSites` table to `shared/schema.ts`:

```typescript
export const dealershipSites = pgTable('dealership_sites', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  inventoryPath: text('inventory_path').notNull(), // e.g. '/inventory'
  selectors: jsonb('selectors').notNull(), // CSS selectors for each field
  paginationType: text('pagination_type'), // 'scroll' | 'pages' | 'load-more'
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 3.2 — Generic Scraper

Replace the hardcoded scraper with a config-driven version:

```typescript
async function scrapeWithConfig(jobId: string, url: string, siteConfig: SiteConfig) {
  // Use siteConfig.selectors to extract each field
  // Use siteConfig.paginationType to handle pagination
  // No hardcoded logic for any specific site
}
```

### 3.3 — VIN Decoder Integration

Replace fake VIN generation with the free NHTSA API:

```typescript
async function decodeVin(vin: string) {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
  const data = await res.json();
  // Returns make, model, year, body type, etc.
  return parseNHTSAResponse(data);
}
```

---

## Phase 4 — Paid Tier & Monetization

### Subscription Tiers

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | 10 listings/month, manual fill only |
| **Pro** | $29/month | Unlimited listings, auto-fill, CSV import |
| **Team** | $99/month | 5 seats, shared inventory pool, scraping |

### Implementation

- Use **Stripe** for payments (`stripe` npm package)
- Add `subscriptionTier` and `subscriptionExpiry` to the `users` table
- Gate features in both the dashboard and the extension API responses
- Extension checks tier on login and shows/hides premium features

```typescript
// server/routes.ts
app.post('/api/billing/checkout', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_IDS[req.body.tier], quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/billing/success`,
    cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
  });
  res.json({ url: session.url });
});
```

---

## File Structure

After all phases, the repo should look like this:

```
AutimikTwo/
├── extension/                    ← NEW: Chrome/Firefox extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── popup/
│       ├── popup.html
│       ├── popup.js
│       └── popup.css
├── client/                       ← Existing React dashboard
│   └── src/
│       ├── pages/
│       │   ├── dashboard.tsx     ← Keep, improve
│       │   ├── import.tsx        ← NEW: CSV import
│       │   ├── vehicles.tsx      ← NEW: vehicle management
│       │   └── billing.tsx       ← NEW: subscription management
│       └── components/
├── server/
│   ├── index.ts                  ← Keep
│   ├── routes.ts                 ← Extend
│   ├── auth.ts                   ← NEW: JWT auth
│   ├── scraper.ts                ← NEW: generic scraper (extracted from routes)
│   ├── storage.ts                ← Extend
│   └── billing.ts                ← NEW: Stripe integration
├── shared/
│   └── schema.ts                 ← Extend with new tables
└── uploads/                      ← NEW: local image storage
```

---

## API Contract

These are the endpoints the browser extension will call:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Returns JWT token |
| `GET` | `/api/vehicles` | Bearer token | List user's vehicles (supports `?search=`) |
| `GET` | `/api/vehicles/:id` | Bearer token | Single vehicle details |
| `GET` | `/api/user/me` | Bearer token | Current user + subscription tier |
| `POST` | `/api/vehicles/import` | Bearer token | Upload CSV file |
| `POST` | `/api/scraping-jobs` | Bearer token | Trigger a scrape |

---

## CSV/DMS Import Spec

The import endpoint should handle these common DMS export formats:

### Minimum Required Columns
```
year, make, model, price, mileage, vin
```

### Optional Columns (will be imported if present)
```
trim, transmission, exterior_color, interior_color, fuel_type, 
body_style, stock_number, description, image_url, drivetrain
```

### Column Name Aliases to Support
Since every DMS exports different column names, map these automatically:

| Autimik Field | Accepted Column Names |
|---|---|
| `year` | year, model_year, yr |
| `make` | make, manufacturer, brand |
| `model` | model, model_name |
| `price` | price, selling_price, list_price, msrp |
| `mileage` | mileage, miles, odometer |
| `vin` | vin, vin_number, vehicle_id |

---

## Tech Stack Decisions

| Decision | Choice | Reason |
|---|---|---|
| Extension manifest | **V3** | Required by Chrome going forward |
| Extension auth storage | `chrome.storage.local` | Persists across sessions, not exposed to page JS |
| Backend auth | **JWT** | Stateless, works well for extension API calls |
| Image storage | **Local disk → S3 later** | Start simple, migrate when needed |
| Payments | **Stripe** | Industry standard, good React components |
| VIN decoding | **NHTSA free API** | Free, reliable, official US government data |
| Scraper selectors update | **Backend config endpoint** | Lets you fix broken selectors without a new extension release |

---

## Prioritized Task List

### 🔴 Week 1-2 — Core Extension (MVP)
- [ ] Create `extension/` folder with `manifest.json`
- [ ] Build popup UI (vehicle list + search)
- [ ] Build `content.js` form-filler for Facebook Marketplace
- [ ] Add login flow in popup (calls `/api/auth/login`)
- [ ] Add JWT auth to backend
- [ ] Test end-to-end: login → pick vehicle → form fills on FB

### 🟡 Week 3-4 — Data Pipeline
- [ ] Add CSV import page to dashboard
- [ ] Build column mapper component
- [ ] Add `/api/vehicles/import` endpoint
- [ ] Add image download endpoint
- [ ] Test with real DMS CSV exports (CDK, Reynolds)

### 🟢 Week 5-6 — Scraper Overhaul
- [ ] Extract scraper into `server/scraper.ts`
- [ ] Add `dealershipSites` table with selectors config
- [ ] Replace hardcoded CarPlace logic with generic config-driven scraper
- [ ] Integrate NHTSA VIN decoder
- [ ] Test on 3+ different dealership websites

### 🔵 Week 7-8 — Monetization
- [ ] Add Stripe to backend
- [ ] Add subscription tiers to user schema
- [ ] Build billing page in dashboard
- [ ] Gate features by tier in API + extension
- [ ] Set up Stripe webhook for subscription events

### ⚪ Ongoing
- [ ] Monitor FB Marketplace DOM changes → update `content.js` selectors
- [ ] Build selector update endpoint so fixes deploy without new extension release
- [ ] Submit extension to Chrome Web Store
- [ ] Firefox port (manifest differences are minor)

---

*Built on Autimik 2.0 — Node/Express + React + PostgreSQL + Puppeteer*

---

## Appendix A — CSV Import Feature (Detailed Implementation)

### Files Added / Modified

| File | Action | Description |
|---|---|---|
| `server/csv-import.ts` | **NEW** | Backend analyze + import endpoints |
| `client/src/pages/csv-import.tsx` | **NEW** | Full 5-step React import UI |
| `server/routes.ts` | **MODIFIED** | Imports and registers csv-import routes |
| `client/src/App.tsx` | **MODIFIED** | Adds `/import` route |

### Dependencies to Install
```bash
npm install csv-parse multer @types/multer --save
```

### How It Works

**Step 1 — Upload (`/import` route)**
- Drag-drop or click to pick a `.csv` file
- Optional CRM name field (e.g. "VAuto") to save/load mappings
- "Save mappings for next time" toggle

**Step 2 — Analyze (`POST /api/csv-import/analyze`)**
- Reads headers + first 5 sample values per column
- Scores each column against 16 vehicle fields using:
  - Header name fuzzy matching against known aliases
  - Value pattern detection (VIN regex, price format, year range, URLs)
- Returns columns sorted into 3 buckets: auto (≥85%), review (60-84%), unmapped
- Loads saved CRM mappings if name matches

**Step 3 — Mapping Review**
- Every column shown with confidence badge + sample values
- Required fields (Stock#, Year, Make, Model, Color) highlighted green
- VIN values light up green/red based on 17-char validation
- Live preview table with color-coded validation
- Dropdown to change any mapping

**Step 4 — Import (`POST /api/csv-import/import`)**
- Processes each row, maps fields per confirmed mappings
- Upserts by stock number (insert new / update existing)
- Cleans price (strips $,) and mileage (normalizes to "X miles")
- Auto-generates title from year+make+model if missing
- Saves mappings to in-memory CRM store if toggled

**Step 5 — Results**
- Shows inserted / updated / skipped / failed counts
- Per-row log (expandable) showing status + vehicle name per row
- Invalidates `/api/vehicles` and `/api/stats` query cache immediately

### Known Limitations / Next Steps
- CRM mapping store is in-memory — persist to PostgreSQL for production
- Add `stockNumber` column to the `vehicles` Drizzle schema
- Add file size validation UI feedback
- Support Excel (.xlsx) uploads using the existing `xlsx` library
