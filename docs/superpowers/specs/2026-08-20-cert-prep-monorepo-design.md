# cert-prep monorepo — design

Date: 2026-08-20
Status: approved (pending spec review)

## 1. Goal

Turn the single-certification `cca-f` static site into a reusable base that
can host study sites for **multiple certifications**, each with its own
content, color theme, and quiz set, while sharing one engine (HTML/CSS/JS)
so fixing or improving the engine benefits every certification at once.

Non-goals: no build tooling, no npm/bundler, no server backend. Everything
stays plain static HTML/CSS/JS, deployable as-is to GitHub Pages.

## 2. Repository layout

```
cert-prep/
├── index.html                    # Dashboard — lists all certs, links out
├── core/
│   ├── css/
│   │   └── style.css             # Structural CSS only — no color values
│   └── js/
│       ├── app.js                # Tab engine + glossary tooltip + VI toggle
│       ├── theme-toggle.js       # Dark/light mode toggle (shared, site-wide)
│       └── quiz-engine.js        # Unified quiz/exam engine (see §6)
├── certs/
│   ├── _template/                # Starting point for a new certification
│   │   ├── index.html
│   │   ├── theme.css
│   │   ├── meta.json
│   │   ├── data/
│   │   │   ├── principles.js
│   │   │   ├── questions.js
│   │   │   └── glossary.js
│   │   └── quizzes/
│   │       └── quiz1.html
│   └── cca-f/                    # Migrated from the current cca-f project
│       ├── index.html
│       ├── theme.css
│       ├── meta.json
│       ├── data/
│       │   ├── principles.js
│       │   ├── questions.js
│       │   └── glossary.js
│       └── quizzes/
│           ├── quiz1.html
│           ├── quiz2.html
│           └── exam.html
└── docs/
    └── superpowers/specs/        # This spec and future ones
```

Adding a new certification = copy `certs/_template/` to `certs/<id>/`, fill
in content/data, add one entry to the dashboard's registry (§5).

## 3. `core/` — shared engine, no cert-specific content

`core/` must never contain content, vocabulary, or color values that belong
to one specific certification. Two issues in the current `cca-f` code
violate this and must be fixed during migration:

- **Glossary dictionary**: `app.js` currently hard-codes ~230 English→Vietnamese
  glossary terms specific to CCA-F's subject matter. This moves out to
  `certs/<id>/data/glossary.js` (`window.CERT_GLOSSARY`); `app.js` reads
  that global instead of an inline dictionary.
- **localStorage keys**: the current active-tab key (`'cca-f-active-tab'`)
  is hard-coded. Since all certs may be hosted on the same GitHub Pages
  origin, keys must be namespaced per cert (e.g. `'cert-active-tab:' + CERT_ID`,
  where `CERT_ID` is a small global each cert's `index.html` sets before
  loading `app.js`). The dark/light theme preference (`'cca-theme'` →
  rename `'cert-theme'`) stays a single site-wide key — shared preference
  is desired there.

`core/css/style.css` keeps all layout/structure rules (spacing, component
shapes, `.tab-panel`, `.weight-chip`, etc.) but every rule referencing color
uses `var(--accent)`, `var(--d1)`...`var(--d5)`, `var(--bg)` etc. **without**
defining their values — those come from each cert's `theme.css` (§4).

## 4. Per-certification theme (`theme.css`)

Each cert supplies a small `certs/<id>/theme.css` (~15-20 lines) defining
the color custom properties for light and dark mode:

```css
:root{
  --bg:#faf6f1; --card:#ffffff; --ink:#1f1b16; --muted:#6b6258; --line:#e7ded3;
  --accent:#d97757; --green:#3a7d44; --green-bg:#e7f5e8; --red:#c0392b;
  --d1:#d97757; --d2:#3b6ea5; --d3:#4a8a5b; --d4:#8a5fa8; --d5:#c08a2e;
  /* ...surface/highlight/warn variables... */
}
:root[data-theme="dark"], @media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  /* dark-mode equivalents */
}}
```

`certs/<id>/index.html` loads `core/css/style.css` first, then its own
`theme.css`. Changing a cert's primary color is then a 2-minute edit to one
small file, never touching `core/`.

## 5. Dashboard (`/index.html`)

Root `index.html` lists all certifications as cards (name, subtitle, short
description, accent color, link). Each cert exposes `certs/<id>/meta.json`:

