# TheDirtCalc — Landscape Material Calculator Site (Prototype)

A pure static site: HTML + one CSS file + one vanilla JS file. No build step,
no dependencies, no external fonts/images. The whole directory can be deployed
as-is (e.g. to Cloudflare Pages). All calculations run locally in the visitor's
browser.

**Placeholder domain:** canonical URLs and the sitemap use
`https://thedirtcalc.com` as a stand-in. The domain has not been registered;
find-and-replace the base URL after purchase.

## Local preview

```bash
cd ~/workspace/landscape-calc-site
python3 -m http.server 8000
# open http://localhost:8000/
```

## File inventory

| File | Purpose |
|---|---|
| `index.html` | Home page: intro copy + cards linking all 10 tools |
| `topsoil-calculator.html` | Topsoil — yards / tons / bags |
| `mulch-calculator.html` | Mulch — yards / tons / bags |
| `gravel-calculator.html` | Gravel — tons & yards, stone-type selector (crushed / pea / river) |
| `raised-bed-soil-calculator.html` | Raised bed mix — bed-size presets (4×4, 4×8, 2×8, 3×6) |
| `sand-calculator.html` | Sand — patios/pavers, pools, sandboxes |
| `fill-dirt-calculator.html` | Fill dirt — grading & leveling |
| `compost-calculator.html` | Compost — top-dressing & bed amendment |
| `pea-gravel-calculator.html` | Pea gravel — patios & paths |
| `river-rock-calculator.html` | River rock — decorative beds, dry creek beds |
| `bulk-vs-bagged-calculator.html` | Price comparison: delivered bulk $/yd³ vs bag price |
| `about.html` | About page |
| `privacy.html` | Privacy policy (no accounts, no personal data, future ads disclosed) |
| `assets/style.css` | Shared stylesheet (light theme, responsive, system fonts) |
| `assets/calc.js` | Shared calculator engine (all 10 tools) |
| `sitemap.xml` | All 13 pages |
| `robots.txt` | Allow-all + sitemap reference |

Each tool page is a standalone URL with: the calculator first, then ~700–860
words of supporting copy (how the math works, a worked example whose numbers
match the calculator's defaults, common mistakes, 4–5 FAQs with FAQPage
schema), and links to 3 related calculators.

## Calculator engine (`assets/calc.js`)

- **Inputs:** length, width, depth; shapes: rectangle, circle (length field
  becomes diameter), triangle (base × height ÷ 2). Optional second area is
  added to the totals. Raised-bed page adds one-tap bed-size presets.
- **Units:** one-click Imperial (ft / in) ↔ Metric (m / cm) toggle that
  converts the values already typed, not just the labels.
- **Math:** volume = area × depth; yd³ = ft³ ÷ 27; tons = ft³ × density ÷ 2000;
  bags = ceil(ft³ ÷ bag size) for 0.75 and 1.5 cu ft bags. "Recommended order"
  multiplies volume by 1.10 (10% for settling, spills, uneven ground).
- **Density:** shown on every page and editable in both lb/ft³ and tons/yd³
  (the two fields stay in sync). The gravel page's stone-type dropdown sets
  the density automatically.
- **Bulk vs. bagged:** takes area/depth plus bulk $/yd³ (delivered) and bag
  price/size, totals both options on the waste-adjusted volume, and states
  which is cheaper and by how much.
- **Output:** on-page results grid plus a plain-text shopping list with a
  copy button. Invalid input (blank, zero, negative, text) produces a plain
  English error message listing the fields to fix — never NaN.
- Numbers are formatted en-US with thousands separators and 2 decimals
  (bag counts are whole numbers, rounded up).

## Densities used, and their basis

Values are mid-points of the ranges commonly published by landscape material
suppliers and university extension guidance; every page states its density
and lets the user override it, because moisture and local material shift the
true weight. Weight per cubic yard = lb/ft³ × 27 ÷ 2000 tons.

| Material | lb/ft³ | tons/yd³ | Commonly published range (lb/ft³) | Note |
|---|---|---|---|---|
| Topsoil (screened) | 75 | 1.01 | ~70–80 | ≈1 ton/yd³ is the standard rule of thumb |
| Mulch (shredded wood/bark) | 25 | 0.34 | ~20–30 | 400–800 lb/yd³ depending on type & moisture |
| Gravel — crushed stone | 100 | 1.35 | ~95–105 | Angular stone packs tight; the driveway standard |
| Gravel — pea gravel | 96 | 1.30 | ~92–100 | Rounded pieces leave more voids |
| Gravel — river rock | 90 | 1.22 | ~85–95 | Largest voids of the three stone types |
| Sand (dry) | 100 | 1.35 | ~95–105 | Wet sand runs 15–25% heavier |
| Fill dirt | 90 | 1.22 | ~85–100 | Mineral subsoil; denser than topsoil, lighter than stone |
| Compost (finished) | 40 | 0.54 | ~35–45 | ~1,000–1,200 lb/yd³ at typical moisture |
| Raised bed mix | 45 | 0.61 | ~40–50 | Topsoil/compost/aeration blend, moist |

## Verification performed

The engine's pure functions were exercised in Node against independent hand
calculations — 19 checks, all passed, including: topsoil 20 ft × 30 ft × 4 in
→ 7.41 yd³ / 7.50 tons / 134 × 1.5 cu ft bags (8.15 yd³ with buffer); mulch
circle Ø12 ft × 3 in → 28.27 ft³ / 1.05 yd³ / 0.35 tons; gravel driveway
12 ft × 40 ft × 4 in crushed stone → 5.93 yd³ / 8.00 tons. All worked examples
printed in the page copy use these same numbers. Every generated page was
checked for the engine's required markup hooks, and the site was smoke-tested
over a local HTTP server (all pages and assets return 200).

## Not done (by design)

No deployment, no domain purchase, no AdSense/analytics code. The privacy
page already discloses that advertising may be added later.
