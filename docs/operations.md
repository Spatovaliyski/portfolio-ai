# Portfolio operations

The Cloudflare Worker `portfolio` renders the frontend from the current Supabase content version. Its static-assets binding serves browser code and the editor. Page, media, and API requests use the shared server handler. Supabase owns content, revisions, and media.

## Normal operation

Owner dashboard saves and AI API writes append a revision and update the public content version in one transaction. HTTP 409 preserves the client’s changes and rejects a stale write. Restore a previous item through **Recent saves**, then Save; restore removed items through **Show removed items**. Saved history and original files remain in Supabase.

GitHub synchronization updates the database content version directly. It does not dispatch a website build. Removed/private repositories are purged from public snapshots and older affected snapshots are invalidated.

## Application deployment

A push to main triggers Cloudflare Builds for `Spatovaliyski/portfolio-3`: build `npm run build`, deploy `npx wrangler deploy`. Cloudflare stores deployment history and supports rolling back to a previous Worker version. The public Supabase URL/key in `wrangler.json` configure the runtime and the editor build. Never put a service-role or secret key in this configuration or a VITE variable.

Use the Worker's Cloudflare dashboard logs for request failures. `GET /healthz` checks that published Supabase content is readable. A provider failure returns 503 rather than serving repository placeholders. Owner APIs still require owner MFA, validate inputs, check versions, and atomically save revisions and live content. Content edits go through [content-api.md](content-api.md).

## Keep-alive

The Worker cron `23 7 * * *` runs daily at 07:23 UTC. It reads the public-content Edge Function, which queries the current published database version, and logs `supabase_keep_alive` on success. A failure throws and appears as a failed scheduled invocation in Cloudflare. This external request is independent of website visits and GitHub Actions. It is a best-effort safeguard against inactivity pausing on Supabase Free, not an uptime guarantee. Supabase controls pausing; a paid Supabase plan is the supported way to eliminate inactivity pauses.

For a local scheduled check, build, run `npm run preview:worker -- --test-scheduled`, then request `/__scheduled`. This reads current public Supabase content and does not write content.

## Images

The Images binding validates input, applies EXIF orientation, and creates immutable responsive WebP derivatives. Originals and derivatives are still stored in Supabase. Images Free includes 5,000 unique transformations per month; new transformations fail when that allowance is exhausted rather than creating an automatic paid upgrade. Image upload validation, the 20 MiB file limit, and the 40-million-pixel limit remain enforced. PNG share previews use the bundled WebAssembly renderer and Manrope font, not uploaded content or a VPS process.

The Node runtime and old deployment scripts remain available as a fallback. They are not run by the production deployment workflow.
