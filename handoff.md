# Handoff

Written 2026-09-15. State at commit `a7c663e`, branch `claude/site-review-updates-9ecgn9`,
which is identical to `main` and to both remotes.

---

## 1. Goal

BNDRVIDS sells property walkthrough videos built entirely from the listing photos a
property already has. No shoot, no crew, no site visit, no travel. The customer sends a
listing link or a folder of photos; the walkthrough is built **before** the sales call
and shown live on it; they pay only if they accept it.

**The site has exactly one job: get a visitor to `/start` and onto a 30-minute cal.com
call.** Every CTA on every page leads there. There is no second conversion path and no
second way to book. If you add one, you have changed the business, not the site.

Design constraints held deliberately throughout. These are not preferences that drifted
in; they were stated and they are checked:

- **No rounded corners anywhere.** Zero border-radius is a design-system rule.
- **No purple, and no gradient used as decoration.** Four greys plus one amber
  (`#E3A857`). The only gradients are the hero scrim and the media placeholder, both
  greyscale.
- **No scroll-triggered animation.** There is no IntersectionObserver on this site and
  nothing is hidden waiting to be scrolled into view.
- **No em dashes in visitor-facing copy.** En dashes in numeric ranges (`1–3`, `8–10`)
  are a different character and are correct typography, so those stay.
- **No pill-shaped buttons, no vague hero text.**

---

## 2. Current State

**Live at https://bndrvids.com, hosted on Vercel.** Pushing to `main` deploys. No build
step, no framework, no dependencies, no package.json.

### What works

| Thing | State |
|---|---|
| DNS | Apex `A` → `216.198.79.1` / `64.29.17.1`, `www` CNAME → `af2c94b775aca6ff.vercel-dns-017.com`. Both Vercel, both grey cloud. |
| Nameservers | `adel.ns.cloudflare.com`, `drew.ns.cloudflare.com` |
| Booking | cal.com embed at `/start`, event `bndrvids/30min`, 48h minimum notice, required `Property-Listing` booking question |
| Pages | Eight plus a 404, all resolving extensionless via `cleanUrls` |
| CSP | Strict. `default-src 'self'`. cal.com is the only third party, via four grants. |
| SPF | `v=spf1 include:_spf.google.com ~all` — live as of 2026-09-09 |
| DMARC | `p=reject; sp=reject; adkim=s; aspf=s` — full enforcement |
| DKIM | `google._domainkey`, valid RSA key |
| Sitemap | Generated from the pages by `tools/sitemap.py`, not maintained by hand |
| Audit | Clean across 9 pages × 3 widths: no console errors, no failed requests, no horizontal overflow, no target under 24px, DM Serif Display loading |

### What is missing, in order of how much it costs

**1. The site sells video and contains none.** Every `<video>` element ships without a
`<source>` — verified, there is not one active `<source>` tag in any page. What renders
is a poster image. `assets/video/` exists but is empty and holds nothing tracked by git.
This is the single largest gap by a wide margin and everything else here is smaller.

**2. Zero social proof.** No testimonials, no case studies, no named customers. There is
a deliberately empty testimonial block in `index.html`, commented out. **Do not invent a
quote to fill it** — a fabricated testimonial on a live business site is a real
liability and property managers check.

**3. Terms clause 12 is deliberately blank.** Governing law needs the state whose law
applies and where disputes would be heard. It is visibly flagged with `.legal__todo`
amber styling rather than guessed at. Fill it, then remove that class.

**4. Neither Terms nor Privacy has been reviewed by a lawyer.** They were written to be
accurate and readable, which is not the same as legally sufficient. Clause 6 on
photograph rights puts the licensing risk on the customer. That is a commercial
position, not a neutral fact.

**5. The Netlify project was never actually deleted.** `ac45bd8` removed `netlify.toml`,
`_headers` and `_redirects` from the repo, and this document previously said Netlify was
"deleted entirely". It was not. The project still exists, is still linked to this
repository, and still builds every push — it posted a deploy preview on PR #3. Verified
2026-09-15 via the Netlify API: project `6b96402b-9350-410f-9edd-e9f739442dcd`, claimed,
current deploy `ready`, and **`primarySiteUrl` still reads `https://bndrvids.com`**.

Three consequences, none of them currently breaking the live site:

- Netlify builds with no `netlify.toml`, so its copy ships **no CSP and no `cleanUrls`**.
  Every internal link on this site is extensionless, so on the Netlify copy everything
  except `/` 404s — the same failure documented in section 5 under "Vercel's first
  deploy served an old commit".
- Netlify still holds `bndrvids.com` as a custom domain. DNS points at Vercel, so this is
  a stale claim rather than a conflict, but it is a second party that believes it owns
  the apex.
