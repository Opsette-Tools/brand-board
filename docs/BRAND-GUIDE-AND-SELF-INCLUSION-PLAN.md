# Brand Board — Guide Page + Self-Inclusion + Kit Convenience Features (Build Plan)

**Owner:** Ruthnie / Opsette Tools
**Created:** 2026-07-12
**Status:** Planning doc — a brain dump scoped into a buildable plan. Take into a fresh Brand Board build session. Planning agent: Claude (this session). This is the payoff layer of the whole interop system Ruthnie built — the thing that makes the Fiverr kit actually worth paying for.

> **One-line summary:** Brand Board gets (1) a 4th **Guide page** that explains the kit to the client, (2) **self-inclusion** so Brand Board's own page exports ride inside the kit file (the big feature — kills loose downloads), and (3) a set of **convenience deliverables** (one-click-copy signature, labeled multi-QR, vCard, asset-usage notes) that make the kit feel premium. Parts (1)+(2) are Brand Board work; part (3) reaches into sibling tools (Signature Studio, QR Creator, Digital Card) — this doc scopes the Brand Board work and **nods** to what each sibling needs.

---

## Why this exists (Ruthnie's framing, kept honest)

The kit today is a pile of separate PNG downloads. That's friction Ruthnie actually hits:
- The Brand Board pages download as **separate PNGs**; even Windows' image viewer won't let her "Next" through them — she opens each one individually.
- With multiple clients, **loose files get mixed up** — whose page is this?
- The whole point of the `.opsette-kit.json` system was **one file per client**. But Brand Board is the one tool that **doesn't consume itself** — it collects every OTHER tool's assets, then its own finished pages fall out as loose downloads. That's the gap.

So the ranked priorities are Ruthnie's own:
1. **SELF-INCLUSION is the big feature.** Brand Board must bake its own rendered pages into the kit so File Builder can bundle them. This is the durable fix to the download chaos.
2. **The Guide page is "just prose"** — written once, reused for every client. Easy content, real value. It's the "how to use this kit" + "brand kit 101."
3. **The convenience features are where it gets meaty and premium** — one-click-copy signature, labeled multi-QR, vCard install, asset-usage notes. These are what make a client feel they got something worth the price.

---

## PART 1 — SELF-INCLUSION (the big feature) · BUILD FIRST

### The problem, precisely
Brand Board already knows how to render its pages. `src/components/board/exportBoard.ts` has:
- `pageToPngDataUrl(node, fonts)` → a page as a PNG **data URL** (already the exact base64 shape the kit uses everywhere else).
- `pagesToPngBlobs(nodes, fonts)` → all pages as PNG blobs (for the current separate-download flow).
- `pagesToPdfBlob(nodes, fonts)` → all pages as ONE multi-page PDF.

Pages are `foundation`, `applications`, `social` (`PAGE_ORDER` in `board.types.ts`), plus the **new `guide` page** from Part 2. Each renders at a fixed 1600×2000 poster size.

**The gap:** those renders are only ever *downloaded*. They are NOT stored in the project file. So when Ruthnie carries the kit into File Builder, the Brand Board pages aren't there — only the assets Brand Board *consumed* from other tools are. Brand Board doesn't consume itself.

### The fix: bake the page renders into the project file on save
When the project is saved (`serializeProject` in `projectFile.ts`), **also capture each present page as a PNG data URL and store it in the board**, so it rides inside the one `.opsette-kit.json`. File Builder's parser then decodes them like any other blob.

**Shape (add to `BrandBoardData`):**
```ts
// board.types.ts — new field on BrandBoardData
/**
 * The board's OWN rendered pages, baked in at save time so the kit file is
 * self-contained (Brand Board consumes itself). Keyed by PageId. Each is a PNG
 * data URL at export resolution. Also optionally a single combined multi-page PDF.
 */
pageRenders?: Partial<Record<PageId, string>>;   // data:image/png;base64,...
pagesPdf?: string | null;                        // data:application/pdf;base64,... (the combined kit PDF)
```

