# Martin Spatovaliyski — Portfolio Implementation Plan

**Prepared:** 12 October 2026  
**Status:** Implementation specification; visual direction defined, final layouts still to be designed.  
**Primary audience:** Senior engineering hiring managers, engineering leads, and recruiters.  
**Required stack:** Vite, TypeScript, React.  
**Recommended backend:** A dedicated hosted Supabase project, following an audit and export of the existing headless WordPress implementation.

## 1. Product objective

Build a portfolio that feels deliberately designed and exceptionally responsive, while giving visitors concrete evidence of engineering judgment, product ownership, and shipped work.

The defining experience is an editorial presentation of real products, supported by precise motion and a restrained but strong color system. Content is readable immediately. Navigation, project inspection, and filtering feel connected and fluid. The site must still work as a collection of ordinary, individually addressable web pages.

This is a portfolio, not a developer analytics product. GitHub activity supports the story; it does not replace case studies or become a measure of seniority.

### Success criteria

- A recruiter can identify your role, strongest work, experience, and contact method within approximately 30 seconds.
- An engineer can inspect a project's constraints, architecture, decisions, personal contribution, and outcomes without guessing what you actually did.
- Every public content page returns useful HTML and correct metadata before JavaScript runs.
- Every public-facing content field is editable through a private admin interface.
- Motion improves orientation and feedback without blocking reading, keyboard interaction, or navigation.
- Publishing and GitHub synchronization require no routine code edits.
- A failed integration, failed build, or backend outage does not remove the last working public website.

### Constraints and exclusions

- No Next.js, Gatsby, Astro, or additional application meta-framework.
- No template, purchased theme, generic component kit, Tailwind, Bootstrap, MUI, or generated dashboard aesthetic.
- No Three.js, WebGL scene, 3D library, animated avatar, particle background, terminal homepage, typing-effect introduction, or cursor replacement.
- No scroll hijacking, mandatory loading intro, endlessly animated gradient backdrop, or hover-only essential information.
- No arbitrary skills percentages, manufactured testimonials, invented qualifications, or unattributed product metrics.
- No requirement to display all historical repositories or all old projects equally prominently.

“Custom built” means custom page layouts, components, styles, content editing flows, and interactions. React, Vite, the official Supabase client, testing tools, and narrowly scoped security or parsing libraries are permitted dependencies. Do not recreate authentication, cryptography, or an extensible framework to avoid a dependency. Default public animation uses CSS and browser APIs rather than an animation library.

## 2. Current-site audit and migration inventory

### What was inspected

The current homepage, `/experience`, `/projects`, `/blog`, the linked resume, and the public WordPress REST API were fetched on 12 October 2026. The browser-readable text and the serialized React page data were examined; the WordPress endpoints supplied the published item counts. This is a content audit, not a repository, plugin, database, or security audit.