- `privacy.html` names Vercel, Cal.com and Google as the subprocessors that see request
  logs. Anything served from the Netlify copy is logged by a fourth.

Deploy previews are gated (`requiresSSOTeamLogin` for non-production), so this is not
public exposure. **Do not delete the project or touch its domain settings without
checking what else is attached to that Netlify team first** — section 5 records what
happened the last time DNS was edited to fix something that turned out not to be broken.

**6. Placeholder images do double duty.** `hero-poster.jpg` and `walkthrough-poster.jpg`
are byte-identical, as are `brand-motion.jpg` and `process-poster.jpg`. Two abstract
graphics cover four slots and none of them shows a property.

### Not published

- **BIMI.** `assets/img/bimi-logo.svg` is a valid SVG Tiny P/S file, ready to use. The
  DNS record is live but logo-only (`v=BIMI1; l=...;`) because Gmail shows nothing
  without a VMC or CMC certificate, and none has been bought. Those run roughly
  $1,350–1,752/year; a VMC additionally needs a registered trademark, a CMC needs twelve
  months of documented logo use.
- **No social links anywhere.** An Instagram account exists (BNDRVIDS) but is not linked
  from the site and has no `sameAs` entry in the JSON-LD. Deliberate: a link to a thin
  profile is worse than no link.

---

## 3. Active files

```
index.html                homepage, JSON-LD Organization + Service, compare slider
pricing.html              $300 Standard / $450 Premium, FAQ
how-it-works.html         four steps, requirements table, photo gauge
about.html                founder section (two gaps marked "see README")
contact.html              email, and the aside that still says "1-3 business days"
start.html                the cal.com booker. noindex. The only booking path.
terms.html                13 clauses. Clause 12 blank on purpose.
privacy.html              names Vercel, Cal.com and Google as subprocessors
404.html                  has nav and site.js, no canonical

assets/css/site.css       ~1450 lines, the whole design system, heavily commented
assets/js/site.js         ~470 lines: nav, media labels, cal.com loader, FAQ,
                          compare slider, photo gauge, scroll progress, footer year
assets/fonts/             DM Sans + DM Serif Display, self-hosted
assets/img/               posters, logos, favicon, bimi-logo.svg
assets/video/             EMPTY, and untracked by git. This is the gap.

vercel.json               security headers, CSP, cleanUrls, immutable font caching
.vercelignore             what never reaches the deployment
sitemap.xml               generated, do not hand-edit
robots.txt                explains why /start is noindex rather than Disallow
tools/sitemap.py          regenerates sitemap.xml from the pages
README.md                 the long-form maintainer doc. Read it before editing.
```

### Things that will bite you

**`--nav-h: 72px`** is the header height, defined once in `:root`. Three things depend
on it: `.nav`, the mobile menu panel's top offset, and the scroll progress line. It was
written out three times before and drifted.

**`.nav` carries `transform: translateZ(0)`** for compositing, which makes it the
containing block for its `position: fixed` descendants. `bottom: 0` on a child resolves
against the 72px header, not the viewport. This is commented at the point it matters.

**The scroll progress line must follow `.nav` in source order.** `.nav.is-open ~
.progress` hides it while the mobile menu is open, and a sibling selector only looks
forward.

**There is exactly one scroll listener**, rAF-throttled, and two things ride it. If you
need scroll position for a third thing, put it in that handler rather than adding a
listener.

**The photo gauge's `BANDS` array in `site.js` is the Photos row of the requirements
table on `/how-it-works`.** It restates existing policy; it does not set new terms. If
that row changes, the array changes with it, and so does `grid-template-columns` on
`.gauge__bands`.

---

## 4. Changes made

This session, oldest first. All on `main` and the feature branch.

| Commit | What |
|---|---|
| `262d746` | Terms and Privacy pages; removed all scroll animation and em dashes |
| `978f5b7` | Compare slider (homepage) and format switcher (`/how-it-works`) |
| `5847233` | `vercel.json` + `.vercelignore` added alongside the Netlify config for the cutover |
| `a7f41cf` | Removed the "What comes back" section and the format switcher with it |
| `ac45bd8` | Netlify config removed from the repo; scroll progress line added |
| `ffeabf8` | Progress line moved onto the header's bottom edge; `--nav-h` introduced |
| `2365786` | BIMI-ready SVG logo; missing SPF record documented |
| `a7c663e` | `tools/sitemap.py`; sitemap generated rather than hand-maintained |

### Continuation, 2026-09-15

| Commit | What |
|---|---|
| (this branch) | Corrected the Netlify claim in section 2 — the project was never deleted and still builds every push. Documented state, no code or infrastructure changed. |
| (this branch) | Corrected three stale source comments. Two named the required cal.com booking question `listing`; the real slug is `Property-Listing` and `listing` is the exact bug documented in section 5. The third described `site.js` as having "four jobs" and as carrying the listing link "through to the request form", which was removed. Comments only — no visitor-facing text and no behaviour changed. |

