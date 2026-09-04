/* ============================================================================
   BNDRVIDS — site behaviour
   Four jobs, nothing else: nav state, one reveal gesture, media load state,
   and carrying a pasted listing link through to the request form.
   ========================================================================== */
(function () {
  'use strict';

  /* window.location.search on the real site; the single-page preview build
     swaps this for its own router state. One accessor, so nothing else has to
     know which context it is running in. */
  var PREVIEW_SEARCH = function () { return window.location.search; };

  /* --- Nav: solidify on scroll, toggle on mobile -------------------------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    /* rAF-throttled: the raw scroll event fires far more often than the screen
       repaints, and doing class work on every one of them is what makes a
       fixed header feel like it's dragging behind the page. */
    var ticking = false;
    var wasScrolled = null;
    var setNavState = function () {
      var scrolled = window.scrollY > 24;
      if (scrolled !== wasScrolled) {
        wasScrolled = scrolled;
        nav.classList.toggle('is-scrolled', scrolled);
      }
      ticking = false;
    };
    setNavState();
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(setNavState); }
    }, { passive: true });

    var toggle = nav.querySelector('.nav__toggle');
    var panel = nav.querySelector('.nav__links');
    if (toggle) {
      var setMenu = function (open) {
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Close' : 'Menu';
        /* Without this the page kept scrolling under a fixed menu panel, so
           closing it dropped you somewhere you never chose to go. */
        document.body.style.overflow = open ? 'hidden' : '';

        /* The panel sits BEFORE the toggle in source order, so tabbing forward
           from an open menu walked straight past it into the page underneath —
           a keyboard or switch user could open the menu and never reach a
           single link in it. Send focus into the panel on open, and hand it
           back to the button that opened it on close. */
        if (open) {
          var first = panel && panel.querySelector('a');
          if (first) first.focus();
        }
      };

      /* Keep Tab inside the panel while it is open. Without the wrap, focus
         leaves at either end and lands on content the menu is covering. */
      if (panel) {
        panel.addEventListener('keydown', function (event) {
          if (event.key !== 'Tab' && event.keyCode !== 9) return;
          if (!nav.classList.contains('is-open')) return;

          var stops = panel.querySelectorAll('a[href]');
          if (!stops.length) return;
          var first = stops[0];
          var last = stops[stops.length - 1];

          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            toggle.focus();          /* backwards out of the panel = the button */
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        });
      }

      toggle.addEventListener('click', function () {
        setMenu(!nav.classList.contains('is-open'));
      });

      /* Escape is the expected way out of any overlay. It previously only moved
         focus to the Close button and left the menu standing. */
      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' && event.keyCode !== 27) return;
        if (!nav.classList.contains('is-open')) return;
        setMenu(false);
        toggle.focus();
      });

      /* Tapping the link for the page you are already on navigates nowhere, so
         the menu would sit there open over the page you asked to see. Close it
         without pulling focus — the browser is about to move focus itself. */
      Array.prototype.forEach.call(nav.querySelectorAll('.nav__links a'), function (link) {
        link.addEventListener('click', function () {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = 'Menu';
          document.body.style.overflow = '';
        });
      });

      /* Crossing back to desktop with the menu open leaves body scroll locked
         on a layout that no longer has a menu to close. */
      window.addEventListener('resize', function () {
        if (window.innerWidth > 860 && nav.classList.contains('is-open')) setMenu(false);
      });
    }
  }

  /* --- Reveal: fade + 12px rise, once, staggered 60ms --------------------- */
  var reveals = document.querySelectorAll('.reveal');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var showAll = function () {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  };

  if (reduced || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });

    /* Safety net: if the observer hasn't fired for anything already on screen
       within a second, reveal everything. Better a missed animation than a
       page that renders blank. */
    window.setTimeout(function () {
      if (!document.querySelector('.reveal.is-in')) showAll();
    }, 1000);
  }

  /* --- Media: hide the filename label once real footage loads -------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.media'), function (frame) {
    var video = frame.querySelector('video');
    var image = frame.querySelector('img');

    if (video) {
      var mark = function () { frame.classList.add('is-loaded'); };
      if (video.readyState >= 2) mark();
      video.addEventListener('loadeddata', mark);

      /* A <video> with no source file still paints its poster, but loadeddata
         never fires — so the filename label would sit on top of a perfectly
         good image. Check the poster separately. */
      var posterSrc = video.getAttribute('poster');
      if (posterSrc) {
        var probe = new Image();
        probe.onload = mark;
        probe.src = posterSrc;
      }

      /* Tiles play on hover (desktop) and on tap (touch); the hero loops always.
         The touch half of that was only ever a comment — nothing was bound to
         it — so on a phone these tiles were a still frame with no way to make
         them move. That is the entire product demo, unreachable on the device
         most of this traffic arrives on.

         Hover is gated on a fine pointer so a touch browser's synthesised
         mouseenter can't fire the play-then-pause pair on the same tap that is
         meant to start it. */
      if (frame.hasAttribute('data-hover')) {
        var play = function () {
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        };
        var stop = function () {
          video.pause();
          video.currentTime = 0;
        };

        var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        if (fine) {
          frame.addEventListener('mouseenter', play);
          frame.addEventListener('mouseleave', stop);
        } else {
          /* Tap to start, tap again to stop. A tile that plays once and can
             never be replayed is worse than one that never played. */
          frame.addEventListener('click', function () {
            if (video.paused) play(); else stop();
          });
        }

        /* Keyboard parity — but only once there is something to play. While
           these tiles are still empty scaffolding (poster, no <source>), a
           focusable role="button" would be a tab stop that does nothing, which
           is a worse defect than the one it fixes. The moment a file is dropped
           in, the tile becomes a real control. */
        if (video.getAttribute('src') || video.querySelector('source')) {
          frame.setAttribute('tabindex', '0');
          frame.setAttribute('role', 'button');
          if (!frame.getAttribute('aria-label')) {
            frame.setAttribute('aria-label', 'Play preview video');
          }
          frame.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ' && event.keyCode !== 13 && event.keyCode !== 32) return;
            event.preventDefault();
            if (video.paused) play(); else stop();
          });
          frame.addEventListener('blur', stop);
        }
      }
    }

    if (image) {
      /* A missing src paints the browser's broken-image glyph on top of the
         placeholder, which is the single loudest "this site is unfinished"
         signal there is. Hide the element and let the graded panel show. */
      var fail = function () { image.style.visibility = 'hidden'; };
      if (image.complete && !image.naturalWidth) fail();
      image.addEventListener('error', fail);

      if (image.complete && image.naturalWidth) frame.classList.add('is-loaded');
      image.addEventListener('load', function () {
        image.style.visibility = '';
        frame.classList.add('is-loaded');
      });
    }
  });

  /* --- Listing link: carry it from any hero/CTA field into /start ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-listing-form]'), function (form) {
    form.addEventListener('submit', function (event) {
      var field = form.querySelector('input[name="listing"]');
      var value = field ? field.value.trim() : '';

      /* A field of spaces satisfies `required`, so the browser waved it through
         and the form — which has no action — re-GET'd the current page with
         ?listing=+++ in the URL. From the visitor's side the button reloaded
         the page and lost their scroll position. Report it as empty instead. */
      if (!value) {
        event.preventDefault();
        if (field) {
          field.value = '';
          field.setCustomValidity('Paste a listing link so we know which property to build.');
          field.reportValidity();
          field.addEventListener('input', function clear() {
            field.setCustomValidity('');
            field.removeEventListener('input', clear);
          });
        }
        return;
      }

      event.preventDefault();
      window.location.href = '/start?listing=' + encodeURIComponent(value);
    });
  });

  /* Prefill the request form when arriving from a hero field. */
  var target = document.querySelector('#listing-field');
  if (target) {
    var passed = new URLSearchParams(window.location.search).get('listing');
    if (passed) {
      target.value = passed;
      /* Name, not email — it is the next empty field in the form. Landing the
         cursor on Email meant shift-tabbing back to fill the field above it. */
      var next = document.querySelector('#name-field');
      if (next) next.focus();
    }
  }

  /* --- Call request: post to the mail service, then show the thank-you ------
     Posting via fetch rather than a normal form POST means no absolute _next
     redirect is needed, so the same markup works on localhost and on whatever
     domain this ends up on. If anything fails the visitor gets the address to
     email instead of a dead end — a silently broken form is the most expensive
     bug a small site can have.
    ----------------------------------------------------------------------- */
  var callForm = document.querySelector('form[data-mail-endpoint]');
  if (callForm && window.fetch) {
    var submitBtn = callForm.querySelector('[type="submit"]');
    var btnLabel = submitBtn ? submitBtn.textContent : '';

    /* A checkbox group can't be `required` natively, so validate it here.
       Clear the warning the moment they pick something. */
    var chipGroups = callForm.querySelectorAll('[data-chip-group]');
    var chipsChosen = function () {
      var ok = true;
      Array.prototype.forEach.call(chipGroups, function (group) {
        var picked = !!group.querySelector('input:checked');
        group.classList.toggle('is-invalid', !picked);
        if (!picked) ok = false;
      });
      return ok;
    };

    Array.prototype.forEach.call(chipGroups, function (group) {
      group.addEventListener('change', function () {
        if (group.querySelector('input:checked')) group.classList.remove('is-invalid');
        /* Drop the warning as soon as every group has an answer. */
        var inline = callForm.querySelector('[data-chip-note]');
        if (!inline || inline.hidden) return;
        var allAnswered = true;
        Array.prototype.forEach.call(chipGroups, function (g) {
          if (!g.querySelector('input:checked')) allAnswered = false;
        });
        if (allAnswered) inline.hidden = true;
      });
    });

    /* Weekend calls are mornings only. Rule out the later slots when the choice
       is weekend-ONLY — if a weekday is also ticked, the afternoon genuinely is
       available on that weekday, so leave it alone. */
    var dayGroup = callForm.querySelector('[data-chip-group="days"]');
    var timeGroup = callForm.querySelector('[data-chip-group="times"]');
    var weekendNote = callForm.querySelector('[data-weekend-note]');

    if (dayGroup && timeGroup) {
      var syncWeekend = function () {
        var weekend = false, weekday = false;
        Array.prototype.forEach.call(dayGroup.querySelectorAll('input:checked'), function (input) {
          if (input.hasAttribute('data-weekend')) weekend = true; else weekday = true;
        });
        var restrict = weekend && !weekday;

        Array.prototype.forEach.call(timeGroup.querySelectorAll('input'), function (input) {
          if (input.hasAttribute('data-weekend-ok')) return;
          input.disabled = restrict;
          /* Clear anything already picked that just became unavailable, so a
             ruled-out slot can never end up in the submission. */
          if (restrict && input.checked) input.checked = false;
        });

        if (weekendNote) weekendNote.hidden = !restrict;
        /* Unchecking may have emptied the group — re-flag it if it was already
           being warned about, but never warn before they have tried to submit. */
        if (restrict && timeGroup.classList.contains('is-invalid') && timeGroup.querySelector('input:checked')) {
          timeGroup.classList.remove('is-invalid');
        }
      };

      dayGroup.addEventListener('change', syncWeekend);
      syncWeekend();
    }

    callForm.addEventListener('submit', function (event) {
      /* Native validation first. Checking chips first meant someone who left
         both the listing link and the chips empty was told about the chips,
         fixed them, submitted again, and only then heard about the link —
         two rounds to discover two problems that were visible at once. */
      if (!callForm.checkValidity()) return;      /* let the browser complain */

      if (chipGroups.length && !chipsChosen()) {
        event.preventDefault();
        var firstEmpty = null;
        Array.prototype.forEach.call(chipGroups, function (group) {
          if (!firstEmpty && !group.querySelector('input:checked')) firstEmpty = group;
        });
        var anchor = firstEmpty || chipGroups[0];

        /* The note lives beside the submit button, ~790px below the chips.
           Scrolling to the chips put the only explanation of what went wrong
           well below the fold, so the form just appeared to do nothing. Put the
           message where the eye is being sent. */
        var inline = callForm.querySelector('[data-chip-note]');
        if (inline) {
          inline.hidden = false;
          inline.textContent = 'Pick at least one day and one time that work for you.';
        }
        var note0 = callForm.querySelector('[data-form-note]');
        if (note0) { note0.hidden = true; note0.textContent = ''; }

        anchor.scrollIntoView({ block: 'center', behavior: 'smooth' });
        var firstChip = anchor.querySelector('input:not(:disabled)');
        if (firstChip) firstChip.focus({ preventScroll: true });
        return;
      }

      event.preventDefault();

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      var note = callForm.querySelector('[data-form-note]');
      if (note) { note.textContent = ''; note.hidden = true; }

      /* The day and time chips share a name each so they can multi-select, which
         puts repeated keys in the payload. Whether the mail service renders all
         of them or keeps only the last is its business, not something to bet a
         booking on — someone picking Mon/Wed/Fri could arrive as just "Friday"
         and you'd schedule the wrong call without ever knowing values were
         dropped. Collapse each group into one readable field before sending. */
      var payload = new FormData(callForm);
      ['days', 'times'].forEach(function (key) {
        var picked = payload.getAll(key);
        payload.delete(key);
        payload.set(key, picked.length ? picked.join(', ') : '—');
      });

      fetch(callForm.getAttribute('data-mail-endpoint'), {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: payload
      })
        .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
        .then(function () { window.location.href = '/thanks'; })
        .catch(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = btnLabel; }
          if (note) {
            note.hidden = false;
            note.innerHTML = 'That didn’t send. Email <a class="textlink" ' +
              'href="mailto:bndrvids@gmail.com">bndrvids@gmail.com</a> and we’ll pick it up from there.';
          }
        });
    });
  }

  /* --- cal.com booker -------------------------------------------------------
     ┌───────────────────────────────────────────────────────────────────────┐
     │  SET THIS to your cal.com link and the booker replaces the form on    │
     │  /start. Leave it as-is and nothing changes — the form keeps working. │
     │                                                                       │
     │  Format is the path after cal.com, e.g. 'bndrvids/walkthrough'.       │
     │  Not a full URL.                                                      │
     └───────────────────────────────────────────────────────────────────────┘

     Before you set it, open the event type on cal.com and set MINIMUM BOOKING
     NOTICE. The walkthrough is built before the call, so a slot bookable two
     hours out is a promise this business cannot keep. Set it to the real
     turnaround. Everything else on the site depends on that being honest. */
  var CAL_LINK = 'bndrvids/30min';

  var booking = document.querySelector('[data-cal-embed]');
  if (booking && CAL_LINK) {
    var callForm0 = document.querySelector('[data-call-form]');
    var fallback = document.querySelector('[data-cal-fallback]');
    var direct = document.querySelector('[data-cal-direct]');
    var settled = false;

    /* Whatever they pasted into a hero field travels with them. Asking for the
       listing twice — once to get here, once inside the booker — is the exact
       friction this whole page exists to remove. */
    var carried = new URLSearchParams(PREVIEW_SEARCH()).get('listing') || '';

    if (direct) {
      direct.href = 'https://cal.com/' + CAL_LINK +
        (carried ? '?listing=' + encodeURIComponent(carried) : '');
    }

    var giveUp = function () {
      if (settled) return;
      settled = true;
      booking.hidden = true;
      if (fallback) fallback.hidden = false;
      /* The form is the safety net, so bring it back rather than leaving the
         visitor with an apology and no way to act on it. */
      if (callForm0) callForm0.hidden = false;
    };

    var succeed = function () {
      if (settled) return;
      settled = true;
      booking.hidden = false;
      if (callForm0) callForm0.hidden = true;
      if (fallback) fallback.hidden = true;
      /* Step 01 promised an email within 1-3 days. It no longer does. */
      var step = document.querySelector('[data-step-confirm]');
      if (step) step.innerHTML = '<span>01</span> Your slot is confirmed the moment you book — ' +
        'calendar invite included, nothing to wait for.';
    };

    /* Hide the form immediately so the two never flash side by side, but only
       once we know JS is running and about to try. */
    if (callForm0) callForm0.hidden = true;

    var script = document.createElement('script');
    script.src = 'https://app.cal.com/embed/embed.js';
    script.async = true;

    script.onerror = giveUp;
    script.onload = function () {
      try {
        /* cal.com's own snippet, inlined rather than pasted as an opaque blob
           so the next person can see what it does. */
        (function (C, A, L) {
          var p = function (a, ar) { a.q.push(ar); };
          var d = C.document;
          C.Cal = C.Cal || function () {
            var cal = C.Cal, ar = arguments;
            if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; cal.loaded = true; }
            if (ar[0] === L) {
              var api = function () { p(api, arguments); };
              api.q = api.q || [];
              cal.ns[ar[1]] = api; p(cal, ar); return;
            }
            p(cal, ar);
          };
        })(window, 'https://app.cal.com/embed/embed.js', 'init');

        window.Cal('init', { origin: 'https://cal.com' });
        window.Cal('inline', {
          elementOrSelector: '#cal-booking',
          calLink: CAL_LINK,
          config: carried ? { listing: carried } : {}
        });
        /* The site's palette, so the booker does not arrive as a white panel
           in the middle of a black page. */
        window.Cal('ui', {
          theme: 'dark',
          cssVarsPerTheme: { dark: { 'cal-brand': '#E3A857' } },
          hideEventTypeDetails: false,
          layout: 'month_view'
        });
        succeed();
      } catch (e) {
        giveUp();
      }
    };

    /* The failure that actually bites is not onerror — it is the embed script
       loading fine and never rendering anything: a blocker serving an empty
       200, cal.com up but wedged, a bad calLink. succeed() runs optimistically
       the moment the API accepts the call, so this check has to be able to
       overrule it. Clearing `settled` is what lets it; without that, giveUp()
       early-returns and the visitor keeps staring at an empty box. */
    window.setTimeout(function () {
      if (booking.querySelector('iframe')) return;    /* it rendered — done */
      settled = false;
      giveUp();
    }, 6000);

    document.head.appendChild(script);
  }

  /* --- FAQ: animate the close as well as the open --------------------------
     CSS can animate opening on its own, because [open] lands before the
     transition runs. Closing it cannot: the browser hides a closed <details>
     element's content immediately, so the panel is gone before any transition
     has a frame to play in. Intercepting the click is the only way to keep the
     answer on screen long enough to collapse.

     Without JS this degrades to the native snap — still a working accordion.
  ----------------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.faq details'), function (item) {
    var panel = item.querySelector('.faq__a');
    var summary = item.querySelector('summary');
    if (!panel || !summary) return;

    /* The grid-rows collapse needs a child to size against, so the answer's
       own contents move into a wrapper. Done here rather than in the markup
       so the HTML stays readable and a JS-less page keeps plain <p> children. */
    var inner = document.createElement('div');
    inner.className = 'faq__inner';
    while (panel.firstChild) inner.appendChild(panel.firstChild);
    panel.appendChild(inner);

    var closing = false;

    summary.addEventListener('click', function (event) {
      if (reduced) return;                       /* native snap, no waiting */
      if (!item.open || closing) return;         /* opening is CSS's job */

      event.preventDefault();
      closing = true;
      item.classList.add('is-closing');

      var done = function () {
        item.open = false;
        item.classList.remove('is-closing');
        closing = false;
      };

      /* transitionend can be missed — an interrupted transition, a display
         change mid-flight, a tab backgrounded. The timeout guarantees the
         panel actually closes rather than sitting half-collapsed forever. */
      var fallback = window.setTimeout(done, 460);
      panel.addEventListener('transitionend', function once(e) {
        if (e.propertyName !== 'grid-template-rows') return;
        panel.removeEventListener('transitionend', once);
        window.clearTimeout(fallback);
        done();
      });
    });
  });

  /* --- Scroll progress ------------------------------------------------------
     Same rAF throttle as the nav state, and for the same reason: this reads
     scrollY, and doing that per scroll event rather than per frame is how a
     progress bar ends up costing more than the page it measures. */
  var progress = document.querySelector('.nav__progress');
  if (progress) {
    var pTicking = false;
    var drawProgress = function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      /* A page shorter than the viewport has no progress to report, and the
         division would be by zero. */
      var ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progress.style.transform = 'scaleX(' + ratio + ')';
      pTicking = false;
    };
    drawProgress();
    window.addEventListener('scroll', function () {
      if (!pTicking) { pTicking = true; window.requestAnimationFrame(drawProgress); }
    }, { passive: true });
    window.addEventListener('resize', drawProgress);
  }

  /* --- The swap sequence ----------------------------------------------------
     Plays once when the block arrives, and again on demand. Restarting a CSS
     animation needs the class off, a reflow read, then the class back on —
     without the read the browser coalesces both changes into no change. */
  var swap = document.querySelector('.swap');
  if (swap) {
    var playSwap = function () {
      swap.classList.remove('is-playing');
      void swap.offsetWidth;                 /* forces the restart; do not remove */
      swap.classList.add('is-playing');
    };

    if (reduced || !('IntersectionObserver' in window)) {
      swap.classList.add('is-playing');
    } else {
      var swapIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          playSwap();
          swapIO.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      swapIO.observe(swap);
    }

    var replay = swap.querySelector('[data-swap-replay]');
    if (replay) replay.addEventListener('click', playSwap);
  }

  /* --- Listing field: name the portal back --------------------------------
     Recognition only — nothing here blocks a submission. Someone pasting a
     link we do not know still has a working form; they just get "your own
     site" instead of a brand name. The one case worth flagging is text that
     is not a link at all, because that is the one that wastes an email. */
  var PORTALS = [
    { host: 'zillow.',        name: 'Zillow' },
    { host: 'apartments.com', name: 'Apartments.com' },
    { host: 'redfin.',        name: 'Redfin' },
    { host: 'realtor.com',    name: 'Realtor.com' },
    { host: 'trulia.',        name: 'Trulia' },
    { host: 'rent.com',       name: 'Rent.com' },
    { host: 'hotpads.',       name: 'HotPads' },
    { host: 'streeteasy.',    name: 'StreetEasy' },
    { host: 'padmapper.',     name: 'PadMapper' },
    { host: 'zumper.',        name: 'Zumper' },
    { host: 'loopnet.',       name: 'LoopNet' },
    { host: 'costar.',        name: 'CoStar' },
    { host: 'drive.google.',  name: 'Google Drive', folder: true },
    { host: 'photos.google.', name: 'Google Photos', folder: true },
    { host: 'dropbox.',       name: 'Dropbox', folder: true },
    { host: 'onedrive.',      name: 'OneDrive', folder: true },
    { host: '1drv.ms',        name: 'OneDrive', folder: true },
    { host: 'icloud.',        name: 'iCloud', folder: true },
    { host: 'wetransfer.',    name: 'WeTransfer', folder: true },
    { host: 'box.com',        name: 'Box', folder: true }
  ];

  var describeListing = function (value) {
    var v = value.trim();
    if (!v) return null;

    var host = '';
    try {
      /* Most people paste without a scheme. Adding one is what makes URL()
         usable here instead of a regex that has to re-learn hostnames. */
      host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : 'https://' + v).hostname.toLowerCase();
    } catch (e) {
      host = '';
    }

    /* No dot in the host means it is not a domain — it is a sentence, an
       address, or a unit number. That is the only case worth correcting. */
    if (!host || host.indexOf('.') === -1) {
      return { warn: true, html: 'That doesn\u2019t look like a link. Paste the listing URL, or a link to a folder of photos.' };
    }

    for (var i = 0; i < PORTALS.length; i++) {
      if (host.indexOf(PORTALS[i].host) !== -1) {
        return PORTALS[i].folder
          ? { html: '<b>' + PORTALS[i].name + '</b> \u2014 we\u2019ll pull the photos from the folder.' }
          : { html: '<b>' + PORTALS[i].name + '</b> listing \u2014 we\u2019ll pull the photos from it.' };
      }
    }
    return { html: '<b>' + host.replace(/^www\./, '') + '</b> \u2014 we\u2019ll pull the photos from it.' };
  };

  Array.prototype.forEach.call(document.querySelectorAll('[data-listing-form]'), function (form) {
    var field = form.querySelector('input[name="listing"]');
    if (!field) return;

    var note = document.createElement('span');
    note.className = 'listingnote';
    note.setAttribute('aria-live', 'polite');
    form.appendChild(note);

    var update = function () {
      var result = describeListing(field.value);
      if (!result) {
        note.classList.remove('is-shown', 'is-warn');
        note.innerHTML = '';
        return;
      }
      note.innerHTML = result.html;
      note.classList.toggle('is-warn', !!result.warn);
      note.classList.add('is-shown');
    };

    field.addEventListener('input', update);
    field.addEventListener('paste', function () { window.setTimeout(update, 0); });
    if (field.value) update();
  });

  /* --- Photo gauge ----------------------------------------------------------
     Bands and copy are the requirements table on /how-it-works, unchanged —
     this control restates the site's existing policy, it does not set new
     terms. If that policy changes, it changes in both places. */
  var gauge = document.querySelector('[data-gauge]');
  if (gauge) {
    var slider  = gauge.querySelector('input[type="range"]');
    var count   = gauge.querySelector('[data-gauge-count]');
    var verdict = gauge.querySelector('[data-gauge-verdict]');
    var vTitle  = verdict.querySelector('strong');
    var vBody   = verdict.querySelector('p');
    var bands   = gauge.querySelectorAll('.gauge__bands i');
    var marks   = gauge.querySelectorAll('.gauge__scale span');

    var BANDS = [
      { max: 3, band: 0, low: true,
        title: 'We\u2019d tell you not to bother.',
        body: 'Below four photos there isn\u2019t enough to build a walkthrough worth paying for. Send it anyway \u2014 we\u2019ll say so before you pay, rather than take the money.' },
      { max: 9, band: 1,
        title: 'Six works. Expect a short one.',
        body: 'Bad lighting and odd angles we can work with, and usually improve. What we can\u2019t do is invent coverage \u2014 the walkthrough only goes where your photos went.' },
      { max: 15, band: 2,
        title: 'Plenty.',
        body: 'Ten to fifteen covers a unit comfortably, room by room, with enough angles to move between them rather than cut.' },
      { max: Infinity, band: 3,
        title: 'Ideal.',
        body: 'More than fifteen is where this gets good \u2014 every extra angle gives the walkthrough somewhere else to go.' }
    ];

    var render = function () {
      var n = parseInt(slider.value, 10);
      var match = BANDS[0];
      for (var i = 0; i < BANDS.length; i++) { if (n <= BANDS[i].max) { match = BANDS[i]; break; } }

      count.textContent = n >= 30 ? '30+' : String(n);

      Array.prototype.forEach.call(bands, function (b, i) {
        b.classList.toggle('is-active', i <= match.band);
      });
      /* The label lights for the band you are IN, not every band you passed —
         the filled bar already shows how far along you are. */
      Array.prototype.forEach.call(marks, function (m, i) {
        m.classList.toggle('is-active', i === match.band);
      });

      if (vTitle.textContent === match.title) return;   /* same band, no flicker */
      verdict.classList.add('is-changing');
      window.setTimeout(function () {
        vTitle.textContent = match.title;
        vTitle.classList.toggle('is-low', !!match.low);
        vBody.textContent = match.body;
        verdict.classList.remove('is-changing');
      }, reduced ? 0 : 180);
    };

    slider.addEventListener('input', render);
    render();
  }

  /* --- Footer year ---------------------------------------------------------
     querySelectorAll, not querySelector: there is one per page today, and the
     day someone adds a second the singular version silently leaves it stale. */
  var thisYear = String(new Date().getFullYear());
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = thisYear;
  });
})();
