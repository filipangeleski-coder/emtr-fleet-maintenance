# EMTR Fleet Maintenance & Repairs - website

A fast, dark-industrial, single-page marketing site for a mobile diesel-mechanic / fleet-maintenance business (Sydney & NSW). Static, no build step, deploys anywhere. The hero is a procedural 3D diesel engine (three.js) with real piston motion, no external model file.

## Preview it locally
Any static server works. Easiest:

```bash
cd EMTR/site
python -m http.server 8123
# open http://localhost:8123
```

(Open via a server, not by double-clicking index.html. The 3D engine uses ES modules, which browsers block on `file://`.)

The contact form, when run locally, falls back to opening your email app to `info@emtr.com.au`. On Netlify it submits silently and emails the enquiry (see Deploy).

## Deploy (recommended: Netlify)
1. Create a free Netlify account, drag the `site/` folder onto the dashboard (or connect a Git repo).
2. Netlify auto-detects the `<form data-netlify="true">` and emails submissions. In Site settings > Forms > Form notifications, send to `info@emtr.com.au`.
3. Add the custom domain `emtr.com.au`. Netlify issues a free auto-renewing SSL cert (Let's Encrypt).
4. Optional: add reCAPTCHA in the form settings to cut spam (a honeypot is already wired).

Cloudflare Pages is a fine alternative (faster in AU) but needs a 3rd-party form endpoint (e.g. Web3Forms) instead of Netlify Forms.

## Fill these placeholders before going live
- `index.html` footer: real **ABN** and **licence number** (currently `00 000 000 000` / `000000`).
- `index.html` structured data (JSON-LD, in `<head>`): refine `geoMidpoint` lat/long and `geoRadius` to the real base + service radius.
- **Real photos: DONE.** 10 genuine job photos were pulled from their Instagram into `assets/photos/` and wired into the About block + the "Our work" gallery. Note: these are Instagram-compressed (640-1000px), fine for the current layout. For any large/hero or print use, get full-res originals from the owner's phone. There are ~250 more on their IG across 7 highlights (TRUCKS / MACHINES / REPAIRS / SERVICING / BREAKDOWNS / ELECTRICAL / INSPECTIONS) to swap in over time.
- **3D engine model licence (IMPORTANT before commercial launch):** the current `assets/models/engine.glb` is a PLACEHOLDER pulled from the Khronos glTF sample set, and its commercial licence is unclear. Before going live commercially, swap it for a properly licensed or commissioned diesel/truck engine model (Sketchfab / CGTrader / TurboSquid, roughly $20-100, or a verified CC0 one). To swap: replace `assets/models/engine.glb` with any engine `.glb`. No code change needed, the renderer auto-centres, scales and animates whatever model it finds.
- **Testimonials**: currently representative, drawn from real IG reviews. Replace with named, permission-granted quotes (e.g. the "Whyte Civil" breakdown save, whose photo is already in the gallery) and wire up Google reviews once collected.

## Structure
- `index.html` - the whole site (single page, anchor nav).
- `css/styles.css` - design system (OKLCH tokens, components, responsive, mobile call bar).
- `js/engine.js` - cinematic 3D engine hero. Loads `assets/models/engine.glb` with three.js, HDRI-style reflections + bloom, an exploded-view assembly reveal on load, and a burst-apart + rev when a Call CTA is hovered. Pauses off-screen, respects reduced-motion, falls back to a procedural engine if the model fails to load. The renderer is model-agnostic: drop in any engine `.glb` and it auto-centres, scales and animates it.
- `assets/models/engine.glb` - the 3D engine model (see licence note below).
- `js/main.js` - nav, scroll reveals, marquee, FAQ, form handler.
- `assets/` - logos.
- `PRODUCT.md` / `DESIGN.md` - brand + design context (the source of truth for voice and visual decisions).

## AI roadmap (researched, not yet built)
- **v1, highest ROI: missed-call text-back SMS.** Lives with the phone, not the site. Auto-texts missed callers within a minute. Twilio DIY ~$10-40/mo or off-the-shelf ~$29-99/mo.
- **v1: web enquiry-triage widget** (embeddable `<script>`, no backend) to capture vehicle/fault/urgency/location into a structured lead. The current form already does the core of this.
- **Phase 2: AI review-request SMS** after each job (Google reviews are the #1 local-ranking gap).
- **Skip: rigid online booking** (fights 24/7 dynamic dispatch) and customer-facing AI quotes (diesel jobs too variable).

## Note
The business's current live site has an **expired SSL certificate** (browsers flag it unsafe). Worth telling the owner. Cutting over to this site on Netlify fixes it automatically.