**Where it happens — DECISION (recommend the durable option):**
There are two honest ways to capture the renders at save time. Pick **B**.
- **(A) Capture on-demand at Save.** Save reaches into the live page DOM nodes, runs `pageToPngDataUrl` for each present page, stuffs the results into `pageRenders`, then serializes. Pro: always fresh. Con: Save needs access to the page DOM refs (currently the export flow has them; Save may not) and Save becomes async + slowish.
- **(B) Keep a live "last rendered" cache, write it on Save. ← RECOMMEND.** The board already renders pages for preview/export. Maintain `pageRenders` in board state, refreshed (debounced) whenever the board changes, and just serialize whatever's current at Save. Pro: Save stays fast; renders are warm. Con: must ensure the cache is fresh before Save (a "rendering…" state if a change is in flight). This matches Ruthnie's "globalize / do it right" rule — the render becomes first-class board data, not an export side effect.

Either way: **reuse `exportBoard.ts` — do NOT duplicate rasterization logic.** If `pageRenders` needs a helper, add it there.

### File Builder side (small, I'll wire it — nod only)
File Builder's parser (`file-builder/src/components/modes/package/opsetteKit.ts`) already decodes any `data:*` URL it's pointed at. It needs new routing entries:
- `board.pageRenders.foundation` → `Brand_Board/01_Foundation.png`
- `board.pageRenders.applications` → `Brand_Board/02_Applications.png`
- `board.pageRenders.social` → `Brand_Board/03_Social.png`
- `board.pageRenders.guide` → `Brand_Board/04_Guide.png`
- `board.pagesPdf` → `Brand_Board/Brand_Board.pdf` (the combined multi-page PDF — this is the nice single hand-off doc)

**Naming decision:** number the pages (`01_`, `02_`…) so they sort in order in the client's folder — directly fixing Ruthnie's "can't hit Next / files out of order" pain. Fold into the `Brand_Board/` folder.

**This is a ~10-line parser addition on the File Builder side once the blob field names are locked.** Flag Claude in a File Builder session with the exact field names and it's done.

### The "separate attachments vs. all-in-zip" question (Ruthnie raised it)
Ruthnie wondered: bake the pages into the kit, OR deliver them as separate attachments alongside the ZIP? **Recommend: bake them in (self-inclusion), AND also keep the combined PDF.** Reasoning:
- All-in-one ZIP is the whole point (no loose files). Baking in serves that.
- The **combined multi-page `Brand_Board.pdf`** is the elegant "here's your whole board" hand-off — it solves the "can't hit Next through PNGs" problem completely (a PDF pages through naturally). So the kit carries BOTH the individual page PNGs (for reuse) and the one PDF (for viewing/handoff).
- No need to deliver anything outside the ZIP. One file to the client.

### Size sanity check (do this in-session)
Baking 4 page PNGs at 1600×2000 @2x + a combined PDF into the kit JSON will grow the file (each page PNG could be ~0.5–2MB). The kit JSON is already multi-MB from social assets. **Verify the saved `.opsette-kit.json` stays reasonable (target < ~15MB).** If it balloons: (a) drop page-render pixelRatio from 2 to 1.5 for the baked copy (screen-viewing, not print), or (b) bake ONLY the combined PDF (not individual PNGs) and let File Builder split it if per-page PNGs are ever needed. Decide from the real measured size, not upfront.

---

## PART 2 — THE GUIDE PAGE (mostly prose, written once) · BUILD SECOND

A **4th board page**, `guide`, added to `PAGE_ORDER` / `PAGE_META` / `presentPages` / layouts. It's the at-a-glance "how to use this kit" page. It renders like the others (fixed 1600×2000 poster), gets baked in by Part 1, and downloads/PDFs with the set.

**It is mostly static prose** (the same for every client) with a few interpolated bits (brand name, the actual palette roles). Ruthnie: "It's just pros that we write once." So build a **reusable guide template** that reads from board data — don't hardcode client specifics.

