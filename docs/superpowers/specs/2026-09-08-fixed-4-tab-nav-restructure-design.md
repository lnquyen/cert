# cert-prep — fixed 4-tab nav restructure

Date: 2026-09-08
Status: approved (pending spec review)

## 1. Goal

Replace the current per-cert, arbitrary tab list (`plan`, `d1`...`d5`,
`cheat`, `tips`, `checklist`, `quizzes`, ...) with one fixed top-level menu
used by every certification:

- **How to learn** (`learn`)
- **Lesson** (`lesson`)
- **Quiz** (`quiz`)
- **Tip** (`tip`)

The engine (`core/`) owns the existence and order of these 4 tabs. What
goes inside each tab-panel is entirely up to each certification — core no
longer prescribes or supplies any content-presentation CSS/markup beyond
these 4 empty panels and the chrome around them (nav bar, tab-switch
mechanics, glossary tooltips, dark mode). This lets each cert diverge in
visual style for its content without touching `core/` or other certs.

Non-goals: no visual redesign of existing content this round (existing
markup/CSS is relocated, not rewritten); no new Tip content authored for
either cert (itil4-f's Tip tab is a placeholder the user fills in later);
no in-page sub-navigation added inside the merged Lesson/Tip panels (e.g.
jump links to D1-D5) — deferred, see §7.

## 2. `core/js/site-nav.js` — fixed tab rendering

Replace the current `nav.tabs`-driven rendering with a hardcoded list:

```js
var FIXED_TABS = [
  { id: 'learn',  label: 'How to learn' },
  { id: 'lesson', label: 'Lesson' },
  { id: 'quiz',   label: 'Quiz' },
  { id: 'tip',    label: 'Tip' }
];
```

Everything else about rendering (local `<button class="tab-btn">` vs.
cross-page `<a>` link back to `index.html#<id>`, based on whether
`#tab-<id>` exists on the current page) stays as-is — only the source of
the tab list changes, from `window.CERT_NAV.tabs` to this fixed array.
The per-tab `colorVar` tinting feature is dropped (it existed only to tint
each domain tab a different accent color; with domains merged into one
`Lesson` tab, per-tab tinting no longer applies).

`window.CERT_NAV` (`certs/<id>/data/nav.js`) shrinks to:

```js
window.CERT_NAV = { title: "...", subtitle: "..." };
```

## 3. `core/js/app.js` — default tab + generic anchor routing

- `initTabs()`'s hardcoded default tab changes from `'plan'` to `'learn'`.
- The existing badge-click handler hardcodes a domain-count assumption
  that doesn't belong in core:

  ```js
  var m = hash.match(/^(d[1-5])/);
  if (m) activateTab(m[1], {silent:true});
  ```

  This is replaced with a fully generic version: on click of any in-page
  `<a href="#...">`, find the clicked target element's closest ancestor
  `.tab-panel[data-tab]` and activate that tab if it isn't already active.
  This works regardless of how a cert organizes ids inside `Lesson` or any
  other panel (no more `d[1-5]` knowledge baked into core), and is what
  keeps `certs/cca-f`'s `question-links.js` cross-reference links
  (`href="#d1-p1"`) working once `d1`...`d5` are no longer separate tabs.

## 4. CSS ownership: core chrome vs. per-cert `content.css`

`core/css/style.css` keeps only structural chrome shared by every cert:
reset/base typography, `.wrap`, the site-nav bar and mobile nav-toggle,
`.tab-panel` show/hide mechanics, `.tab-btn`, the glossary tooltip system
(`.term`, `#viTooltip`, `.vi-icon`, `.vi-inline`), and dark-mode plumbing.

All content-presentation rules move out of core into a new file each cert
owns: **`certs/<id>/content.css`**, loaded after `theme.css`. This
includes (non-exhaustive, whatever the cert currently uses): `.hero`,
`.section-title`, `.section-desc`, `.plan-grid`, `.phase-card`,
`.domain-block`, `.principle`, `.quiz-grid`, `.quiz-card`, `.quiz-badge`,
`.quiz-start`, and any cheat-sheet/tips/checklist-specific rules.

This migration is a **relocation, not a redesign** — existing class names
and visual appearance are preserved as-is for both cca-f and itil4-f.
Each cert is now free to diverge its content styling in future work
without touching `core/` or any other cert.

`theme.css` is unaffected — it keeps its existing sole responsibility
(color custom properties only).

## 5. Per-cert migration mapping

### cca-f (10 tabs → 4 tabs)

| Old tab(s) | New tab | Notes |
|---|---|---|
| `plan` | `learn` | Content unchanged. |
| `d1`, `d2`, `d3`, `d4`, `d5` | `lesson` | All 5 domain-blocks stacked in one panel, in order, content/markup/style unchanged. Internal element ids (`d1-p1`, etc.) stay unchanged so `question-links.js` cross-reference links keep working via the generic anchor routing from §3. |
| `cheat`, `tips`, `checklist` | `tip` | All 3 sections stacked in one panel, in order (cheat-sheet, then tips & tricks, then checklist), content unchanged. |
| `quizzes` | `quiz` | Content unchanged, id/label renamed. |

`certs/cca-f/data/nav.js` shrinks to `{title, subtitle}`. Content CSS
currently living in `core/css/style.css` that only cca-f uses moves to
new `certs/cca-f/content.css`.

### itil4-f (7 tabs → 4 tabs)

| Old tab(s) | New tab | Notes |
|---|---|---|
| `plan` | `learn` | Content unchanged. |
| `d1`...`d5` | `lesson` | Same consolidation as cca-f. |
| `quizzes` | `quiz` | Content unchanged, id/label renamed. |
| *(none)* | `tip` | **New tab, placeholder only** — a clearly-labeled empty state (e.g. "Tips coming soon") rather than fabricated content. User fills in real content later. |

`certs/itil4-f/data/nav.js` shrinks to `{title, subtitle}`.
`certs/itil4-f/content.css` is created holding whatever content rules
this cert needs (currently reuses core's, so this is where they move to).

### `_template/`

Updated to the new 4-tab skeleton: `index.html` with 4 empty tab-panels
(`tab-learn`, `tab-lesson`, `tab-quiz`, `tab-tip`), an empty
`content.css` stub, and `data/nav.js` in the new `{title, subtitle}`
shape. This becomes the starting point for any future certification.

## 6. Unaffected

- `core/css/quiz.css` and `core/js/quiz-engine.js` — the quiz-taking
  pages (`quizzes/quiz1.html`, `quiz2.html`, `exam.html`) are untouched;
  only the "Quiz" tab's list-of-quiz-cards content (which links out to
  these pages) is affected, and only its CSS ownership (moves into
  `content.css` per §4), not its behavior.
- `meta.json` (dashboard registry entry) — no changes.
- `theme-toggle.js`, dark/light `localStorage` key — no changes.
- Root `index.html` dashboard — no changes.

## 7. Edge cases

- **Saved active-tab in localStorage**: existing visitors may have an old
  tab id (`'plan'`, `'d3'`, `'checklist'`, ...) saved under
  `cert-active-tab:<id>`. `initTabs()` already guards with
  `document.getElementById('tab-' + saved)` before trusting the saved
  value, so a stale id simply fails that check and falls back to the
  default (`'learn'`) — no crash, no migration code needed.
- **`question-links.js` (cca-f only)**: generates `href="#d1-p1"`-style
  links between quiz questions and principle cards. Anchor ids are
  preserved unchanged during the domain merge, and the generic
  closest-`.tab-panel` routing in §3 activates `lesson` correctly before
  scrolling — verified by reading through the click-handler logic, should
  be re-confirmed manually per §8.

## 8. Testing / verification

Manual, in-browser (matches existing project convention, no test
framework):

- Dashboard → both cert cards still open correctly.
- Each cert → confirm exactly 4 top-level menu items appear, in order:
  How to learn, Lesson, Quiz, Tip.
- `How to learn` shows the old Plan content unchanged.
- `Lesson` shows all 5 domains stacked, in order, looking the same as
  before (same colors, same card style) — for cca-f, confirm clicking a
  cross-reference link from a quiz page correctly switches to `Lesson`
  and scrolls to the right principle card.
- `Tip` — cca-f shows cheat-sheet + tips & tricks + checklist stacked, in
  order, content unchanged. itil4-f shows the placeholder empty state.
- `Quiz` shows the same quiz-card grid as before, links still work.
- Dark mode toggle still works from the shared nav on every tab.
- Glossary hover tooltips still work inside the merged panels.

## 9. Deferred / out of scope

- No in-page sub-navigation (jump links, accordion) inside the merged
  `Lesson` or `Tip` panels — explicitly deferred per user request, can be
  added later per-cert without touching core.
- No real Tip content authored for itil4-f — placeholder only.
- No visual redesign of any cert's content styling — this round is a
  pure relocation (core → per-cert `content.css`) plus tab consolidation.
