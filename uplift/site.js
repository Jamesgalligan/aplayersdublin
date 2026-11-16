/* A Players Dublin, Niall's version. Plain script, no libraries: the hero's three photographs, the countdown,
   things arriving as they scroll in, the photograph that follows the six lines, the speaker profiles, the film,
   and the forms. Review copy: nothing typed into a form is sent anywhere. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ---------- the nav goes solid, and the bar appears, once the hero is behind you ---------- */
  var nav = $('#nav'), bar = $('#bar'), hero = $('.hero');
  function onScroll() {
    var y = window.scrollY || 0;
    nav.classList.toggle('solid', y > 40);
    var nearEnd = window.innerHeight + y > document.documentElement.scrollHeight - 360;
    bar.classList.toggle('show', y > hero.offsetHeight * 0.8 && !nearEnd);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- the hero: each of the three photographs changes in turn ---------- */
  if (!reduce) {
    var panes = $$('.pane'), turn = 0;
    setInterval(function () {
      if (document.hidden) return;
      var imgs = $$('img', panes[turn % panes.length]), i = 0;
      imgs.forEach(function (im, n) { if (im.classList.contains('on')) i = n; });
      imgs[i].classList.remove('on');
      imgs[(i + 1) % imgs.length].classList.add('on');
      turn++;
    }, 2800);
  }

  /* ---------- the countdown to the doors opening ---------- */
  var count = $('#count'), doors = new Date((window.DUBLIN && window.DUBLIN.doorsOpen) || '2026-12-18T10:00:00Z');
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var s = Math.floor((doors - new Date()) / 1000);
    if (!(s > 0)) { count.textContent = 'The doors are open'; return; }
    count.innerHTML = 'Doors open in <b>' + Math.floor(s / 86400) + '</b> days <b>' + two(Math.floor(s % 86400 / 3600)) + '</b>h <b>' +
      two(Math.floor(s % 3600 / 60)) + '</b>m <b>' + two(s % 60) + '</b>s';
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- things arrive as they scroll in ----------
     A plain position check on scroll: anything whose top is above the bottom of the screen is shown, and stays
     shown. Nothing can be left invisible by a missed observer callback. */
  var rises = $$('.rise'), revealQueued = false;
  function reveal() {
    revealQueued = false;
    var vh = window.innerHeight, vw = window.innerWidth;
    rises = rises.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (reduce || (r.top < vh * 0.95 && r.left < vw)) { el.classList.add('in'); return false; }
      return true;
    });
  }
  function queueReveal() { if (!revealQueued && rises.length) { revealQueued = true; requestAnimationFrame(reveal); } }
  window.addEventListener('scroll', queueReveal, { passive: true });
  window.addEventListener('resize', queueReveal);
  window.addEventListener('load', reveal);
  var rail = $('#spk-rail');
  if (rail) rail.addEventListener('scroll', queueReveal, { passive: true });
  reveal();

  /* ---------- the weekend at a glance: the photograph follows the line you are on ---------- */
  var six = $$('#six li'), stageImgs = $$('#stage .s'), cap = $('#stage-cap'), current = 0, hovering = false, queued = false;
  function pick(i) {
    if (i === current) return;
    current = i;
    six.forEach(function (li, n) { li.classList.toggle('on', n === i); });
    stageImgs.forEach(function (im, n) { im.classList.toggle('on', n === i); });
    cap.textContent = six[i].getAttribute('data-cap') || '';
  }
  six.forEach(function (li, i) { li.addEventListener('mouseenter', function () { hovering = true; pick(i); }); });
  if (six.length) $('#six').addEventListener('mouseleave', function () { hovering = false; });
  function follow() {
    queued = false;
    if (hovering || window.innerWidth <= 900 || !six.length) return;
    var mid = window.innerHeight * 0.5, best = 0, dist = 1e9;
    six.forEach(function (li, i) {
      var r = li.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    pick(best);
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(follow); } }, { passive: true });

  /* ---------- dialogs ---------- */
  var dProfile = $('#dlg-profile'), dForm = $('#dlg-form');
  function open(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function shut(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  [dProfile, dForm].forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) shut(d); });
  });

  /* a speaker's profile, in James's words (data.js) */
  $$('.spk[data-profile]').forEach(function (card) {
    card.addEventListener('click', function () {
      var p = (window.PROFILES || {})[card.getAttribute('data-profile')];
      if (!p) return;
      var img = $('img', card), name = $('h3', card).textContent;
      $('#prof').innerHTML = '<img src="' + esc(img.getAttribute('src')) + '" alt="' + esc(name) + '">' +
        '<div class="p-txt"><p class="label" style="color:var(--ink-mute)">' + esc(p.stage || p.kicker || '') + '</p><h3>' + esc(name) + '</h3>' +
        '<p class="p-role label">' + esc([p.role, p.based].filter(Boolean).join(' · ')) + '</p>' +
        (p.lede ? '<p class="p-lede">' + p.lede + '</p>' : '') +
        (p.story || []).map(function (x) { return '<p class="b">' + x + '</p>'; }).join('') +
        ((p.teach || []).length ? '<h4>On the main stage</h4><ul>' + p.teach.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      dProfile.scrollTop = 0;
      open(dProfile);
    });
  });

  /* the forms. Nothing here is sent: Reserve carries on to the checkout stand-in, the others say thanks. */
  function field(label, name, type, extra) {
    return '<div' + (extra && extra.full ? ' class="full"' : '') + '><label>' + label + '<input name="' + name + '" type="' + (type || 'text') + '"' +
      (extra && extra.optional ? '' : ' required') + (extra && extra.min ? ' min="' + extra.min + '" value="' + extra.min + '"' : '') + ' autocomplete="' + ((extra && extra.auto) || 'off') + '"></label></div>';
  }
  var FORMS = {
    reserve: function (ticket) {
      return '<p class="label" style="color:var(--ink-mute)">Dublin · 18 to 20 December 2026</p><h3>Reserve your <em>seat.</em></h3>' +
        '<form><div class="picks">' +
        '<label><input type="radio" name="ticket" value="GA"' + (ticket === 'VIP' ? '' : ' checked') + '>General Admission<small>Saturday 19. The conference, lunch and the afterparty.</small></label>' +
        '<label><input type="radio" name="ticket" value="VIP"' + (ticket === 'VIP' ? ' checked' : '') + '>VIP Experience<small>Saturday 19 and Sunday 20. Adds the gala.</small></label></div>' +
        '<div class="fgrid">' + field('First name', 'first', 'text', { auto: 'given-name' }) + field('Last name', 'last', 'text', { auto: 'family-name' }) +
        field('Email', 'email', 'email', { auto: 'email' }) + field('Phone', 'phone', 'tel', { auto: 'tel' }) + '</div>' +
        '<div class="go"><button class="pill" type="submit">Continue to checkout</button><span class="note">Flights and accommodation not included.</span></div></form>';
    },
    vvip: function () {
      return '<p class="label" style="color:var(--ink-mute)">VVIP · 20 seats · Friday 18 to Sunday 20 December</p><h3>Request <em>access.</em></h3>' +
        '<form data-thanks="Request received. Twenty seats, and we reply within 24 hours."><div class="fgrid">' +
        field('First name', 'first', 'text', { auto: 'given-name' }) + field('Last name', 'last', 'text', { auto: 'family-name' }) +
        field('Email', 'email', 'email', { auto: 'email' }) + field('Phone', 'phone', 'tel', { auto: 'tel' }) + field('Company', 'company', 'text', { auto: 'organization' }) +
        '<div><label>Monthly revenue<select name="revenue" required><option value="">Select a range</option><option>€0 to 5k</option><option>€5k to 10k</option><option>€10k to 25k</option><option>€25k to 100k</option><option>€100k to 500k</option><option>€500k+</option></select></label></div>' +
        field('What are you building? (optional)', 'building', 'text', { full: true, optional: true }) + '</div>' +
        '<div class="go"><button class="pill" type="submit">Request access</button><span class="note">Twenty seats. We reply within 24 hours.</span></div></form>';
    },
    team: function () {
      return '<p class="label" style="color:var(--ink-mute)">Dublin · 18 to 20 December 2026</p><h3>Bring your <em>team.</em></h3>' +
        '<form data-thanks="Request received. We reply within 24 hours with seats and pricing."><div class="fgrid">' +
        field('Company', 'company', 'text', { auto: 'organization' }) + field('Your name', 'name', 'text', { auto: 'name' }) +
        field('Email', 'email', 'email', { auto: 'email' }) + field('Phone', 'phone', 'tel', { auto: 'tel' }) + field('Seats', 'seats', 'number', { min: 5 }) +
        '<div><label>Ticket type<select name="type" required><option>GA · Saturday 19</option><option>VIP · Saturday 19 and Sunday 20</option><option>VVIP · All three days</option></select></label></div></div>' +
        '<div class="go"><button class="pill" type="submit">Request team seats</button><span class="note">From 5 seats, together in a reserved block.</span></div></form>';
    },
    names: function () {
      return '<p class="label" style="color:var(--ink-mute)">The speakers</p><h3>Hear the names <em>first.</em></h3>' +
        '<form data-thanks="You are on the list. The next names reach you before anyone else."><div class="fgrid">' +
        field('First name', 'first', 'text', { auto: 'given-name' }) + field('Email', 'email', 'email', { auto: 'email' }) + '</div>' +
        '<div class="go"><button class="pill" type="submit">Put me on the list</button></div></form>';
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]');
    if (!b) return;
    var kind = b.getAttribute('data-open');
    if (!FORMS[kind]) return;
    $('#form').innerHTML = FORMS[kind](b.getAttribute('data-ticket'));
    dForm.setAttribute('aria-label', kind === 'reserve' ? 'Reserve your seat' : kind === 'vvip' ? 'Request VVIP access' : kind === 'team' ? 'Bring your team' : 'Hear the names first');
    dForm.scrollTop = 0;
    open(dForm);
    var first = $('#form input:not([type=radio])');
    if (first) first.focus();
  });
  dForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, thanks = f.getAttribute('data-thanks');
    if (thanks) {
      $('#form').innerHTML = '<div class="thanks"><p class="label" style="color:var(--ink-mute)">Thank you</p><h3>' + esc(thanks.split('. ')[0]) + '<em>.</em></h3>' +
        '<p class="note" style="margin-top:14px">' + esc(thanks.split('. ').slice(1).join('. ')) + '</p><div class="go"><button class="pill" type="button" data-close>Back to the weekend</button></div></div>';
      return;
    }
    var t = (f.querySelector('input[name=ticket]:checked') || {}).value || 'GA';
    window.location.href = '../checkout.local.html#' + t;
  });

  /* ---------- the film plays while it is on screen ---------- */
  var reel = $('#reel'), reelBtn = $('#reel-btn'), reelIco = $('#reel-ico'), paused = reduce;
  var PAUSE = 'M3 2h3v10H3zM8 2h3v10H8z', PLAY = 'M3 1.5l9 5.5-9 5.5z';
  function showState() { reelIco.setAttribute('d', reel.paused ? PLAY : PAUSE); reelBtn.setAttribute('aria-label', reel.paused ? 'Play the film' : 'Pause the film'); }
  if (reel) {
    reelBtn.addEventListener('click', function () { paused = !reel.paused; if (reel.paused) reel.play().catch(function () {}); else reel.pause(); });
    reel.addEventListener('play', showState);
    reel.addEventListener('pause', showState);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !paused) reel.play().catch(function () {});
          else if (!e.isIntersecting) reel.pause();
        });
      }, { threshold: 0.25 }).observe(reel);
    }
    showState();
  }
})();