### ⚠️ ONE page, ~5–6 blocks — NOT ten (Ruthnie's correction 2026-07-12)
The earlier draft listed 10 "sections" — that was 10 *blocks on one page*, but 10 is too cramped for a single 1600×2000 poster and reads as clutter. **The right move is to prioritize and cut, not shrink.** Domain-honest: a real one-page brand guide holds ~5–6 blocks comfortably.

**Split the content across TWO deliverables:**
- **The Guide PAGE (this board page) = the at-a-glance POSTER.** ~5–6 blocks only:
  1. **Palette + role key** ← the star (most valuable to a client building a site). Each `board.roles` color as a swatch **labeled with its job**: "Background — base of every page," "Text — body copy," "Buttons — calls to action," "Borders — dividers." Interpolated from data.
  2. **Typography** — heading + body face (`board.headingFont`/`board.bodyFont`), "heading for titles, body for everything else."
  3. **Applications quick-reference** — ONE compact row each for signature / digital card / QR: a one-liner "open this → do that."
  4. **Social asset sizing** — a small table (LinkedIn 1584×396, Facebook 820×312, X 1500×500, app icon 512, apple-touch 180, favicon 32) — "where each goes." Sizes come from `socialAssets[].width/height`.
  5. **Footer** — organic `tools.opsette.io`, "Made with Opsette."
- **`How_To_Use.pdf` = the MANUAL.** A PDF can be multi-page, so the LONG stuff lives here, not on the poster: brand-kit-101 prose, step-by-step signature install (Gmail + Outlook), how to save the vCard on a phone (desktop caveat), what favicon/app-icon/OG-image are and where a developer drops them in a site's `public/`, QR placement tips. File Builder already plans to include `How_To_Use.pdf` in every kit — this is its content. (Build/expand it in the File Builder session or as a shared template.)

**The mental model:** Guide page = the poster you glance at; `How_To_Use.pdf` = the manual you read. Keeps the page clean and gives the long instructions a home.

