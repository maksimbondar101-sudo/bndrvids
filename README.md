# BNDRVIDS

Static marketing site for BNDRVIDS. Seven pages, no build step, no framework,
no dependencies. Every file in this repo is either served as-is or is a note to
whoever maintains it.

Live at **https://bndrvids.com** via Netlify.

---

## Running it locally

```bash
npx serve .          # http://localhost:3000 — handles /pricing without .html
```

`python3 -m http.server 8000` also works, but extensionless URLs like
`/pricing` will 404 under it, because that rewriting is something Netlify does
for you in production. Every nav link on the site uses that form, so use
`npx serve` if you are checking navigation.

## Deploying

The repo is connected to the Netlify project `bndrvids`. **Pushing to `main`
deploys the site.** Nothing else is required — there is no build command and
the publish directory is the repo root.

To deploy without a commit, use *Deploys → Trigger deploy* in the Netlify UI.
To deploy without Git at all, drag a zip of this directory onto the same page;
`_headers` and `_redirects` (see below) make that path behave identically.

---

## Booking

Every "Schedule a call" on this site leads to `/start`, and `/start` is the
cal.com booker at **cal.com/bndrvids/30min**. That is the only way a call gets
scheduled. There is no second path.

```js
var CAL_LINK = 'bndrvids/30min';   // assets/js/site.js — path after cal.com/, not a URL
```

### What was removed, and what replaced it

