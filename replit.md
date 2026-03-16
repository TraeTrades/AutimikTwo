# Autimik - Multi-Site Smart Lister Chrome Extension

## Overview
Chrome extension (MV3) that auto-fills vehicle listings from a dealership inventory CSV onto multiple listing sites.

## Architecture
- **extension/content.js** — Orchestrator: matches adapters by URL, dispatches to adapter-based fill or AI fallback
- **extension/fill-engine.js** — Shared form-filling primitives (input, dropdown, select, description, photo upload)
- **extension/form-scanner.js** — Scans visible DOM for fillable form elements (used by AI fallback)
- **extension/ai-mapper.js** — Sends form snapshot + vehicle data to Claude API, returns field mapping
- **extension/mapping-cache.js** — Per-domain AI mapping cache in chrome.storage.local (7-day TTL)
- **extension/adapters/*.json** — Canonical adapter configs for Facebook, Craigslist, OfferUp (embedded as JS objects in content.js since MV3 content scripts can't load JSON dynamically)
- **extension/background/service-worker.js** — Message routing, multi-site tab management, API key storage, image fetching
- **extension/popup/popup.html + popup.js** — UI with site selector dropdown, settings panel (API key, cache clear), inventory management

## Supported Sites
1. Facebook Marketplace (react_controlled strategy)
2. Craigslist (standard_html strategy)
3. OfferUp (react_controlled strategy)
4. Any unknown site via AI-powered form detection (requires Anthropic API key)

## Key Design Decisions
- Adapter configs are embedded inline in content.js because MV3 content scripts cannot use ES modules or dynamically import JSON
- Service worker marks vehicles as listed immediately on successful fill response (not via popup roundtrip) to prevent data loss if popup closes mid-fill
- `normalizeForVerify()` strips all non-alphanumeric chars before comparing values to fix price verification false positives
- `resolveValueMap()` resolves DMS abbreviations before searching dropdown options