The current site identifies itself as Next.js plus WordPress. Its project description references Next.js 13 and a DigitalOcean Ubuntu server. The current frontend repository is linked as [Spatovaliyski/portfolio-next](https://github.com/Spatovaliyski/portfolio-next); it has not been audited for this plan. The public API exposes `work_experience`, `work_projects`, and a `theme-options/v1/opentowork` route. The latter's existence is verified; its response and implementation have not been inspected.

The sampled initial HTML contains navigation and a loading state for the main content, while substantive text also appears in serialized React data. This is not proof of an indexing failure, but the replacement must deliver actual semantic main content in the HTML body without depending on client rendering.

### Existing content to carry forward

| Current source | Verified content | Treatment in the replacement |
| --- | --- | --- |
| `/` | Introduction; React, WordPress, Next.js and UI/UX emphasis; GitHub, LinkedIn and email links | Rewrite around senior engineering, ownership and real products; preserve verified links |
| `/experience` | Crownpeak, Almacena Platform, Freelance / CILECT, DevriX | Retain structured employment history; rewrite responsibilities as evidence-backed outcomes |
| `/projects` | Seven published projects | Import all as drafts; curate their final visibility and placement |
| `/blog` | Three published posts | Preserve useful content and original publication dates; keep legacy URL redirects |
| WordPress pages | Four published pages, including homepage, blog, slider and pricing calculator | Homepage/blog inform content migration; slider/calculator require a relevance review, not automatic publication |
| `https://wp.spatovaliyski.com/resume/` | A PDF CV, despite its extensionless URL | Import source file, replace with an updated CV, and preserve a redirect or compatibility response |
| WordPress media referenced by projects | Screenshots and project artwork | Copy to managed storage, optimize derivatives, add contextual alt text |
| WordPress custom endpoint | Availability-related route | Map the intended behavior to editable availability settings after repository audit |

### Employment history observed on the live site

| Employer | Current published title | Current published dates | Required editorial action |
| --- | --- | --- | --- |
| Crownpeak | Senior Front end Developer | April 2024–Now | Add substantive responsibilities and outcomes; confirm current employer naming and dates |
| Almacena Platform | Sr. Front-End Developer | December 2022–October 2023 | Retain marketplace, internal React/TypeScript tools and visual rebrand work; clarify individual scope |
| Freelance / CILECT | Full-stack / Product Owner | July 2021–November 2022 | Preserve migration, custom theme/plugins and platform ownership; confirm dates against CV |
| DevriX | Front-end Developer & Project Owner | May 2017–June 2021 | Retain delivery ownership and mentoring; verify all numerical claims before republishing |

The linked CV lists CILECT from **June 2021**, whereas the website says **July 2021**. Resolve this discrepancy before publication. The CV omits Crownpeak. It also contains a master's degree from Plovdiv University, specializing in graphic environments and user interfaces, dated June 2021, plus English C1 and native Bulgarian. Import these as editable claims for confirmation; do not invent additional certifications.

The homepage's “over six years” phrasing is outdated. If a duration is displayed, derive it from a confirmed professional start date and define what the duration measures. Prefer a stable statement such as “Building production interfaces since 2017” if confirmed, rather than an annually stale headline.

Old text relates some work to fundraising and organization-wide audience sizes. Fundraising is not a personal engineering outcome. School, staff, student and alumni counts are not platform active-user counts. Do not repackage these numbers as your direct impact without a source and a precise explanation.

### Existing project inventory

| Project | Recommended classification | Visibility |
| --- | --- | --- |
| CILECT | Professional/client project | Candidate for a substantial case study |
| Portfolio v2.0 (Current) | Historical personal project | Archive or combine into a short portfolio-evolution entry |
| Portfolio v1.0 (React) | Historical personal project | Archive |
| Portfolio v1.0 (WordPress) | Historical personal project | Archive |
| Team Gamejam: Sumo & Ning | Pet project / team experiment | Optional pet-project entry; state your contribution |
| Team Gamejam: Granny Goes Deep | Pet project / team experiment | Optional pet-project entry; retain UI contribution attribution |
| League of Legends — Beta Launcher HTML5 Challenge | Historical interface experiment | Archive or exclude from the primary work selection |

### Existing articles

- “Ludum Dare 55: Sumo & Ning — Summoning!” — 17 April 2024; current route `/blog/220`.
- “Improving the interface” — 21 January 2024; current route `/blog/189`.
- “Is anyone there?” — 7 October 2023; current route `/blog/121`.

The replacement should use stable descriptive slugs. Keep these numeric routes as permanent redirects. Read full article bodies during migration; titles alone are insufficient for editorial decisions.

### New content explicitly required

- **Bausy:** A flagship independently owned product, presented in the main Projects collection. Explain product requirements, architecture, release workflow and your actual responsibilities. Current feature details and results must be confirmed before publication.
- **WoW addons:** A separate Pet Projects collection, linked from the homepage and primary navigation. PlateSCT is a named candidate; discover and confirm other addons rather than inventing them.
- **GitHub integration:** Use the account linked by the current portfolio, `Spatovaliyski`, with a curated public repository allowlist.
- **Qualifications:** Editable education, language proficiency and any genuinely held credentials, connected to supporting evidence where available.

## 3. Recommended architecture and the SEO decision

### Decision: pre-rendered React pages with progressive enhancement

Use Vite to produce a public client build and a Node-compatible rendering build. A small project-specific TypeScript build script enumerates published routes and calls React's server renderer to generate complete HTML documents. The production public site is static HTML and assets served by a CDN or Nginx.

This is **static site generation**, using the rendering primitives supported by Vite and React. It does not require a continuously running Node renderer in production, a home-grown meta-framework, or a public client-side router.

Multiple pages alone do not guarantee good SEO; SPAs are not inherently unindexable. The requirement here is full initial HTML, correct URLs, metadata, links and status codes. Static generation satisfies that requirement and reduces runtime load.

### Runtime responsibilities

| Layer | Responsibility | Runs where |
| --- | --- | --- |
| React public pages | Semantic layouts and interactive components | Build renderer, then browser hydration where needed |
| TypeScript pre-render script | Route generation, page data, metadata, sitemap, sanitized content snapshot | Local development and CI |
| Static hosting | HTML, CSS, JS, image delivery, redirects, real 404 responses | CDN or existing Nginx |
| Private React admin | Content editing, previews, media, integrations and publication status | Separate browser entry, optionally separate subdomain |
| Supabase | Content, revisions, published projections, media and owner authentication | Hosted backend |
| Small TypeScript functions | Publication requests, restricted previews, GitHub sync and deployment callbacks | Supabase Edge Functions or selected managed function host |
| CI | Validation, rendering, deployment, health check and rollback support | Existing or selected CI provider |

### Public navigation

- Every public link is a real `<a href>` to a complete page.
- Enable same-origin cross-document View Transitions where supported.
- Use ordinary document navigation when the browser lacks support. Do not simulate it with delayed clicks or a loader.
- Keep browser back/forward, scroll restoration, open-in-new-tab, modified clicks and direct deep links intact.
- React handles interactions inside the current page: filters, accordions, selected screenshots and repository inspection.
- Admin may use client-side navigation because it is private and has no SEO objective. Its bundles must not enter public pages.
- Navigation state is URL-based. No hash-router URLs for public content.

### Build output and correctness

- Generate `/index.html`, `/projects/index.html`, `/projects/bausy/index.html`, and corresponding files for each published route.
- Generate page-specific titles, descriptions, canonical links, Open Graph data and JSON-LD during rendering.
- Embed only sanitized public data; safely escape serialized JSON, including `<`, to prevent closing a script element through content.
- Hydrate with the identical snapshot used by the renderer. No browser-only timestamps, random IDs or immediate backend reads that change the initial tree.
- Use deterministic identifiers and defer browser-dependent behavior until after hydration.
- Fetch provider data during synchronization, never while handling a visitor's page request.
- Serve unknown public paths with HTTP 404, not a blanket `/index.html` fallback.
- The Vite development server and `vite preview` are not production servers.

### Freshness tradeoff

An admin edit does not instantly change static pages. Publishing queues a build and deployment; the admin distinguishes **saved**, **approved**, **building**, **deployed**, and **failed**. Target a normal publish-to-live interval under five minutes on the selected host, and measure it rather than promise it before setup.

GitHub data can sync hourly, with public HTML refreshed approximately every six hours. Optional client enhancement may request a cached public snapshot for newer statistics, but core work and professional content remain in HTML. Display a clear “Updated…” timestamp. Do not rebuild for every commit or fetch GitHub from every visitor.

## 4. Backend choice: WordPress versus Supabase

### Recommendation

Plan for a dedicated hosted Supabase project, but make migration conditional on a short audit of the old repository, custom fields and backend responsibilities. The visible content volume is small. A migration is practical, but Supabase is not a ready-made CMS: the custom editor, revision handling, previews and publishing workflow must be built.

| Concern | Retain headless WordPress | Move to hosted Supabase |
| --- | --- | --- |
| Existing content | Lowest migration effort | Small export/import plus field mapping |
| Editorial interface | Existing WordPress admin can be reused | Custom owner-only admin must be implemented |
| Structured portfolio data | CPTs and existing custom fields | Typed Postgres models and validated content blocks |
| Hosting load | PHP/database workload remains on VPS | Portfolio database/auth/storage offloaded; public site can be static |
| Content revisions | Existing CMS capabilities, subject to actual setup | Explicit implementation required |
| Integration jobs | WordPress plugin/cron or external job | TypeScript functions plus scheduled jobs |
| Maintenance | PHP, WP, plugins and hosting updates | Managed backend plus application schema and security maintenance |
| Long-term portability | WordPress export and media archive | SQL/content export and media archive |

Moving this portfolio off WordPress only saves its marginal resource use. Other WordPress sites may still need PHP and MySQL/MariaDB, so do not claim the whole database service or VPS can be removed. Measure baseline CPU, memory and requests before and after. Self-hosting Supabase on the same VPS would work against the stated offloading goal.

Keep the portfolio backend separate from Bausy's production backend by default. A shared managed project may look convenient but creates unnecessary operational coupling and credential risk. Evaluate any different choice explicitly during implementation.

### Old-repository audit gate

- Identify REST calls, endpoint base URLs, CPT registrations, custom fields and availability settings.
- Identify all WordPress behavior beyond content: forms, redirects, authentication, private files and integrations.
- Confirm which backend code lives in a separate WordPress repository and which exists only on the server.
- Confirm media ownership and whether `wp.spatovaliyski.com` serves anything else.
- Export original content, media, URL inventory and relevant configuration before migration.
- If significant reusable CMS functionality is discovered, keep WordPress behind the same content contract for the first release and reconsider migration separately.

The public components consume a single typed `PortfolioContent` snapshot, not WordPress response objects or Supabase rows. Implement the chosen content loader behind that contract. Do not build two complete live CMS implementations “just in case”; the WordPress importer can be a one-time tool.

## 5. Information architecture and page contracts

### Route map

| Route | Purpose | Required content |
| --- | --- | --- |
| `/` | Concise first impression and strongest evidence | Positioning, Bausy feature, selected work, pet-project teaser, GitHub summary, experience and contact |
| `/projects/` | Professional and product work | Curated list with ownership, summary, status and technologies |
| `/projects/:slug/` | Full project case study | Problem, scope, constraints, decisions, architecture, evidence and results |
| `/pet-projects/` | WoW addons and selected experiments | Distinct collection with purpose, links, maintenance and release information |
| `/pet-projects/:slug/` | Individual addon or experiment | What it does, your implementation, constraints, distribution and verified metrics |
| `/experience/` | Employment and qualifications | Timeline, actual responsibilities, skills with evidence, education and languages |
| `/about/` | Personal engineering approach | Short biography, working style and current interests |
| `/github/` | Deeper public development evidence | Curated repositories, commits, releases, activity and metric explanations |
| `/notes/` | Technical articles and engineering notes | Published list, filters and related projects |
| `/notes/:slug/` | Individual article | Readable content, dates, code, source links and related work |
| `/contact/` | Recruitment and collaboration contact | Email, professional links, availability and optional form |
| `/resume/` | Quick review and CV download | Compact HTML career summary and current PDF |
| `/privacy/` | Explain actual site data handling | Content matching implemented analytics/contact behavior |
| `/404` response | Missing-content recovery | Clear message and useful links; actual HTTP 404 |
| `/admin/` | Owner-only CMS | Separate private application entry; never in sitemap |

Use a small primary navigation: **Work, Pet Projects, Experience, About, Contact**, plus a visible CV action. GitHub and Notes are secondary links available through the footer and relevant homepage sections. Hide an empty Notes collection from navigation until it has useful published content.

### Homepage hierarchy

1. **Positioning:** Name, specific engineering focus, a short statement, “Explore work” and “Get in touch”. No technical buzzword wall.
2. **Flagship product:** Bausy as an editorial feature with a real product image, ownership statement and a short problem/outcome summary.
3. **Selected professional work:** One or two additional entries, such as CILECT or a publishable employment case study, with clear scope.
4. **Pet projects:** Compact WoW-addon collection; label the category explicitly. Mature execution is welcome, but it is not employer work.
5. **Engineering approach:** Three short principles linked to actual decisions or case-study sections.
6. **GitHub pulse:** A few repositories or releases and a restrained activity summary linking to `/github/`.
7. **Experience and contact:** Recent career context, CV, availability and direct contact.

The homepage should not contain a full repository browser, complete CV, full blog index, skill cloud and analytics dashboard stacked together.

### Case-study content contract

Each publishable case study contains:

- Title, category, status, dates, collaborators and your exact ownership.
- A short summary that remains useful without opening the full page.
- User/business problem and what success meant.
- Constraints: time, legacy systems, platform APIs, team size, performance, accessibility or budget where relevant.
- What you personally designed, implemented, maintained or contributed to.
- Architecture represented with a custom SVG/HTML diagram and an equivalent text explanation.
- Two to four consequential decisions, alternatives considered and tradeoffs.
- Screenshots or short recordings that demonstrate the product, with captions.
- Outcomes supported by a source, measurement period and caveat where needed.
- A difficult problem, resolution and lesson learned.
- Current maintenance state, relevant links and optionally release history.

**Bausy:** Build a product-engineering narrative. Candidate topics include pet-care workflows, cross-platform React/Capacitor delivery, data access, family sharing, reminders, subscriptions and releases. These are prompts to confirm against the current code/product, not assertions to copy blindly. A closed-source repository is acceptable: publish approved architecture and evidence without requiring code access.

**WoW addons:** Explain gameplay use, WoW version support, API constraints, performance considerations, configuration, distribution and maintenance. For PlateSCT, verify current capabilities and limitations before describing them. Label download counts by distribution platform; do not equate them with active users.

**CILECT:** Focus on migration, custom content models, user access, legacy content and ongoing ownership. Confirm what can be publicly shown, and distinguish the client organization's scale from measured application usage.

## 6. Visual system: strong color, minimal structure, depth in details

### Proposed direction: editorial engineering with cobalt and ember

Use warm pale surfaces, dark ink typography, saturated cobalt fields, and small ember accents. Depth comes from tonal layers, image treatment, whitespace, typography and interaction—not 3D or excessive shadows.

This is a starting art direction with concrete tokens, not a final page mockup. Validate it with the homepage and Bausy case study before expanding every page.

### Color tokens

| Token | Initial value | Intended use |
| --- | --- | --- |
| `--canvas` | `#F5F2EC` | Main warm background |
| `--surface` | `#FFFFFF` | Selected panels and image framing |
| `--surface-muted` | `#E9E5DE` | Quiet secondary sections |
| `--ink` | `#161923` | Main text and primary dark surfaces |
| `--ink-muted` | `#525866` | Secondary text on pale surfaces |
| `--border` | `#D3CEC5` | Decorative dividers; not sufficient alone for every control |
| `--control-border` | `#737984` | Necessary input/control boundaries on pale surfaces |
| `--cobalt` | `#2445E8` | Primary action, links and selected color fields |
| `--cobalt-deep` | `#172A87` | Stronger depth and active states |
| `--cobalt-pale` | `#E6EBFF` | Tinted backgrounds |
| `--ember` | `#B63E12` | Small secondary emphasis and pet-project detail |
| `--ember-pale` | `#FCE9DE` | Warm tinted surfaces |
| `--positive` | `#176947` | Status, with text/icon equivalent |
| `--negative` | `#A82435` | Errors, with text/icon equivalent |

Suggested combinations: ink on canvas, white on cobalt, cobalt on white, and ember on warm pale surfaces. All real combinations, including hover/focus/disabled states, must pass contrast validation. These tokens are proposals, not a blanket accessibility certification. Charts and screenshot imagery have separate evaluation rules.

Use a strong dark surface for at most a few deliberate moments, not an indiscriminate dark-mode clone. A full light/dark switch is P1, unless the design phase establishes it as essential. Version 1 may launch as a polished single theme; reduced motion and sufficient contrast are mandatory from day one.

### Typography

- Provisional pairing: a self-hosted variable **Manrope** for identity/headings and **Source Sans 3** for body copy, subject to licensing and rendering verification.
- Use a small monospaced face only for code, commit references and selected metadata; do not make the entire site resemble an IDE.
- Base text approximately 17–18 px with line-height 1.55–1.7. Long-form width approximately 65–72 characters.
- Headline sizing with `clamp()`, approximately 40–92 px depending on available width. Test the full surname on narrow screens.
- Scale differences and strong weight create hierarchy; uppercase micro-labels are supporting elements only.
- Subset fonts to required languages, serve WOFF2 and avoid unnecessary font weights or preloads.

### Layout and material detail

- Content shell approximately 1280 px; fluid gutters 20–64 px depending on viewport.
- Use a 4 px base spacing system with larger editorial gaps: 24, 32, 48, 64, 96 and 128 px.
- Use CSS Grid, Flexbox and container queries for actual content constraints.
- Prefer large editorial project rows, alternating image/text compositions and full-width color moments to a repeated three-column card grid.
- Do not force every project into a bento grid or wrap every paragraph in a rounded card.
- Use one consistent radius family: modest radii on controls, slightly larger on media, restrained pill treatment for metadata.
- Depth: subtle inset edges, layered tint, hairline separators, controlled shadows and occasional static texture. Avoid animated blur or filters over large screen areas.
- Screenshots should look like real product evidence. No fake app features, decorative charts or stock-code screenshots.
- Decorative grain, if used, is faint, static and excluded from accessible content.

### Responsive behavior

- Validate at 320, 375, 768, 1024, 1440 and 1920 CSS px; breakpoints follow layout needs rather than device names.
- Desktop asymmetry becomes a deliberate reading order on mobile.
- Images retain useful focal points; provide mobile crops where a wide screenshot would become unreadable.
- Side-by-side technical detail becomes stacked content, not compressed columns.
- Timelines become readable vertical lists. Repo filters remain usable without dragging.
- Navigation uses a real button and an accessible menu/disclosure. No gesture-only close behavior.
- Hover effects only activate for hover-capable pointers. Touch and keyboard users receive equivalent feedback.
- No fixed-height hero that clips translated text, browser zoom or mobile landscape.

## 7. Motion specification

### Motion principles

Animation is a system with defined durations, easing, triggers and fallbacks. It should look precise and calm, not like a collection of unrelated demo effects.

- Prefer `transform` and `opacity`; avoid continuous layout changes.
- Let input respond immediately. An animation may finish after the user's action, but must not delay the action.
- Motion follows relationships: a selected project image can become its case-study image; a filter changes a list; a disclosure expands its content.
- Content is visible by default. Enhancement may animate it, but an exception or disabled JS must never leave it transparent.
- Use CSS transitions/keyframes, Web Animations API and IntersectionObserver. Add a library only for an established requirement these do not meet cleanly.
- Stop and clean up observers/animations when components unmount or leave the active state.

### Motion tokens and interaction contracts

| Interaction | Starting specification | Constraints |
| --- | --- | --- |
| Button/link feedback | 120–180 ms color/underline/translate response | No pointer-following requirement; visible focus equivalent |
| Menu/disclosure | 180–240 ms opacity plus small translation | Close with Escape where appropriate; correct focus handling |
| Section entrance | 280–420 ms, maximum 12–20 px travel | Once per page session; only a few groups, not every paragraph |
| Group stagger | 35–55 ms between a small group | Total added delay under approximately 180 ms |
| Project image hover | 220–320 ms, scale no more than about 1.02 | Hover-capable devices only; no layout change |
| Page transition | 180–280 ms cross-document fade/translation | Real navigation; unsupported browsers navigate normally |
| Shared project image | 240–360 ms View Transition | Unique transition names; correct back navigation; ordinary fallback |
| Filtered list | 180–240 ms keyed item change | Stable focus; URL state; immediately updated result summary |
| Screenshot selector | 180–240 ms crossfade | Reserve dimensions; accessible controls; no autoplay |

Starting easing: `cubic-bezier(0.22, 1, 0.36, 1)` for entrances and `cubic-bezier(0.4, 0, 0.2, 1)` for short state changes. Final tuning should be done on real content and a midrange phone.

### Signature details

1. **Project-to-case-study continuity:** A selected project's media and accent treatment connect across actual page navigation using native View Transitions where available. Use `pageswap`/`pagereveal` only if needed to scope names to the chosen item and keep them unique.
2. **Precise editorial reveal:** A section label, headline and media enter as a small coordinated group. Main introductory text is readable immediately and never waits for an intro sequence.
3. **Repository inspection:** Expanding a repository reveals relevant commits/releases with a stable reading order. It does not open a fake terminal.
4. **Color continuity:** The flagship project accent appears in its detail page and related links while global navigation remains consistent.

No animation is required to reach these pages or understand their content.

### Reduced motion and low-power behavior

- Respect `prefers-reduced-motion` on first render and when it changes.
- Disable shared-element travel, parallax, animated list rearrangement, smooth scrolling and unnecessary entrances under reduced motion.
- For cross-document transitions, remove the opt-in or disable transition animations under reduced motion; do not assume disabling component animations handles page transitions too.
- Preserve immediate color/focus feedback and static hierarchy.
- Native scrolling is the default. No Lenis/Locomotive scroll layer for version 1.
- No perpetual requestAnimationFrame loop, background video or continuous decorative animation.
- Verify back-forward cache behavior, page restoration, keyboard navigation and rapid repeated interactions.

## 8. Accessibility requirements

Target WCAG 2.2 AA for the public site and admin. Automated checks help, but do not constitute full conformance verification.

- Semantic header, navigation, main and footer; a working skip link; meaningful heading hierarchy and one page-identifying h1.
- Native buttons for actions and links for navigation. Label icon-only controls.
- Visible focus on all interactive elements, with sufficient contrast and no clipping by sticky elements.
- Logical tab order and accessible names matching the visible interface.
- Text contrast at least 4.5:1 for normal text and 3:1 for large text; required control boundaries and meaningful graphical objects meet applicable non-text contrast requirements.
- Aim for approximately 44×44 px interaction areas on principal controls. Meet WCAG's 24×24 px minimum criterion or its defined exceptions for smaller targets.
- No important content or action accessible only through hover, color, drag, animation or a tooltip.
- Tooltips work on keyboard focus, are dismissible and do not contain the only copy of essential information.
- Use native `<dialog>` when a modal is justified; test focus containment, Escape, return focus and mobile behavior. Do not use dialogs for every detail page.
- Form labels, instructions, inline errors, error summary and success states are announced appropriately.
- Accordions expose expanded state and retain content in a sensible document order.
- Images have meaningful contextual alt text, or empty alt text when decorative. Videos have captions/transcripts as applicable.
- Architecture diagrams have a text explanation. Charts have summaries and access to the underlying values.
- Contribution calendars offer a readable table/list alternative. Do not create hundreds of default tab stops; use a well-tested roving interaction or a simpler selectable month view.
- Validate 200% zoom, 400% reflow where applicable, forced-colors mode, text spacing and portrait/landscape use.
- Essential reading and navigation work without JS; advanced interaction may simplify to links or static content.
- Verify with keyboard, NVDA on Windows and VoiceOver on an Apple device when available.

## 9. Content model and editable surface

### What “everything editable” means

All public copy, project content, ordering, visibility, media, navigation labels, links, qualifications, availability and SEO fields are editable. Controlled design tokens and selectable presentation variants may also be edited.

The admin does not execute arbitrary JavaScript, inject CSS, upload React components or become an unrestricted page builder. Structural changes and new interaction types remain code changes. This boundary keeps the site coherent, safe and maintainable.

### Domain entities

| Entity | Principal fields |
| --- | --- |
| Profile | Name, positioning, short/long bio, location, verified start date, contact links, availability, CV media reference |
| Site settings | Site title, navigation/footer labels, section ordering/visibility, palette preset, approved token overrides, default SEO, social image |
| Project | Slug, title, classification, summary, status, ownership, dates, featured order, blocks, technology references, links, media |
| Experience | Employer, role, start/end, current flag, employment type, location, summary, achievement bullets, related work |
| Qualification | Kind, title, institution, dates, credential URL, optional verification note |
| Language | Name and confirmed proficiency; avoid inferred levels |
| Skill | Label, category, narrative level, linked project/experience evidence, optional last-used date |
| Note | Slug, title, summary, blocks, tags, original publication date, modified date, related work |
| Project metric | Key, value, unit, source, source URL, measurement period, fetched/verified date, explanatory note |
| Media asset | Private/public paths, MIME type, dimensions, file size, derivatives, default alt, caption, rights/source |
| Repository curation | GitHub repository ID, display/featured flags, sort order, description override, linked project, exclusions |
| Content revision | Entity identity, versioned content, schema version, author, saved time, publication state |
| Publication release | Immutable public snapshot, release ID, content version, created time, build/deploy state, deployed time |
| Redirect | Old path, new internal path, status, reason |

Use relational columns for searchable identifiers, dates, classification and references; use versioned JSON for structured page blocks. Validate at database/function boundaries as well as in forms. Use unique slugs, foreign keys and explicit sort ordering. Store timestamps in UTC and date-only career fields as dates. Use stable repository IDs rather than names as identity.

### Content blocks for version 1

Custom-built forms and renderers support: prose, section heading, image with caption, image pair/gallery, ownership/summary panel, metric with provenance, decision record, code excerpt, architecture diagram with text, link group and related project.

Store prose as structured text/inline marks or a vetted Markdown format with raw HTML disabled. No executable MDX or untrusted HTML embeds. Syntax highlighting may happen during the build using a narrowly scoped parser/highlighter. Never use raw `dangerouslySetInnerHTML` on imported or edited content without explicit sanitization.

Make ordering accessible with Move up/Move down controls. Drag-and-drop may be an enhancement, never the only method. Version the block schema so later editor updates can migrate old content.

### Example public TypeScript contracts

```ts
type ProjectKind = 'product' | 'professional' | 'pet-project' | 'archive';
type ProjectStatus = 'active' | 'maintained' | 'completed' | 'experimental' | 'archived';

interface VerifiedMetric {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  source: 'manual' | 'github' | 'distribution-platform';
  sourceUrl?: string;
  measuredFrom?: string;
  measuredTo?: string;
  verifiedAt: string;
  note?: string;
}

interface PublicProject {
  id: string;
  slug: string;
  title: string;
  kind: ProjectKind;
  status: ProjectStatus;
  summary: string;
  ownership: string;
  blocks: ContentBlock[];
  metrics: VerifiedMetric[];
  repositoryIds: string[];
}

interface PortfolioContent {
  schemaVersion: number;
  releaseId: string;
  generatedAt: string;
  profile: PublicProfile;
  settings: PublicSiteSettings;
  projects: PublicProject[];
  experience: PublicExperience[];
  qualifications: PublicQualification[];
  notes: PublicNote[];
  github: PublicGitHubSnapshot;
}
```

`ContentBlock` and the remaining public types must be defined as validated contracts during foundation work. Internal fields, emails not selected for publication, draft data and provider payloads do not belong in this public snapshot.

## 10. Private admin and security model

### Authentication and authorization

- Provision exactly one owner account through a trusted setup path. Disable public signup and anonymous account creation; expose no registration UI.
- Identify the owner by Supabase user UUID in a protected authorization record, not by a browser flag or a submitted email address.
- Use Supabase Auth with strong credentials and TOTP MFA. Define a recovery procedure before enabling MFA.
- Restrict content reads, writes, publishing, uploads and sync controls to the owner. MFA assurance must be checked by policies/functions for sensitive operations, not merely by the UI.
- Enable row-level security on exposed tables. Default deny; grant only the exact required operations.
- Test unauthenticated, unrelated authenticated, owner without required MFA, and owner with MFA contexts.
- Admin route obscurity and `noindex` are not access controls. Protect underlying data independently.
- Use the official auth client and supported session flows. Do not implement custom password storage or crypto.

### Draft isolation

Keep working drafts, internal notes, audit events and revision history in private tables/schema. Public APIs expose only an explicit sanitized publication projection, never whole editable rows whose status happens to be `published`.

Editing a published item creates a new working revision; it does not mutate live content. Store published media separately from private draft uploads. A public Storage bucket is publicly retrievable by URL; hiding a link or using an RLS listing rule does not make its file private.

### Admin sections

- Dashboard: pending edits, latest publication, failed jobs, media warnings and GitHub freshness.
- Profile and site settings: all public identity, navigation and availability fields.
- Projects and Pet Projects: same underlying model, distinct lists and classification constraints.
- Experience, qualifications and skills: structured records and evidence associations.
- Notes: block editor, related projects, metadata and original dates.
- Media: uploads, derivatives, alt text, usage references and replacement history.
- GitHub: account, public repository allowlist, featured ordering, exclusions and sync status.
- Publication: draft preview, release diff, validation, publish/retry, active release and rollback.
- Redirects: legacy mapping and slug-change assistance.

### Editor behavior

- Draft autosave with a visible save status, debounced writes and an explicit Save action.
- Detect conflicting saves using an expected revision/version value. Do not silently overwrite another tab's newer work.
- Warn about unsaved changes when appropriate.
- Preview with the actual public components using authenticated draft data. Preview responses use `no-store` and `noindex` and must not populate public caches or sitemaps.
- Preview at mobile/tablet/desktop widths without claiming it replaces real-device tests.
- Publish validation: slug conflicts, missing alt/captions where required, invalid links, missing ownership, incomplete metric provenance and unsafe blocks.
- Maintain an audit trail of save, publish, media replacement and rollback actions.
- Delete through an archive/trash workflow where practical; show incoming references before removing media.
- Editable palette overrides must use validated color values and contrast checks for supported combinations. Arbitrary CSS is rejected.

### Credential boundaries

Only the backend URL and public/publishable key may appear in browser configuration, with RLS providing the actual authorization boundary. Supabase secret keys and legacy service-role keys, GitHub tokens, build trigger credentials and deployment callback secrets stay server-side. Never use a `VITE_` variable for a secret because those values enter browser builds.

Functions authenticate callers, verify ownership and MFA where required, validate input, apply rate limits, and return minimal responses. A backend credential that bypasses RLS does not exempt the function from authorization checks. Jobs use distinct machine credentials; browser-supplied machine tokens are not supported.

Allowlist origins and redirect URLs. If a cookie-authenticated deployment is selected, add appropriate CSRF defenses; CORS alone is not a CSRF defense. Sanitize logged errors and avoid logging tokens or full private provider payloads.

## 11. GitHub integration specification

### Required experiences

1. Curated repository explorer with description, languages, stars, forks, archival state and relevant links.
2. Recent owner-authored commits for selected public repositories, linked to source.
3. Recent releases and merged public pull requests where relevant.
4. Activity visualization with explicit scope and time range.
5. Featured repository selection controlled by you, independent of star counts.
6. A most-active repository view with a documented definition.
7. Technology/language distribution with a clear explanation of what is measured.
8. Connections from a repository to its portfolio project and case study.
9. Freshness, unavailable, stale, empty and incomplete-data states.

### Provider and acquisition policy

Use GitHub's documented REST and GraphQL APIs from a TypeScript sync function. Use REST for repository/commit/release data where suitable; GraphQL can retrieve contribution data and reduce multi-request aggregation. Verify the current API schemas during implementation rather than copying old PushEvent assumptions.

Start with a public-only, least-privilege credential compatible with the selected endpoints. Do not grant private-repository access for a public portfolio. GitHub App authentication is an option if the permission/lifecycle requirements justify it; a carefully scoped token is reasonable for this single-owner use case.

Do not scrape profile HTML or rely on a third-party stats image. Do not assume an existing API token is suitable. Secrets are configured through the server deployment process, never stored as an editable plaintext CMS field.

### Data definitions and honest labels

| Display | Definition | Important boundary |
| --- | --- | --- |
| Featured repositories | Manual ordered selection | Editorial importance, not popularity ranking |
| Most active repository | Highest count of distinct owner-authored default-branch commits in selected public repos over the last 90 days | Only show a definitive ranking after complete scoped backfill; otherwise label observed/partial activity |
| Recent commits | Selected public commits attributed to the owner by provider identity or verified configured aliases | A push is not a commit; do not include other authors as your work |
| Contributions | Provider-defined contribution types for a specified window | Not equivalent to all commits, productivity or engineering skill |
| Language distribution | Language byte counts across the selected repositories | Code composition, not time spent or personal competence |
| Stars/forks | Current repository metadata | Popularity signals, not adoption/active users |
| Downloads | Named platform totals over a stated period | Not GitHub clones, unique users or product retention |
| Latest activity | Latest matching record in the defined dataset | Repo `updated_at` alone is not proof of code work |

Deduplicate commits by repository identity plus SHA and decide merge-commit inclusion explicitly. Keep the attribution policy and exclusions versioned. GitHub language data does not reliably identify every framework: React, Capacitor and Supabase belong in manually curated project technologies backed by code, not inferred language percentages.

### Activity calendar and privacy

- A GitHub aggregate contribution calendar and a selected-repository commit calendar are different datasets. Name them accordingly.
- Do not offer repository filtering on an aggregate calendar unless the underlying data supports it.
- Prefer a selected-public-repository calendar for filtered views; a day contains distinct matching records using a documented timezone, initially UTC.
- A provider aggregate may include restricted/private contribution counts when the user has chosen to share them. Never assume a public-looking calendar has only selected public work.
- Enable the aggregate calendar only after verifying the response scope and the owner's explicit display choice. Never expose private repository names, messages, counts by repository or raw restricted payloads.
- If public-only aggregates cannot be guaranteed, use the scoped public activity calendar instead. Do not subtract a yearly private total from individual days and pretend the result is accurate.
- Provide an accessible month/list view, dates, values and a legend; never communicate counts through color alone.

### Synchronization pipeline

1. Read configured account and approved public repository IDs.
2. Acquire a job lock and create a sync-run record.
3. Fetch metadata with pagination and conditional requests where supported.
4. Fetch bounded commit histories, releases and public PR records. Initial 90-day backfill may be queued in chunks; later runs use overlapping incremental windows for safe reconciliation.
5. Check repository visibility at every sync. Repositories made private or removed from the allowlist must be removed from public projections and trigger a public-data rebuild/purge.
6. Normalize to minimal typed records, validate and deduplicate.
7. Save raw diagnostic data only if necessary, privately and with short retention; never return it publicly.
8. Stage the result and atomically promote it as a coherent snapshot after required sections validate.
9. Record completeness, coverage window, timestamps and failures. Independently failing optional sections retain their previous version with their own timestamp.
10. Queue a public refresh on the schedule or on a selected meaningful release.

Do not combine an empty new section with a previous section and label the entire result freshly synchronized. Track successful freshness per dataset.

### API limits, errors and history

- GitHub's Events API is not a complete historical log or a real-time stream; current documentation caps timelines at 300 events and excludes events older than 30 days. Use commit/release/PR APIs and stored snapshots for the required history.
- Respect primary and secondary limits; use limit/reset/Retry-After information where available, bounded concurrency, jittered backoff and deadlines.
- Do not hardcode an assumed quota as a guarantee for all authentication modes.
- Handle partial GraphQL errors, inaccessible/deleted repos, renamed repos, revoked tokens, timeouts and invalid payloads.
- Never convert a sync failure to zero commits or zero stars.
- GitHub being unavailable must leave project content and the last successful snapshot usable.
- One pending job per account; owner-triggered sync is rate-limited and shares the lock.
- Initial history: 90 days of scoped commits and up to 12 months of provider aggregate data if safely enabled. Record a coverage start date. Stored trend history begins when collection actually starts unless a reliable backfill source exists.
- Store daily metric snapshots; use a proposed retention of 24 months for small aggregates and 12 months for normalized activity, configurable after measuring size. Do not retain verbose provider payloads indefinitely.
- If a repository becomes private, purge both API projections and generated pages containing its data; document that previously public external copies cannot be recalled.

### UI details

Support text search, language filter, status filter, sort and pagination or “Show more”. Store useful filter state in query parameters. Apply the initial query state during rendering for known collection routes or enhance after load without hiding the base list. Canonicalize filter combinations to the unfiltered collection unless deliberately creating indexable pages.

Show scope and timestamps beside summaries. Use readable commit summaries with safe text rendering and direct GitHub links. Collapse noisy dependency/bot activity only through explicit configured rules. Distinguish an author's commit from an open-source PR and a repository-wide release.

## 12. Publication, deployment and operational contracts

### Publication workflow

1. Owner saves working revisions; public release remains unchanged.
2. Owner previews, then requests publication with the expected revision identifiers.
3. Backend validates authorization, content, routes and media; generates an immutable sanitized release snapshot.
4. A protected queue/trigger starts CI with the release ID. Coalesce redundant queued publications while preserving the latest approved snapshot.
5. CI retrieves only the approved release through a restricted machine endpoint, builds all public pages and performs essential checks.
6. Deploy an immutable candidate version, run a smoke check and atomically activate it using the selected host's capabilities.
7. An authenticated, idempotent callback confirms deployment. Admin records the active content release and build identifier.
8. On failure, retain the last active website and show a clear retryable failure. Rollback selects a previously deployed immutable release.

Changing a draft during a build must not change that build's input. A deployed callback must not mark a newer draft as published. Prevent an older build completing later from replacing a newer approved deployment through ordered activation or a latest-release guard.

The public content API exposes the active release, not working drafts or queued snapshots. Store candidate snapshots privately; machine access is scoped to the requested approved release. Account for the brief deployment/API handoff by making public datasets version-addressable and avoiding mixed-version hydration.

### Hosting decision

Prefer managed static hosting if it provides clean URLs, redirects, headers, immutable deploys, a secure CI trigger and rollback. Otherwise serve the generated site from the existing Nginx instance using release directories and an atomic symlink switch. This removes the portfolio's continuously running Next.js process without requiring a move of every domain.

Select the provider after checking actual current limits and pricing. No paid-plan cost is assumed in this specification. Record all recurring expenses in euros. Consider build-minute limits, database availability, storage/egress, backup features and project pausing behavior before relying on a free tier.

### Operational requirements

- Separate development and production configuration; preview builds cannot write production data.
- Pin supported dependency versions and the runtime after checking compatibility. Commit a lockfile.
- Run formatting/linting, TypeScript checks, important tests and public rendering in CI.
- Structured logs for sync, publication and deployment with correlation IDs, without secrets.
- Admin shows last successful sync, last deployed release and actionable failures.
- Privacy-conscious analytics, if enabled, should answer useful questions such as case-study visits and contact/CV actions; do not add trackers by default.
- Back up database exports/content and original media. Provider database backups may not include actual Storage objects; verify both.
- Keep an independent export and test restoring a small representative dataset before launch.
- Version SQL migrations and content schema; document recovery, rotation and deployment rollback.
- Support export of content as JSON plus a media manifest; this is for portability, not a public exposure endpoint.

## 13. SEO, assets, contact and performance

### SEO

- Unique descriptive titles and descriptions per published route; proper document language.
- Canonical URLs with a consistent trailing-slash policy and domain redirect policy.
- XML sitemap generated from the same active content snapshot; meaningful modification dates.
- Robots configuration excludes admin and previews; authentication still protects them.
- Person/ProfilePage, Article and breadcrumb structured data only where appropriate and factually supported. Do not invent ratings or misuse product/review schema.
- Project-specific Open Graph images; social previews must work without JavaScript.
- Original article dates preserved; edits use a separate modified date.
- Old URLs redirect once to their closest valid equivalent; avoid chains and mass redirecting unrelated content to the homepage.
- `/blog/220`, `/blog/189` and `/blog/121` map to the confirmed new article slugs.
- `/projects` and `/experience` remain valid collection URLs.
- Internal links connect skills, case studies, notes and repositories.
- Publish language variants only when their content exists; add `hreflang` when real equivalents are available. English is the default; Bulgarian is P1.

### Media pipeline

- Validate file types, size and dimensions on upload. Reject unsafe active-content uploads, including unsanitized SVG/HTML, unless a dedicated safe pipeline is implemented.
- Preserve originals privately; create optimized public variants with versioned filenames.
- Generate appropriate AVIF/WebP variants with a fallback where needed, `srcset`, `sizes` and explicit dimensions.
- Eager-load only important first-screen imagery; lazy-load below-fold media.
- Do not lazy-load the likely LCP image or decode every gallery image eagerly.
- Use poster images and click-to-play video, with captions/transcripts where applicable. No auto-playing product recordings.
- Media replacement must not overwrite an object still needed by a previous release or rollback.
- Strip sensitive image metadata where appropriate; screenshots must not contain customer data, secrets or unapproved employer material.
- CV upload accepts the expected safe document format; the HTML resume remains usable without the file.

### Contact

P0: direct email, LinkedIn and optional availability information. This is sufficient for a hiring-oriented portfolio and has fewer moving parts than a contact service.

P1: a custom accessible form with server-side validation, rate limiting, an unobtrusive spam strategy, delivery monitoring and an explicit data retention policy. Never put delivery-provider credentials in the browser. Do not build a message inbox, booking platform or CRM for version 1.

### Performance budgets

These are project acceptance targets, not measured results of an unbuilt site.

| Measure | Starting target | Measurement |
| --- | --- | --- |
| LCP | ≤2.5 seconds | Mobile lab at launch; field 75th percentile when enough samples exist |
| INP | ≤200 ms | Real interaction/field measurement when sufficient data exists; lab interaction checks before launch |
| CLS | ≤0.1 | Lab and field when available |
| Initial public JavaScript | ≤120 KiB compressed where practical | Per-route production build report; exclude separately loaded admin |
| Initial public CSS | ≤35 KiB compressed | Per-route production output |
| First-screen image | Aim ≤200 KiB | Actual chosen responsive image, with justified quality exceptions |
| Fonts | Aim ≤150 KiB initially transferred | Subset files used by that page |
| Animation responsiveness | No repeatable long main-thread stalls in representative flows | Browser trace on a midrange phone; inspect >50 ms tasks |

If a budget is exceeded, record why and reduce the cost before adding more effects. Public pages must not ship the admin editor, Supabase admin client, full syntax-highlighting engine or chart library unnecessarily. Prefer CSS/SVG for small charts and diagrams. The design must survive slow networks and failed optional scripts.

## 14. Implementation structure and dependency policy

Use one repository with clear folders rather than a monorepo build system for this small project.

```text
src/
  public/             Page components and public interactions
  admin/              Private editor and owner workflows
  components/         Custom shared presentational components
  styles/             Tokens, foundations, motion and component styles
  domain/             Public types, content blocks and validation
  content/            Chosen content loader and snapshot normalization
  entry-client.tsx    Public hydration entry
  entry-server.tsx    Pure page renderer for generation and preview
  entry-admin.tsx     Separate admin entry
scripts/
  prerender.ts        Enumerate routes and write complete HTML
  import-wordpress.ts Idempotent migration importer
  validate-content.ts Snapshot/content checks
supabase/
  migrations/         Versioned schema, grants and policies
  functions/          Sync, publication, preview and callbacks
tests/
  domain/             Content, attribution and metric behavior
  security/           RLS, draft isolation and authorization
  browser/            Critical public/admin flows
docs/
  operations.md       Publish, backup, restore, rotation and rollback
```

The tree describes responsibilities, not a requirement to create empty files or abstractions. Adjust entry points to the pinned Vite version after the initial proof of concept.

- Strict TypeScript; avoid `any` at provider and content boundaries.
- CSS Modules or disciplined component styles plus global tokens/reset. No utility framework.
- Local component state by default; no global state library unless a demonstrated flow requires it.
- Native `fetch` for cached public data; the official Supabase client for authenticated admin access.
- No public React Router requirement. A focused admin router is optional; ordinary tabs/pages also suffice.
- Vitest for consequential domain logic and Playwright plus axe for browser checks.
- Add a schema validator/sanitizer where needed; do not build a permissive home-made HTML sanitizer.
- No architectural “platform” layer, plugin system or custom framework for a few page types.

## 15. Implementation phases and acceptance gates

### Phase 0 — Repository audit and content decisions

- [ ] Obtain the old frontend and WordPress backend source or a backend export.
- [ ] Inspect actual API/field/plugin dependencies and establish migration scope.
- [ ] Export public/private content, originals, CV and legacy URLs through authorized access.
- [ ] Confirm employment dates, qualifications, contact details and current CV.
- [ ] Choose featured professional work and confirm what employer/client material is publishable.
- [ ] Gather Bausy and addon evidence: screenshots, ownership, architecture, releases and verified results.
- [ ] Record VPS resource baseline and choose WordPress retention or hosted Supabase.

**Gate:** An item-by-item import map, confirmed route inventory and list of missing editorial material exist. No silent assumptions about custom fields or unverified achievements.

### Phase 1 — Rendering and security proof

- [ ] Create the Vite/React/TypeScript setup with public, rendering and admin entries.
- [ ] Generate two complete pages and a real 404 using fixture content.
- [ ] Verify deep links, metadata, no-JS content, hydration and normal navigation.
- [ ] Prove cross-document transition enhancement and unsupported/reduced-motion fallbacks.
- [ ] Create Supabase schema/migrations, owner provisioning and restrictive policies if Supabase is selected.
- [ ] Prove owner-only draft access and public projection isolation with an actual unauthorized request.

**Gate:** The stack can serve crawlable pages without a persistent rendering process; authorization protects content independently of route UI.

### Phase 2 — Visual foundation and motion prototype

- [ ] Design and implement the homepage and Bausy detail page with real-length content.
- [ ] Establish color/typography/spacing and accessible control tokens.
- [ ] Build custom navigation, project rows, buttons, media frames and long-form typography.
- [ ] Implement the signature project transition and coordinated section entrances.
- [ ] Validate mobile, keyboard, reduced motion, slow network and image layout stability.
- [ ] Check bundle and interaction costs before scaling to the remaining pages.

**Gate:** Both pages feel distinctive and work across the key viewports. The public content is not waiting on animation.

### Phase 3 — Content backend, admin and publication

- [ ] Build structured editing for profile/settings, projects, experience, qualifications, skills and notes.
- [ ] Build private media uploads, safe derivatives, references and alt/caption editing.
- [ ] Add revision-aware saves, draft previews and publish validation.
- [ ] Implement immutable releases, protected CI trigger, callback and active-release tracking.
- [ ] Validate failed build, repeated publish, stale save, out-of-order callback and rollback behavior.
- [ ] Import WordPress records idempotently using source site/type/ID as identity.

**Gate:** You can edit, preview and publish a case study without changing source files; drafts and private assets cannot be fetched anonymously.

### Phase 4 — GitHub integration

- [ ] Configure the public account and approved repositories.
- [ ] Implement typed acquisition, attribution, pagination, deduplication and bounded backfill.
- [ ] Add coherent snapshots, sync locks, rate-limit handling and freshness metadata.
- [ ] Build curated repo explorer, commit/release views, defined most-active ranking and activity visualization.
- [ ] Add accessible chart/list alternatives and query-state filters.
- [ ] Test provider failure, incomplete history, token revocation, repository rename and public-to-private changes.

**Gate:** Displayed metrics have clear definitions and provenance; partial or failed data is never presented as a complete fresh total.

### Phase 5 — Complete public experience and migrate

- [ ] Finish project/pet-project, experience, about, resume, contact and retained note pages.
- [ ] Apply real content, image optimization and project-specific social previews.
- [ ] Add redirects, sitemap, canonical metadata and supported structured data.
- [ ] Replace the CV; resolve date discrepancies and stale claims.
- [ ] Reconcile source item counts, asset references and retained legacy URLs.
- [ ] Deploy a staging candidate, verify direct routes and compare against the old content inventory.

**Gate:** Every retained item and URL has a tested destination or an explicit removal decision; no broken media or placeholder claims remain.

### Phase 6 — Launch and operation

- [ ] Run critical functional/security tests and manual accessibility review.
- [ ] Measure representative mobile performance and tune motion if needed.
- [ ] Perform a backup/restore drill and production rollback rehearsal.
- [ ] Launch with immutable deployment and verify active-release status.
- [ ] Monitor redirects, errors, sync freshness and publication for an initial observation period.
- [ ] Keep the old backend/export available until migration is proven.
- [ ] Remove only portfolio-specific old processes/endpoints when safe; preserve shared services.

**Gate:** A working release, recoverable backup, rollback path and short operational guide exist.

## 16. Essential verification and launch definition of done

Write tests for real failure boundaries, not tests that merely restate component markup.

### Rendering and navigation

- Each public route returns the expected status, title, canonical URL and substantive body content without JS.
- Unknown routes return 404. Legacy routes redirect correctly with no loops.
- Normal, modified and back/forward navigation work with and without transitions.
- No hydration warnings under ordinary operation; image/font loading does not visibly move core content.

### Admin and security

- Anonymous users cannot read drafts/revisions/private media or mutate content.
- An unrelated valid user cannot gain access; login alone is not owner authorization.
- Owner actions requiring MFA fail without the required assurance.
- Signup is disabled at the provider configuration and there is no public account-creation flow.
- API/function inputs reject unsafe content, invalid release IDs and unauthorized requests.
- No GitHub, Supabase privileged or deployment secrets in public bundles, HTML, logs or source maps exposed to visitors.
- Preview data is private and never cached as public content.

### Publishing and recovery

- Publishing an old revision cannot overwrite a newer approved release.
- Editing during a build does not alter the immutable build input.
- Build, deployment and callback failures keep the last working site active.
- Rollback restores both the public version and its matching active data snapshot.
- Backup restoration includes media, not just database records.

### GitHub

- Commit authorship and deduplication behave correctly with bots, aliases and merge commits.
- Rankings match the defined window and scope; incomplete coverage is visibly identified.
- Provider failure preserves old values and their actual timestamps.
- Renames preserve identity; private/deleted/excluded repositories leave the public dataset and affected generated pages.
- Aggregate calendar values are not mislabeled as selected-repository commit counts.

### UX, accessibility and performance

- Keyboard completion of navigation, filters, dialogs, contact and admin publication.
- Screen-reader review of landmarks, forms, calendar/table alternatives and status updates.
- Reduced-motion behavior, zoom/reflow, forced colors and touch target checks.
- No empty content caused by failed animation initialization.
- Performance budgets reviewed against production builds and representative mobile traces.

### Content

- Bausy is clearly a product; addons are clearly pet projects.
- Every case study states personal ownership and constraints.
- Education, career dates and CV agree.
- Metrics cite a source and time window; there are no fabricated numbers or ambiguous active-user claims.
- No unfinished blocks, decorative placeholder charts or dead professional links.

## 17. Priority and scope control

### P0 — Required for the first complete release

- Custom visual foundation, excellent responsive layouts and a coherent motion system.
- Static HTML public pages and progressive navigation transitions.
- Homepage, project and pet-project collections/details, experience, about, contact and resume.
- Owner-only editing of all public content, private drafts/media, revisions, preview and publication.
- Bausy case study, selected professional case study and selected addon entry, completed to a credible standard.
- GitHub repositories, owner-authored commits, releases, activity and an honestly defined most-active view.
- Qualifications, skills backed by work and an updated downloadable CV.
- Accessibility, SEO, redirects, performance budgets and recovery procedures.
- Migration of retained articles; Notes can stay secondary rather than becoming a new editorial obligation.

### P1 — Add after the primary experience works

- A carefully designed alternate color theme.
- One meaningful interactive demo using synthetic data, lazy-loaded and isolated from real customer/pet data.
- More extensive architecture inspection and engineering notes.
- Historical adoption charts only when a reliable collection pipeline exists.
- Contact form, command palette and unified search if the content volume justifies them.
- Bulgarian localization with genuine maintained content.

### P2 — Optional, justify before building

- Public profile API, deeper repo comparisons and contributor analytics.
- Broader playground and advanced historical dashboards.
- Third-party metrics integrations where maintained authorized APIs actually exist.

Do not implement the earlier 95-feature brainstorm as a launch backlog. Several entries overlap, and many would distract from the strongest work. Ship the defined P0 experience, then use actual visitor behavior and maintenance cost to choose additions.

## 18. What was missing from the initial brief

| Missing decision | Default established by this plan |
| --- | --- |
| How Vite delivers SEO-ready pages | Static generation from React server rendering; real URLs and links |
| How pages remain fluid | Native cross-document View Transitions with ordinary navigation fallback |
| How edits reach static pages | Immutable publication snapshots, queued CI build and deployment status |
| What an editable admin controls | All public content plus constrained style settings; new structures remain code |
| How only you get access | Single provisioned UUID, disabled signup, MFA and enforced backend policies |
| Whether Supabase replaces a CMS automatically | It does not; custom editing/revisions/previews are explicit work |
| What happens to drafts and media | Private working storage; sanitized versioned publication projection |
| How GitHub numbers are defined | Scope, attribution, time windows, coverage, privacy and freshness attached to metrics |
| What “most used repo” means | Most active by a defined commit window, or separately sourced usage/download metrics |
| What demonstrates seniority | Ownership, constraints, decisions and verified outcomes before raw activity |
| How Bausy/addons are separated | Product/professional collection versus explicit pet-project collection |
| How old content is treated | Curated import, confirmed claims and URL redirects rather than wholesale prominence |
| What smoothness costs | Motion limits, no blocked navigation and measurable per-route performance budgets |
| How failure is handled | Last working static release, stale cached integration data, retries and rollback |
| How migration is reversed | Original export, retained source backend and tested restoration |
| What costs/resources are actually saved | Measure portfolio-specific load; check current hosted limits/pricing in euros |

### Inputs still needed before implementation

These do not block this plan, but they block an accurate production build:

1. Old frontend and WordPress backend source/export, including private custom-field definitions and existing redirect/configuration behavior.
2. Confirmation of current role/employer naming, employment dates, qualifications and updated CV content.
3. Publishable Bausy and professional-work evidence, screenshots and architecture details.
4. Complete addon/repository list and repository-level display choices.
5. Hosting/build-provider choice after checking current capabilities, limits and costs.

## 19. Sources and evidence notes

### Current portfolio sources

Retrieved directly on 12 October 2026; the public content endpoints contain owner-authored site content. Their visible data is a migration baseline, not independent verification of all career or audience claims.

- [Current homepage](https://spatovaliyski.com/)
- [Current experience](https://spatovaliyski.com/experience)
- [Current projects](https://spatovaliyski.com/projects)
- [Current blog](https://spatovaliyski.com/blog)
- [Linked CV](https://wp.spatovaliyski.com/resume/)
- [Public WordPress API index](https://wp.spatovaliyski.com/wp-json/)
- [Published pages](https://wp.spatovaliyski.com/wp-json/wp/v2/pages?per_page=100)
- [Published experience records](https://wp.spatovaliyski.com/wp-json/wp/v2/work_experience?per_page=100)
- [Published project records](https://wp.spatovaliyski.com/wp-json/wp/v2/work_projects?per_page=100)
- [Published posts](https://wp.spatovaliyski.com/wp-json/wp/v2/posts?per_page=100)

### Technical references checked for this plan

- [Vite server rendering and pre-rendering](https://vite.dev/guide/ssr): supports a rendering entry and pre-rendering known routes; the custom generator remains a project-specific build script.
- [MDN: Using the View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using): same-origin document navigation can use transitions when both documents opt in; support must be tested on the launch browser matrix.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): database policies enforce access; privileged secret/service-role access bypasses RLS and must remain outside browsers.
- [Supabase general auth configuration](https://supabase.com/docs/guides/auth/general-configuration): disabling signup limits sign-in to existing accounts.
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa): use provider-supported MFA and enforce required assurance in application policies/functions.
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control): define storage policies and separate private draft objects from intentionally public files.
- [GitHub GraphQL user/contribution reference](https://docs.github.com/en/graphql/reference/users): contribution fields and restricted-count behavior require careful labeling and privacy decisions.
- [GitHub Events API](https://docs.github.com/en/rest/activity/events): bounded recent history and latency make it unsuitable as the sole historical source.
- [W3C WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): minimum target size and documented exceptions; this project aims larger for principal controls.

All architectural defaults, palettes, time intervals and budgets in this plan are proposed implementation decisions, not claims that the current site already meets them. Recheck relevant provider behavior and supported versions when implementation starts.