The FormSubmit request form, its day/time chips, the hand-rolled weekend
interlock, the separate timezone question, and `/thanks` (which existed only as
that form's confirmation page) are all gone — about 170 lines of JavaScript and
160 of CSS with them. FormSubmit is no longer contacted at all, so it has been
dropped from the CSP: `connect-src` and `form-action` no longer name it.

If the embed fails to load, the fallback is **a link to the same calendar**,
not a second booking mechanism. Its `href` is in the markup, so it works with
JavaScript switched off entirely. One place a call gets booked, and no path
that dead-ends.

### Settings that live in cal.com, not in this repo

Nothing in this codebase can enforce these. They are set on the event type at
cal.com and they are the difference between the booker helping and hurting.

| Setting | Why |
|---|---|
| **Minimum notice: 48 hours** | The walkthrough is built *before* the call. A slot bookable two hours out is a promise this business cannot keep. Verified set: `minimumBookingNotice: 2880`. |
| **Booking question `Property-Listing`, required** | Verified present on the event type. This is the slug the prefill targets — the site no longer collects a listing itself, so this field is now the only place it is asked for. A prefill key matching no field is accepted and silently ignored, which is why the slug has to match exactly. |
| Company, units managed, notes | Optional. The old request form collected these; add them as booking questions if you still want them. |

### Failure handling

`onerror` is not the failure that matters. The one that does is an embed script
loading fine and rendering nothing — a blocker serving an empty 200, a wedged
service, a wrong `calLink`. The loader accepts success optimistically the moment
the API takes the call, so a six-second check looks for an actual `<iframe>` in
the container and falls back regardless of what the API reported.

### Call length

Thirty minutes, stated on `/start` (lede, step 03, meta description) and in step
03 of `/how-it-works`. If you change the cal.com event length, change those four
places with it.

### "1–3 business days" — where it survives, and why

CTA lines now say "pick a time in under a minute", which is what happens. One
mention remains, in the `contact.html` aside, and it is still true: emailing you
really does take that long. Booking does not.

### The CSP consequence

cal.com is the only third party permitted to run on this site, and it took four
grants in both `netlify.toml` and `_headers`: `script-src` for the embed,
`frame-src` for the booker, `connect-src` for availability lookups, `img-src`
for avatars. If a fifth third-party host ever appears in that policy, something
has been added that should not have been.

---

## Things marked "see README" in the code

Three places in the markup are waiting on information only you can supply.
They are commented in the HTML at the point they matter.

| Where | What's needed |
|---|---|
| `about.html` — founder section | What you were doing when you first noticed the gap, and which listing you tried it on first. Two concrete details would make that section land far harder than it does. |
| `index.html` — proof bar | Real volume numbers, once you have them. The three claims there now are true by construction and invent nothing, which is why they are vaguer than they could be. |
| `how-it-works.html` — pledge section | The one block on the site where a claim has to match the actual pipeline exactly. Re-read it whenever the pipeline changes. |

There is also a **deliberately empty testimonial block** in `index.html`,
commented out. Do not invent a quote to fill it — a fabricated testimonial on a
live business site is a real liability and property managers check. One genuine
quote with a name, role, company and portfolio size outperforms eight invented
ones.

---

## The missing footage

**Every `<video>` element on this site ships without a `<source>`.** What
renders is the poster image. The scaffolding is in place and commented — drop
the files into `assets/video/` and restore the commented `<source>` line above
each one, and they play with no other change.

| File to add | Used by |
|---|---|
| `hero-loop.mp4` | homepage hero background |
| `walkthrough-demo.mp4` | homepage "photos in, walkthrough out" |
| `process-vertical.mp4` | `how-it-works.html` |
| `about-vertical.mp4` | `about.html` |

Two further gaps in the same area:

- `hero-poster.jpg` and `walkthrough-poster.jpg` are **byte-identical**, as are
  `brand-motion.jpg` and `process-poster.jpg`. Two abstract graphics currently
  do duty for four slots, and none of them shows a property.
- The six frames in the homepage swap block are **empty placeholders**. They
  carry numbered labels so the strip reads as a contact sheet rather than six
  failed image loads, and `site.js` fades each label out the moment its image
  decodes — so dropping six real `<img>` tags in needs no other edit.

This is the site's largest remaining gap by a wide margin. It sells video and
currently contains none.

---

## How the code is organised

```
*.html                    seven pages, each self-contained
assets/css/site.css       the whole design system, heavily commented
assets/js/site.js         nav, reveals, the request form, four controls
assets/fonts/             both typefaces, self-hosted — see fonts/README.txt
netlify.toml              headers, CSP, redirects (Git builds)
_headers / _redirects     the same rules again (drag-and-drop deploys)
```

### Why the config exists twice

`netlify.toml` is authoritative for Git builds. `_headers` and `_redirects`
cover manual and drag-and-drop deploys. Netlify processes both — a live deploy
reports "6 redirect rules" and "4 header rules", which is all of them — and the
rules are identical, so precedence never matters.

**If you change one, change the other.** The site's Content-Security-Policy
lives in both, and it is deliberately strict: no third-party origins at all.
Adding a Google Fonts link, an analytics snippet or an embedded video would be
blocked outright rather than silently allowed. That is the intended behaviour.

### The design system

`assets/css/site.css` opens with the rules it keeps — four colours, two
typefaces, one type ladder, three spacing gaps, zero border-radius, two button
styles. Those rules are the reason the site looks coherent, and they are worth
more than any individual page. If you break one, change the header comment too,
so the file never describes a discipline it no longer keeps.

Motion has two tiers: one ambient gesture (fade + 12px rise), and reactive
motion that only runs in response to a scroll, a pointer, or a value someone
set. Everything respects `prefers-reduced-motion`.

### The interactive controls

Four things in `site.js` are controls rather than decoration:

- **Photo gauge** (`how-it-works.html`) — restates the requirements table as a
  slider. **Its copy is that policy, not a new promise.** If the Photos row
  changes, the `BANDS` array in `site.js` changes with it, and the
  `grid-template-columns` on `.gauge__bands` too — those numbers are the count
  of slider values per band, so a drawn threshold sits where the verdict
  actually changes.
- **Listing field readout** — names the portal back to whoever pasted a link.
  Recognition only; it never blocks a submission.
- **Swap sequence** (homepage) — carries the argument the missing photographs
  would have carried.
- **FAQ** — animates closing, which CSS cannot do alone, because a closed
  `<details>` hides its content before any transition can run.

All four degrade to working, unstyled behaviour without JavaScript.

---

## Known-good checks before a deploy

Worth thirty seconds after any change:

- Headings render in **DM Serif Display**, not Georgia. If they fall back, the
  CSP is doing its job and something is reaching for a third-party font.
- `/pricing`, `/how-it-works`, `/about`, `/contact` resolve **without** `.html`.
- No horizontal scrollbar at 390px wide.
- The request form still reaches your inbox — see *Making the form work*.
