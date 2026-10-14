# Portfolio content ownership

- Supabase is the source of truth for live content and media. Use the authenticated API documented in `docs/content-api.md` for content edits and uploads.
- Never change `tests/fixtures` or repository media to update the website. Never issue a raw table update that bypasses revision history and live-version activation.
- Application code owns layout, supported content shapes, and custom presentation such as Bausy’s phone layout. Preserve content IDs, section IDs, and gallery order during targeted edits.
- Owner writes require MFA, version checks, validation, and an atomic live save. Do not weaken these to make automation easier.
- Builds are content-independent. Fixture servers are only for explicitly isolated tests; production and ordinary development read Supabase.

<!-- CODEGRAPH_START -->

## CodeGraph

When `.codegraph/` exists, use `codegraph_explore` before grep or file reads to understand or locate code. For details omitted by the graph, read the specific file. Do not create an index automatically.
<!-- CODEGRAPH_END -->