Earlier in the same engagement, before this window: the FormSubmit request form and its
`/thanks` page were removed entirely and replaced by the cal.com booker (about 170 lines
of JS and 160 of CSS deleted), call length was set to 30 minutes throughout, and
FormSubmit was dropped from the CSP.

### Detail worth carrying forward

**`ac45bd8` touched a legal document.** `privacy.html` named Netlify as the host
processing server logs, in two clauses and in the subprocessor list. That was a factual
claim that went wrong the moment DNS moved. It now names Vercel. If the host ever
changes again, that file changes with it.

**`a7f41cf` needed a hairline.** Removing the middle section left two `.section--surface`
blocks adjacent, which fused into one tinted slab about half the page tall.
`.section--hairline` was already in the design system for exactly this and had no other
user.

**`a7c663e` dropped `<priority>` and `<changefreq>`** from the sitemap. Google ignores
both, so they were claiming a signal nothing reads.

---

## 5. Failed Attempts

Read this section before debugging anything. Every item cost real time.

### The cal.com calendar rendered nothing, and nothing threw

The first implementation appended `embed.js` and then defined `window.Cal` inside its
`onload`. That **overwrote the stub the script had just populated.** The script returned
200, no error appeared in the console, and the calendar never rendered.

The fix is cal.com's own loader snippet, unmodified, and **the order is the entire
fix**: the stub must exist before `embed.js` runs, because the script drains a queue the
stub creates. Verified working by checking `Cal.q.length === 3`.

### The prefill key was silently ignored

The booking-field prefill used `listing`. The real slug on the event type is
`Property-Listing`. **A prefill key matching no field is accepted and silently
discarded** — no warning, no error. If a prefill stops working, check the slug first.

### Vercel's first deploy served an old commit

Symptom: only the homepage loaded, and its content was stale. Both symptoms, one cause —
the deployed commit predated `vercel.json`, so `cleanUrls` was off. Every internal link
on this site is extensionless, so `/` resolved and **every other page 404'd**. The fix
was deleting the project and re-importing from GitHub with Framework Preset "Other",
empty build command, empty output directory.

If you ever see "only the homepage works," check whether `cleanUrls` is live before
anything else.

### Cloudflare's orange cloud took the site down

The apex was proxied by Cloudflare instead of resolving to the host. Cloudflare took the
request and had nowhere to send it, and the host could not complete its certificate
challenge. **Both records must stay on grey cloud, "DNS only".** This has broken the
site once and nearly again.

### The third "the site is down" was not the site

`ERR_CONNECTION_RESET` on the owner's MacBook, on one network. The site was up for
everyone else. `nslookup` failed for *every* domain with `recursion not available from
10.1.107.253` — the machine's configured DNS server refused to serve it. It worked
immediately on a phone hotspot.

**Before touching DNS over a "site is down" report, confirm it is down for more than one
person.** Editing correct records to fix a local problem would have broken it for
everyone.

### This environment cannot check whether the site is up

The egress proxy blocks `bndrvids.com`, `www.bndrvids.com` and `bndrvids.vercel.app`.
Worse, a raw TLS socket *appears* to succeed: the proxy MITMs the connection and its CA
is in the container's trust store, so you get a forged certificate with the right
common name and a clean handshake. The body is `403 host_not_allowed`.

**A successful TLS handshake from this container is not evidence the site is serving.**
DNS can be measured (raw UDP to `8.8.8.8` or to Cloudflare's authoritative nameservers
works). HTTP cannot. Adding `bndrvids.com` to the environment's network egress allowlist
would fix this.

### CSS mistakes that looked like something else

- **`.finale` buttons sat left under a centred heading.** `text-align: center` does not
  move flex children. Needed `justify-content: center`.
- **`.finale .micro` was 313px off-centre.** The global `p { max-width: 68ch }` shrank
  the box and the text centred *within* it. Needed `margin-inline: auto`.
- **`.legal` applied to `.container`** capped a centred container's width, which pushed
  the body column 220px right of its own heading. Fixed by nesting a `.legal` div inside.
- **The compare layer overflowed the viewport at 390px.** `.media--16x9` kept its ratio
  inside a 4:3 frame. Needed `aspect-ratio: auto`.
- **A `.section__head` had a dead column.** Removing the sub-paragraph left the `h2` in a
  7fr column beside an empty 5fr. Needed `h2:last-child { grid-column: 1 / -1 }`.

### Shell and tooling

- **`pkill -f serve.py` returns exit 144** and kills the shell if it is part of a
  compound command. Run it alone.