**Build a `guide-content.ts`** (or similar) holding the static copy + the interpolation points, so the page component is thin and the prose lives in one editable place (globalize, don't hardcode). Write to `CONTENT_STYLE_GUIDE.md` voice (no lists-of-three tells, no em-dash crutch, no "not X but Y", smart-friend tone).

---

## PART 3 — CONVENIENCE FEATURES (where it gets premium) · nods to sibling tools

These are the features that make the kit feel worth paying for. Some are Brand Board; most reach into sibling tools. **Each is its own small task — do NOT block Parts 1–2 on them.** Listed so nothing is lost.

### 3a. One-click-copy email signature — SIGNATURE STUDIO OWNS THIS (decided 2026-07-12)
Today `signature.html` renders fine and select-all → copy → paste works (verified 2026-07-12). Better: an HTML that shows the rendered signature **plus a "Copy signature" button** so the client never select-alls.
- **DECISION: Signature Studio owns it, NOT File Builder.** Ruthnie's call, and it's correct: File Builder loads files only to zip them — it can't reliably know a random `.html` is a signature vs. anything else, so wrapping arbitrary HTML would be fragile guessing. Signature Studio is the source of truth for what a signature is and how it renders.
- **Build it in Signature Studio's export:** bake a second **"installer" HTML** into the `type:"signature"` blob (alongside the existing raw `data.html`) — the rendered signature + a **"Copy signature" button** (`navigator.clipboard.write` with a `text/html` blob so the RICH signature copies, not plain text) + short **Gmail AND Outlook** install steps (Ruthnie explicitly wants Outlook too). Brand Board carries it through; File Builder routes it to `Email_Signature/` next to `signature.html`.
- **Open question for the Signature Studio session:** whether Brand Board still shows/needs the raw export button once the installer exists — decide there; don't block on it.
- **→ Separate Signature Studio session.** Nod only here. (Needs a new blob field, e.g. `data.installerHtml`; File Builder then needs a ~2-line route add, same pattern as the vCard.)

### 3b. Labeled multiple QR codes — QR CREATOR OWNS GENERATION (clarified 2026-07-12)
Ruthnie talked through this and landed correctly: **each QR points at ONE thing on purpose — there is NO "everything" QR.** A QR that crams website + email + LinkedIn + vCard into one is useless. The kit should carry a few **purpose-specific, labeled** QRs:
- **Website QR** — "put this on your business card / flyer."
- **Contact / vCard QR** — "scan to save my contact" (encodes the vCard or a link to it).
- Optionally others (booking link, review link).
- **Ownership is clean:** **QR Creator owns QR generation** — it's where you say "put THIS one target in THIS QR." The Digital Card's own QR is just the **contact** one (it already generates a QR for its share/vCard link per the interop contract); it must NOT try to be an "all your links" QR.
- **QR Creator change:** support outputting a **labeled SET** of QRs, each with its own target, baked into its blob as `{ label, purpose/url, image }[]` (mirror the social-assets `kind`/`label` shape so File Builder routes them by label). Ruthnie: "not hard, just more work."
- File Builder would route each to `QR_Codes/{label}.png` (~small parser add once the field shape is set).
- **→ Separate QR Creator session.** Nod only.

### 3c. Digital Card PNG + vCard interop (Digital Card tool) — Ruthnie is doing this next
Digital Card currently has NO interop contract (Ruthnie hand-downloads the PNG). Fix:
- Bake the card **PNG** into the export blob (like Icon Kit / Palette Studio).
- Generate + bake a **vCard `.vcf`** (name, title, company, phone, email, website, photo as base64 `PHOTO`), `text/vcard` data URL.
- **The vCard is for the CLIENT to save THEMSELVES** to their own phone contacts, then share with their customers. PNG = visual; vCard = functional.
- **Desktop caveat for the Guide page:** opening a `.vcf` on a computer adds it to the computer's contacts, not a phone. Instruction: "open the `.vcf` on your phone (AirDrop/email it to yourself) to save it to your phone contacts," or "scan the vCard QR with your phone camera."
- File Builder needs a parser field for the `.vcf` once its blob field name is set (~2 lines).
- **→ Ruthnie is taking this into a Digital Card session now** (prompt already provided). Nod + File-Builder-wiring reminder only.

### 3d. Asset-usage notes (covered by Guide page section 8–9)
The "where does each social size / app icon / OG image go" explanation lives in the Guide page prose (Part 2). No separate tool work — just good copy.

---

## Build order for the session

1. **PART 1 — self-inclusion first.** Add `pageRenders` (+ optional `pagesPdf`) to `BrandBoardData`; capture-at-save via the recommended live-cache approach, reusing `exportBoard.ts`. Verify a saved `.opsette-kit.json` contains the page renders and its size is sane. This is the feature that kills the download chaos.
2. **PART 2 — the Guide page.** Add `guide` to the page system; build the reusable guide template + `guide-content.ts`; nail the palette-role-key section (interpolated from `board.roles`/`scales`). Write the prose to `CONTENT_STYLE_GUIDE.md` voice.
3. **File Builder wiring** (separate quick task): add parser routes for `pageRenders.*` → `Brand_Board/0N_*.png` and `pagesPdf` → `Brand_Board/Brand_Board.pdf`. ~10 lines once field names are locked.
4. **PART 3 conveniences** — each in its own sibling-tool session (Signature Studio copy button, QR Creator multi-QR, Digital Card vCard — the last is already queued). Don't block 1–2 on these.

Verify each part in the running app (Ruthnie verifies → approves → build → commit). Update THIS doc with dated completion notes as you go. Honor all Opsette Tools conventions (Ant Design, SPA Vite, `tsc -b`, hardcoded base, small right-sized logo in any PDF, context-safe `uuid()`, `CONTENT_STYLE_GUIDE.md` voice).

---

## Conventions & cross-refs (quick ref)
- Interop shapes: mirror how Icon Kit / Palette Studio bake images (and now PDFs) into their blobs so File Builder's existing decoder recognizes new fields. Read `docs/BRAND-KIT-INTEROP-CONTRACT.md`.
- Page rendering: reuse `src/components/board/exportBoard.ts` (`pageToPngDataUrl`, `pagesToPdfBlob`) — never duplicate rasterization.
- Pages: `PAGE_ORDER` / `PAGE_META` / `presentPages` / `pageBlocks` in `board.types.ts`; layouts in `layouts.ts`.
- Copy voice: `C:\Users\ruthn\.claude\CONTENT_STYLE_GUIDE.MD` — read before writing the guide prose.
- File Builder parser to update: `c:\Opsette Tools\file-builder\src\components\modes\package\opsetteKit.ts`.

---

## PROGRESS — PART 2 (Guide page) SHIPPED · 2026-07-12

**Status: DONE, built + verified in the running app + full build + committed.** Part 1 (self-inclusion) and Part 3 (sibling tools) not started — Part 2 was built standalone as Ruthnie asked.

**What shipped:**
- New 4th page `guide` ("04 — Using Your Kit") wired into the page system: `PageId`, `PAGE_ORDER`, `PAGE_META`, `pageLayouts`, `presentPages` (shows when `colors.length > 0`), `pageBlocks` (returns `[]` — the guide renders its own fixed body, not composed blocks). `board.types.ts`.
- `src/components/board/guide-content.ts` — all prose in one editable place, CONTENT_STYLE_GUIDE voice. Interpolation points only (brand name, role colors, font names, which apps are present).
- `GuidePage` component in `BrandBoard.tsx` (own render path, not the shared block/layout system). Shares hero + footer chrome + page tokens. Extracted `pageStyleVars()` helper so guide + BrandPage read the same tokens (de-duped the inline token math).
- Blocks: (1) **color role key** — each `board.roles` color labeled with its job, falls back to brand colors if no roles; (2) **Type** — heading/body faces; (3) **Your files** — one row per application, gated on presence so a package without a QR/signature simply drops that row; (4) **Where each social size goes** — grouped into Profile banners / Icons / Social card (categories as eyebrows so the shared word isn't repeated), verified against Icon Kit's real output.
- CSS: reuses the slim-band header (`bb-page-guide` added to the applications/social header selectors) + `.bb-guide-*` block styles. `board-template.css`.
- `BrandBoardApp.tsx`: imports `GuidePage`, adds `guide` to `pageRefs` + dev `?page=guide`, branches `renderPage` to render `GuidePage`. Export/PDF pick it up automatically (collectNodes maps over presentPages).
- `projectFile.ts`: fixed a latent bug — the shallow board merge dropped nested `pageLayouts` defaults for pages added after a file was saved; now deep-merges `pageLayouts`.

**DECISION — `How_To_Use.pdf` is KILLED, do NOT build it.** The plan originally split the guide into a poster PAGE + a separate multi-page `How_To_Use.pdf` manual (to be built in a File Builder session). Dropped entirely, for a correct reason Ruthnie raised: **File Builder can't know what's in a given package** — different Fiverr tiers ship different pieces (maybe no QR, maybe no signature), so an external manual would reference files that may not be there. The Guide page is now the single, self-contained, package-agnostic "how to use": it references nothing outside itself, and every row is gated on the asset actually being present. All `How_To_Use.pdf` references were removed from the tool. **The Guide page IS the how-to.** (Any doc text above still mentioning `How_To_Use.pdf` is superseded by this note.)

**Verified sizing table matches Icon Kit's real output** (checked source, not the plan's guessed numbers): Social card/OG 1200×630, LinkedIn 1584×396, Facebook 820×312, Twitter/X 1500×500, App icon 512, Apple touch 180, Favicon 32. The plan's earlier "profile avatar 400×400" was wrong — Icon Kit produces no avatar; removed. Apple touch + Social card were missing; added.

**Left for later (not blocking):**
- Signature "Your files" line currently reads "Open signature.html, copy the signature, and paste it into your email settings" — true today. Reword to mention the Copy button once Signature Studio's installer HTML ships (Part 3a). One-line change in `guide-content.ts` `APP_REF`.
- Part 1 (self-inclusion) is next — Ruthnie flagged it for the following session.
