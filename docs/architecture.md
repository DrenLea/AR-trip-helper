# Architecture

- City packs own POI fixtures, transit metadata, emergency targets, themes, and AR asset references.
- The planner consumes only domain models and returns itinerary totals plus explanation rows.
- Map rendering is lazy-loaded Leaflet with an accessible text route fallback.
- AR resolves WebXR → camera overlay → model-viewer → external link and never assumes a capability or license.
- The Express sync API stores short-lived share sessions, versioned trip events, low-frequency heartbeats, and SOS records in memory for the demo.
- The PWA layer precaches the shell, keeps the latest itinerary locally, strips exact coordinates from offline event queues, and requests device permissions only when a feature is used.

Known limits: fixtures and transit values are demo data, the sync store is process-local, and continuous background location is intentionally not claimed.