- **`scrollTo()` in a Playwright check is animated**, because `html { scroll-behavior:
  smooth }`. A progress-bar test read 10px into the scroll and reported 0.003 instead of
  1.0. Use `scrollTo({top, behavior: 'instant'})` and wait two rAFs.
- **Regex edits to markup need verification.** Every one was checked by diffing visible
  text against `git show HEAD:<file>` to prove only the intended change landed. Two
  deletions were caught by assertions before they were written — one would have swallowed
  the cal.com loader.

### A published DNS record that was wrong

The BIMI record went live with `a=https://bndrvids.com/assets/img/bimi-vmc.pem` pointing
at a file that does not exist, because the record was handed over with the certificate
parameter included and the certificate was never bought. It has since been corrected to
logo-only. **Do not add `a=` back until a VMC or CMC actually exists.**

---

## 6. Next steps

Ordered. This ordering came out of a five-advisor council run on 2026-09-15 and was
unanimous on the top item.

### Do first

**1. Put three finished videos on the homepage.** The scaffolding is already in the
markup: drop the files into `assets/video/` and restore the commented `<source>` line
above each one. Self-hosted MP4s need **zero CSP changes**.

Build them from photographs you own outright — your own place, a friend's, a unit you
photograph yourself, or properly licensed interiors. **Not scraped from Zillow.** Listing
photographs are copyrighted by the photographer or the MLS and licensed for that listing
only. The site's own Terms put that risk on the customer; do not point it at yourself.

| File to add | Used by |
|---|---|
| `hero-loop.mp4` | homepage hero background |
| `walkthrough-demo.mp4` | homepage "photos in, walkthrough out" |
| `process-vertical.mp4` | `how-it-works.html` |
| `about-vertical.mp4` | `about.html` |

**2. Show one finished video to a working leasing agent and ask whether compliance would
let them post it.** AI motion applied to still photos invents geometry — it will widen a
hallway or fabricate a window reveal. In leasing that is a misrepresentation question,
not an aesthetic one. This answer reorders everything below it, and it cannot be
answered from a desk.

**3. Start logging per build:** hours spent, credits burned, photos in, minutes out,
accepted yes/no. Every "revisit later" below depends on data that is not currently being
recorded.

### Explicitly do not do yet

- **Variable or cost-plus pricing.** Rejected unanimously. Runway credits are a prepaid
  pool, not marginal cost; the real cost is hours. And cost-plus reinstates the shoot-fee
  model the whole pitch deletes ("same price whether the unit is four blocks or four
  states away"). If the economics ever break, vary on **doors covered**, never credits,
  seconds or photo count. "Flat now, variable later" is not sequencing — it is a
  pre-announced price increase to the first customers.
- **Bundle discounts.** Discounting an unproven product, and stacking a discount on top
  of "you don't pay if you don't like it" says the guarantee is not believed. If someone
  asks for five, say yes at full price and deliver them. That is the capacity test. A
  monthly slot comes later; a discount pack does not.
- **An embedded social feed.** A plain link costs nothing. An embed would be the first
  breach of a CSP that has permitted exactly one third party since day one.
- **Automated posting of client properties.** Publishing someone's building on delivery,
  using photos whose rights are not held, before they have approved it.

### Smaller, and cheap

- Fill Terms clause 12 and remove `.legal__todo` from that paragraph.
- Have a lawyer read Terms and Privacy.
- Add a payment mechanism. There is currently none documented anywhere — "pay only if
  you accept" has no mechanism behind it. A Stripe payment link is ten minutes.
- Add `sameAs` to the JSON-LD Organization block in `index.html` with the Instagram URL.
  Invisible to visitors, helps Google connect the profile and the business.
- Add the visible Instagram link only once the grid has **nine or more posts of finished
  walkthroughs**. Footer base row, inline SVG glyph (not an icon font, CSP),
  `target="_blank" rel="noopener"`.
- Reconsider the 48-hour cal.com minimum notice once there is proof on the site. It
  exists because the video is built before the call, which is a real trade, but it is
  friction on a $300 purchase.
- Two abstract graphics currently cover four poster slots. Replace with real property
  stills.
- Submit `bndrvids.com` for categorisation with Cisco Talos, Palo Alto, Fortinet and
  Zscaler. Newly-registered domains get blocked by corporate content filters, and
  property managers sit behind corporate networks.

### Housekeeping

- `tools/sitemap.py` must be run after adding or removing a page. It refuses to write if
  a page's canonical disagrees with its route.
- If you add another maintainer-facing file to the repo, add it to `.vercelignore` in the
  same commit.
- A 15-minute bug-check cron (`35b37afa`) was running in the originating session. It is
  session-scoped and will not survive.
