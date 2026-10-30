# Martin Spatovaliyski’s portfolio

React/Vite frontend, a Cloudflare Worker runtime, and a single-owner editor. Supabase owns content, saved versions, and images. Repository changes deploy application code; editing content never requires a commit or deployment.

## Content editing

Open `/admin/`, sign in, and verify your authenticator. Choose an item, edit its text, dates, or image, and press **Save changes**. The save updates the database and live content atomically. New items remain unsaved until Save. Removed items can be restored from the list’s **Show removed items** option.

The editor has dedicated forms, Markdown formatting previews, image pickers, and a website preview. Existing layouts are code-owned, including Bausy’s phone presentation. Text, image references, and supported content sections are database-owned.

AI tools use the same authenticated API; see [docs/content-api.md](docs/content-api.md). Do not modify test fixtures or issue raw table updates to change live content.

## Local development

Use Node **24.16.0** and npm. Set the public project URL and publishable key in the ignored `.env.local` file using `.env.example`.

```sh
npm ci
npm run dev
```

The development server at `http://127.0.0.1:5173` reads published Supabase content. The editor writes to that same project after owner MFA. No privileged Supabase key is needed on the application server.

```sh
npm run build
npm run start
```

The built runtime listens on `127.0.0.1:4173`. The build packages browser/server code only. It does not load or deploy portfolio JSON files or repository images.

## Deployment

Push application changes to `main`. Cloudflare Builds builds `Spatovaliyski/portfolio-3` with `npm run build` and deploys with `npx wrangler deploy`. The Worker configuration is in `wrangler.json`; it includes the public Supabase URL and publishable key, static code assets, Images binding, and a daily keep-alive schedule. No privileged database key is deployed.

Cloudflare runs the existing HTTP handler through its Node compatibility layer. Supabase remains the content and media source. Cloudflare Images creates responsive uploads; WebAssembly renders PNG share previews. The local Node server remains available for development and preview.

The GitHub deployment workflow only verifies the build and optionally updates Supabase Edge Functions using `SUPABASE_ACCESS_TOKEN`. It no longer uploads or restarts a VPS. Cloudflare owns application deployment.

Only published content is returned by the Supabase read endpoint. Owner APIs require the protected owner account and MFA. Originals are private; responsive WebP files and the downloadable CV live in the public derivative bucket. Public URLs retain the `/media/` prefix.

## Checks and fixtures

```sh
npm run verify
npm run test:browser
```

Tests use isolated PostgreSQL and an explicit local fixture server. `tests/fixtures` and historical `public/media` files support tests; they are not production content sources.