```json
{
  "id": "cca-f",
  "name": "CCA-F",
  "subtitle": "Claude Certified Architect · Foundations",
  "color": "#d97757",
  "path": "certs/cca-f/index.html"
}
```

Because GitHub Pages is static hosting (no directory listing), the
dashboard keeps a manually maintained registry of cert ids (a short array
in the dashboard's own script). Adding a cert = append one id to that
array; the dashboard fetches each `meta.json` to render its card.

## 6. Quiz engine (`core/js/quiz-engine.js`)

One engine, driven by a per-page config, replaces the current 3
hand-duplicated quiz pages. Design decided over the course of this
conversation:

- The engine supports two **modes**: `"practice"` (one question at a time,
  immediate feedback, works on a subset — all / random N / custom range)
  and `"exam"` (paginated, all questions visible, select without feedback,
  single "Submit" grades the whole attempt, shows per-domain accuracy).
- A certification can have **any number of quiz pages** (`quiz1.html`,
  `quiz2.html`, `exam.html`, ...). Each is a thin HTML shell (from the
  template) plus a small config block:

```html
<script>
  window.QUIZ_CONFIG = {
    title: "Quiz 1 — Domains 1 & 2",
    dataSrc: "../data/questions.js",   // sets window.CERT_QUESTIONS
    mode: "practice",                   // "practice" | "exam"
    range: [1, 22],                     // optional default subset
    viTranslations: "VI_TRANSLATIONS_A" // optional, global var name
  };
</script>
<script src="../../../core/js/quiz-engine.js"></script>
```

- Creating a new quiz for a cert = copy one small HTML file, edit the
  config block. No engine logic is ever duplicated.
- Shared internals inside the engine: question normalization, option
  rendering, VI toggle/copy buttons, scoring, review list, and (for exam
  mode) domain filter chips + per-domain stats.

## 7. Migration plan for `cca-f`

1. Copy `cca-f`'s current `assets/css/style.css` into
   `core/css/style.css`, strip color values out into
   `certs/cca-f/theme.css`.
2. Copy `assets/js/app.js` into `core/js/app.js`; extract the `GLOSSARY`
   object into `certs/cca-f/data/glossary.js`; namespace the
   `localStorage` active-tab key with `CERT_ID = "cca-f"`.
3. Copy `theme-toggle.js` into `core/js/theme-toggle.js` as-is (already
   generic); rename its storage key to the shared `'cert-theme'`.
4. Move `assets/data/principles.js` and `questions.js` into
   `certs/cca-f/data/` unchanged (already generic `window.CERT_*`-style
   data, just rename the globals from `CCAF_*` to `CERT_*` so cert data
   files follow one naming convention core code can rely on).
5. Move `index.html` into `certs/cca-f/index.html`, update asset paths to
   `../../core/...` and `./theme.css`, set `CERT_ID`.
6. Rewrite the 3 existing quiz pages as quiz-engine configs:
   `quiz1.html` (practice, range matching old quiz-1 default),
   `quiz2.html` (practice, matching old interactive-quiz), `exam.html`
   (exam mode, matching old practice-exam). Vietnamese translation data
   files (`vi-translations-setA/B.js`) move to `certs/cca-f/data/`.
7. Add `certs/cca-f/meta.json`.
8. Delete the now-unused `assets/data/_build/` artifacts (raw/map JSON —
   confirmed unreferenced by any script).

## 8. Testing / verification

No test framework is introduced (static site, matches existing project
conventions). Verification is manual, in-browser, after migration:

- Open dashboard → cert card shows correct name/color/link.
- Open `certs/cca-f/index.html` → tabs, glossary hover, VI toggle, dark
  mode all work identically to the current site.
- Open each quiz page → practice mode (single question, feedback, mode
  selector) and exam mode (paginated, submit, domain stats) both behave
  like the current three pages.
- Open two certs side by side (once a second cert exists) → confirm
  active-tab state and dark-mode preference behave as designed (per-cert
  vs shared).

## 9. Deferred / out of scope

- No scaffold script for new certs — copy-paste the `_template/` folder.
- No automatic cert discovery for the dashboard — registry is a manually
  maintained list.
- Only one certification (`cca-f`) is migrated as part of this design;
  building out a second certification's content is separate follow-up
  work.
