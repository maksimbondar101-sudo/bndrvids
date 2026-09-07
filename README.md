# BNDRVIDS

Static marketing site for BNDRVIDS. Eight pages plus a 404, no build step, no
framework, no dependencies. Every file in this repo is either served as-is or
is a note to whoever maintains it.

Live at **https://bndrvids.com**, hosted on Vercel.

---

## Running it locally

```bash
npx serve .          # http://localhost:3000 — handles /pricing without .html
```

`python3 -m http.server 8000` also works, but extensionless URLs like
`/pricing` will 404 under it, because in production that rewriting is
`cleanUrls` in `vercel.json`. Every nav link on the site uses that form, so use
`npx serve` if you are checking navigation.

## Deploying

**Pushing to `main` deploys the site.** Vercel builds from the repo root with
no build command, no output directory and framework preset "Other". There is
nothing to run.

| File | What it does |
|---|---|
| `vercel.json` | Security headers, the Content-Security-Policy, `cleanUrls`, immutable font caching |
| `.vercelignore` | Keeps maintainer-facing files out of the deployment entirely |

Two settings in `vercel.json` are load-bearing rather than cosmetic:

- **`cleanUrls: true`.** Every internal link on this site is extensionless
  (`/pricing`, never `/pricing.html`). Without it, `/` is the only URL that
  resolves and every other link on every page 404s.
- **`trailingSlash: false`.** The canonical tag on each page has no trailing
  slash. If the two disagree, every page becomes reachable at two URLs.

`.vercelignore` is how maintainer-facing files stay unreachable: anything
listed there is never uploaded, so there is no file to serve rather than a file
that has to be 404'd by a rule. **If you add another one, add it there in the
same commit.**

### DNS

`bndrvids.com` runs its DNS through Cloudflare, pointing at Vercel: an `A`
record on the apex and a `CNAME` on `www`.

**Both records must stay on grey cloud, "DNS only".** Cloudflare proxying in
front of Vercel means Vercel never sees the request and cannot complete its
certificate challenge. That has taken this site down once already.

If you ever repoint it, take the record values from Vercel's own Domains panel
rather than from anything written down here, which can go stale.

### Email, and the one record that is missing

Mail for `bndrvids.com` runs on Google Workspace (`MX 1 smtp.google.com`), and
DKIM is published at `google._domainkey`. DMARC is at **`p=reject; sp=reject;
adkim=s; aspf=s`**, which is full enforcement with strict alignment on both
legs.

**There is no SPF record on the domain.** With `p=reject`, that means every
message from `bndrvids.com` is riding on DKIM alone: if the DKIM signature ever
breaks, or a sender that is not Google sends on your behalf, the mail is
*rejected* rather than filtered, and you never see it bounce. The fix is one
TXT record on `@`:

```
v=spf1 include:_spf.google.com ~all
```

Add any other service that sends as this domain to that record, or make sure it
DKIM-signs with `d=bndrvids.com`. The DMARC `rua=` already points at
Cloudflare's DMARC reporting, so the reports that would show this are being
collected.

### BIMI

`assets/img/bimi-logo.svg` is a compliant SVG Tiny P/S file: square viewBox,
`baseProfile="tiny-ps"`, `<title>` first, solid background, no scripts or
external references, 741 bytes. The artwork is the favicon scaled to 78% about
the centre, because Gmail crops BIMI logos to a circle and the amber rule sat
outside it at full size.

**No BIMI record is published**, because Gmail will not display a logo without
a VMC or CMC certificate, and neither has been bought. The DMARC prerequisite
is already satisfied, so the only thing standing between this file and a logo
in the inbox is that certificate. When there is one:

```
default._bimi   TXT   v=BIMI1; l=https://bndrvids.com/assets/img/bimi-logo.svg; a=https://bndrvids.com/assets/img/bimi-vmc.pem
```

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
grants in `vercel.json`: `script-src` for the embed, `frame-src` for the
booker, `connect-src` for availability lookups, `img-src` for avatars. If a fifth third-party host ever appears in that policy, something
has been added that should not have been.

---

## Terms and Privacy

