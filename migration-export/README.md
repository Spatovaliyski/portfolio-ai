# Public migration archive

Captured on 12 October 2026. This is a read-only export of publicly served content, not a WordPress database backup. The old site was not changed.

- `raw/wordpress/` contains the exact public REST response bodies, including pagination pages, type definitions, API routes, and availability.
- `pages.json`, `posts.json`, `work_projects.json`, `work_experience.json`, `media.json`, `categories.json`, and `tags.json` contain consolidated collections. Published source dates and custom fields are preserved.
- `originals/` contains all 40 publicly listed media source files, additional full-size originals where WordPress exposed an original filename, and the legacy PDF CV. Do not publish the old CV as an updated CV.
- `media-manifest.json`, `asset-manifest.json`, and `request-manifest.json` retain source URLs, local locations, byte sizes, and SHA-256 hashes.
- `verified-content.json` and `addons-evidence.json` provide implementation-ready facts with editorial caveats. New content should still be reviewed through the owner editor.
- `url-inventory.json` includes existing frontend collections, numeric article URLs, and backend URLs.
- `unsupported-content-report.json` flags legacy shortcode/script-dependent pages for review. Original content remains archived.
- `missing-item-report.json` records six expected GitHub root README 404s; every addon has a public manifest instead. Direct CurseForge HTML archival returned 403 for five listings; their descriptions and distribution URLs were verified using the web connector. No WordPress media downloads failed.

The public build should use only assets intentionally referenced from its sanitized release. Never copy this archive into the public deployment directory. Source media is mirrored under `public/media/` for selected project and Bausy images with its own source/rights manifest. Bausy's declared `og-image.png` returned an HTML fallback and was excluded after validation.

## Editorial requirements before launch

Confirm Crownpeak's current name, title, dates, and responsibilities. Reconcile the CILECT June/July 2021 discrepancy against an updated CV. Add approved Bausy architecture, personal decisions, release workflow, and outcomes. Confirm qualifications and professional project scope. Do not reuse legacy fundraising, organization membership, teacher, alumni, or audience totals as personal engineering or active-user metrics. Confirm the right to reuse client and team-game imagery.

ClassicNumbersEx is discontinued and points users to PlateSCT. Credit `zeldarsprod` alongside `Limitedby` when describing that maintenance work. sBoard's manifest title is Services Board; no public distribution listing or screenshot was found, so use its verified GitHub source. No addon adoption statistics are included in curated facts.

This public archive cannot recover private drafts, users, plugin code, database credentials, server configuration, or WordPress redirect rules. A trusted database/server backup is still required before the production migration is contracted.
