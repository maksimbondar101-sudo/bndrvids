/* ============================================================================
   BNDRVIDS — site behaviour
   Four jobs, nothing else: nav state, one reveal gesture, media load state,
   and carrying a pasted listing link through to the request form.
   ========================================================================== */
(function () {
  'use strict';

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
              'href="mailto:hello@bndrvids.com">hello@bndrvids.com</a> and we’ll pick it up from there.';
          }
        });
    });
  }

  /* --- Footer year ---------------------------------------------------------
     querySelectorAll, not querySelector: there is one per page today, and the
     day someone adds a second the singular version silently leaves it stale. */
  var thisYear = String(new Date().getFullYear());
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = thisYear;
  });
})();
