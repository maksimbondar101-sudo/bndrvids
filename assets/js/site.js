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

  /* --- cal.com booker -------------------------------------------------------
     The path after cal.com — 'bndrvids/30min', not a full URL. This is now the
     only way a call gets booked on this site; the request form it replaced has
     been removed, so emptying this string leaves /start with nothing but the
     fallback link.

     Two settings on the cal.com event type carry weight nothing here can
     enforce: MINIMUM NOTICE, which must cover the time it takes to build a
     walkthrough before the call, and a required booking question named
     `listing`, which is where the carried URL below lands. See README. */
  var CAL_LINK = 'bndrvids/30min';

  var booking = document.querySelector('[data-cal-embed]');
  if (booking && CAL_LINK) {
    var fallback = document.querySelector('[data-cal-fallback]');
    var direct = document.querySelector('[data-cal-direct]');
    var settled = false;

    /* A ?listing= parameter is still honoured if one arrives — an old link, a
       campaign URL — but nothing on the site produces one any more: the
       listing is a required question on the cal.com booking form itself.
       The key is the field's slug on the event type, 'Property-Listing'. A key
       matching no field is accepted and ignored, so a wrong one fails silently. */
    var carried = new URLSearchParams(PREVIEW_SEARCH()).get('listing') || '';
    var LISTING_FIELD = 'Property-Listing';
    var prefill = {};
    if (carried) prefill[LISTING_FIELD] = carried;

    if (direct && carried) {
      direct.href = 'https://cal.com/' + CAL_LINK +
        '?' + LISTING_FIELD + '=' + encodeURIComponent(carried);
    }

    /* There is no second booking mechanism to fall back to now, so failing
       means handing over the same calendar as a link. Its href is in the
       markup, so it works even with JavaScript off entirely. */
    var giveUp = function () {
      if (settled) return;
      settled = true;
      booking.hidden = true;
      if (fallback) fallback.hidden = false;
    };

    /* cal.com's own loader snippet. The ORDER is the entire fix: this stub has
       to exist before embed.js runs, because the script drains a queue the stub
       creates. The previous version appended the script first and defined Cal
       in its onload — replacing the stub the script had just populated with an
       empty one, so every queued call was dropped. The script 200s, nothing
       throws, and no calendar ever appears. That was the bug.

       The stub injects the script itself. Do not also append it. */
    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal, ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement('script')).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else {
            p(cal, ar);
          }
          return;
        }
        p(cal, ar);
      };
    })(window, 'https://app.cal.com/embed/embed.js', 'init');

    try {
      window.Cal('init', { origin: 'https://cal.com' });
      window.Cal('inline', {
        elementOrSelector: '#cal-booking',
        calLink: CAL_LINK,
        config: prefill
      });
      /* Themed to the site, so the booker is not a white panel in a black page. */
      window.Cal('ui', {
        theme: 'dark',
        cssVarsPerTheme: { dark: { 'cal-brand': '#E3A857' } },
        hideEventTypeDetails: false,
        layout: 'month_view'
      });
    } catch (e) {
      giveUp();
    }

    /* One arbiter, and the only honest one: did an iframe actually appear?
       A script 200-ing proves nothing — that is precisely what the old version
       mistook for success. Rendering IS success; there is no succeed(). */
    window.setTimeout(function () {
      if (booking.querySelector('iframe')) return;
      giveUp();
    }, 6000);
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