`/terms` and `/privacy` are linked from the footer of every page and listed in
the sitemap. Both are written from how this business actually works rather than
from a template, so they say real things: the 48-hour minimum notice, the
no-invoice-if-you-decline rule, that the video only shows what your photographs
show, that no analytics or tracking runs on this site.

**Two things need your attention before you rely on them.**

**Neither has been reviewed by a lawyer.** They were written to be accurate and
readable, which is not the same as being legally sufficient in your state. Have
someone qualified read them.

**Clause 12 of the Terms is deliberately unfinished.** Governing law needs the
state whose law applies and where disputes would be heard, which depends on
where the business is registered. It is left blank and visibly flagged on the
page rather than guessed at: a jurisdiction stated wrongly is worse than one not
stated at all. Fill it in, then remove the `legal__todo` styling from that
paragraph.

The clause worth reading yourself is **6, on photograph rights**. Listing
photographs are very often licensed to the agent or brokerage rather than owned
outright, and portals hold their own rights over what is uploaded to them. The
Terms put that risk on the customer, because we cannot verify it. That is a
commercial position, not a neutral fact, and you should be comfortable with it.

---

## Design constraints

Held deliberately, and checked rather than assumed:

- **No rounded corners anywhere.** Zero border-radius is a design-system rule.
- **No purple, and no gradient used as decoration.** The palette is four
  greys plus one amber. The only gradients are the hero scrim and the media
  placeholder, both greyscale.
- **No scroll-triggered animation.** There is no IntersectionObserver on this
  site and nothing is hidden waiting to be scrolled into view. Content is
  present when the page loads.
- **No em dashes in visitor-facing copy.** En dashes in numeric ranges
  (`1–3`, `8–10`) are a different character and are correct typography, so
  those stay.

There is still exactly **one scroll listener**, rAF-throttled, and two things
ride it. It switches the fixed header from transparent to a solid backdrop past
24px, without which the nav links sit unreadable over whatever scrolls beneath
them. And it drives the 2px progress line sitting on the header's bottom edge,
whose track is the same `--line` colour as that border, so the two read as one
rule with amber filling along it.

Both are readouts rather than effects: they report a scroll the reader
performed, they do not perform one. Nothing on this site starts moving because
an element came into view. If you add a third thing that needs scroll position,
put it in that same handler rather than adding a listener.

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
*.html                    eight pages plus 404.html, each self-contained
assets/css/site.css       the whole design system, heavily commented
assets/js/site.js         nav, the cal.com loader, three controls
assets/fonts/             both typefaces, self-hosted — see fonts/README.txt
vercel.json               headers, CSP, cleanUrls
.vercelignore             what never reaches the deployment
```

### The Content-Security-Policy

It lives in one place, `vercel.json`, and it is deliberately strict. Adding a
Google Fonts link, an analytics snippet or an embedded video would be blocked
outright rather than silently allowed. That is the intended behaviour, and
cal.com is the only exception anyone has made to it.

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

Three things in `site.js` are controls rather than decoration:

- **Photo gauge** (`how-it-works.html`) — restates the requirements table as a
  slider. **Its copy is that policy, not a new promise.** If the Photos row
  changes, the `BANDS` array in `site.js` changes with it, and the
  `grid-template-columns` on `.gauge__bands` too — those numbers are the count
  of slider values per band, so a drawn threshold sits where the verdict
  actually changes.
- **Compare slider** (homepage) — drags between a listing photograph and the
  frame it becomes. It carries the argument the missing footage would have
  carried, so it matters more than it looks until real video exists.
- **FAQ** — animates closing, which CSS cannot do alone, because a closed
  `<details>` hides its content before any transition can run.

All three degrade to working, unstyled behaviour without JavaScript.

---

## Known-good checks before a deploy

Worth thirty seconds after any change:

- Headings render in **DM Serif Display**, not Georgia. If they fall back, the
  CSP is doing its job and something is reaching for a third-party font.
- `/pricing`, `/how-it-works`, `/about`, `/contact` resolve **without** `.html`.
- No horizontal scrollbar at 390px wide.
- `/start` renders an actual cal.com calendar, not the fallback link. The
  fallback is deliberately silent, so a broken embed looks like a design
  choice unless you check.
