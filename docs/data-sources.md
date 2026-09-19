# Data sources and license policy

| Dataset | City | Used for | Source URL | License | Redistribution | Retrieved at | Production status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Curated sample POI fixtures | Rome/Guiyang | demo places and access labels | https://example.org/ | CC0 sample | yes | 2026-09-19 | demo only | Replace with official/open feeds before production |
| ATAC/GTFS sample | Rome | transit route metadata | https://www.data.go.it/ | sample metadata | yes | 2026-09-19 | demo only | Static values are clearly marked as sample |
| Heritage asset manifest | Rome | AR fallback metadata | https://example.org/heritage | per-asset | no for remote assets | 2026-09-19 | demo only | Attribution stays beside the viewer |

Review platforms such as Dianping, Yelp, TripAdvisor, Ctrip, and Google Places are integration candidates only through an official API, partner export, user-provided export, or an external link. The MVP ships curated sample ratings with a source and freshness label and does not scrape these services.

Assets with missing license metadata are excluded. Assets with `redistributable=false` are linked or embedded remotely, and attribution is shown near the AR/3D viewer.
