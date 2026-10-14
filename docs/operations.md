# Portfolio operations

The Node service `portfolio-runtime` renders the existing frontend from the current Supabase content version. The VPS web server serves code assets and forwards page, media, and API requests to `127.0.0.1:4173`.

## Normal operation

Owner dashboard saves and AI API writes append a revision and update the public content version in one transaction. HTTP 409 preserves the client’s changes and rejects a stale write. Restore a previous item through **Recent saves**, then Save; restore removed items through **Show removed items**. Saved history and original files remain in Supabase.

GitHub synchronization updates the database content version directly. It does not dispatch a website build. Removed/private repositories are purged from public snapshots and older affected snapshots are invalidated.

## Application deployment

A push to main builds code and runs `deploy/runtime.sh` over the configured SSH connection. Runtime files live in `/var/www/spatovaliyski.com/runtime`. The service environment contains only the public Supabase URL/key; owner authentication is checked against Supabase on each editor request. Deploys do not change the web server configuration.

Use `systemctl status portfolio-runtime` and `journalctl -u portfolio-runtime` for runtime problems. `GET /healthz` checks that published Supabase content is readable. A provider failure returns 503 rather than serving repository placeholders. Never set a service-role key in a VITE variable. Content edits go through [content-api.md](content-api.md).
