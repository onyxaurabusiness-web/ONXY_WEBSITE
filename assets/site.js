(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- personalisation: ?for=BrandName ---------- */
  var forName = '';
  try {
    var qp = new URLSearchParams(location.search).get('for');
    if (qp) {
      forName = qp.replace(/[^\p{L}\p{N} &.'\-]/gu, '').trim().slice(0, 60);
      if (forName) sessionStorage.setItem('oa_for', forName);
    } else {
      forName = sessionStorage.getItem('oa_for') || '';
    }
  } catch (e) {}

  if (forName) {
    document.querySelectorAll('[data-for-name]').forEach(function (el) { el.textContent = forName; });
    document.querySelectorAll('.for-bar').forEach(function (el) { el.classList.add('on'); });
    document.querySelectorAll('.for-only').forEach(function (el) { el.hidden = false; });
    document.querySelectorAll('.for-hide').forEach(function (el) { el.hidden = true; });
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(mailto:|tel:|#|https?:)/.test(h)) return;
      if (h.indexOf('for=') > -1) return;
      var hash = '', i = h.indexOf('#');
      if (i > -1) { hash = h.slice(i); h = h.slice(0, i); }
      h += (h.indexOf('?') > -1 ? '&' : '?') + 'for=' + encodeURIComponent(forName);
      a.setAttribute('href', h + hash);
    });
  }

  /* ---------- header ---------- */
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var mb = document.querySelector('.menu-btn');
  function setMenu(open) {
    if (!nav || !mb) return;
    nav.classList.toggle('open', open);
    mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (!open) closePanels();
  }
  function closePanels(except) {
    document.querySelectorAll('.mi.open').forEach(function (li) {
      if (li === except) return;
      li.classList.remove('open');
      var b = li.querySelector('.mc'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  if (mb) mb.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  document.querySelectorAll('.mc').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = b.closest('.mi'), open = !li.classList.contains('open');
      closePanels(li);
      li.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) b.blur();
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.mi')) closePanels(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closePanels();
    if (nav && nav.classList.contains('open')) setMenu(false);
    if (document.activeElement && document.activeElement.blur && document.activeElement.closest && document.activeElement.closest('.mi')) document.activeElement.blur();
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1180) setMenu(false); });
  document.querySelectorAll('.pnav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- reveal ---------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- statement: words light up with scroll ---------- */
  var stmt = document.querySelector('[data-statement]');
  if (stmt) {
    var q = stmt.querySelector('[data-words]');
    var words = q.textContent.trim().split(/\s+/);
    q.setAttribute('aria-label', words.join(' '));
    q.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
    var spans = q.querySelectorAll('.w');
    var paint = function () {
      var r = stmt.getBoundingClientRect(), span = r.height - window.innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / (span * .8))) : 1;
      var n = Math.round(p * spans.length);
      spans.forEach(function (s, i) { s.classList.toggle('on', i < n); });
    };
    if (reduce) spans.forEach(function (s) { s.classList.add('on'); });
    else { window.addEventListener('scroll', paint, { passive: true }); paint(); }
  }

  /* ---------- contact form ---------- */
  var form = document.getElementById('enquiry');
  if (form) {
    var seg = form.querySelector('input[name=segment]');
    var btns = form.querySelectorAll('.seg button');
    var groups = form.querySelectorAll('.seg-fields');
    var setSeg = function (v) {
      seg.value = v;
      btns.forEach(function (b) { b.classList.toggle('on', b.dataset.seg === v); b.setAttribute('aria-pressed', b.dataset.seg === v); });
      groups.forEach(function (g) {
        var on = g.dataset.seg === v;
        g.classList.toggle('on', on);
        g.querySelectorAll('input,select,textarea').forEach(function (f) { f.disabled = !on; });
      });
      form.querySelectorAll('[data-not-for]').forEach(function (el) {
        var hide = el.getAttribute('data-not-for').split(' ').indexOf(v) > -1;
        el.hidden = hide;
        el.querySelectorAll('input,select,textarea').forEach(function (f) { f.disabled = hide; });
      });
      var msg = form.querySelector('[data-msg]');
      if (msg) msg.textContent = v === 'gold' ? 'Tell us about the occasion (optional)' : 'Message';
    };
    btns.forEach(function (b) { b.addEventListener('click', function () { setSeg(b.dataset.seg); }); });
    var pre = new URLSearchParams(location.search).get('seg');
    setSeg(pre && form.querySelector('.seg button[data-seg="' + pre + '"]') ? pre : 'gold');
    var about = (new URLSearchParams(location.search).get('about') || '').replace(/[^a-z-]/gi, '').slice(0, 30);
    var msgBox = form.querySelector('textarea[name=message]');
    if (about && msgBox && !msgBox.value) msgBox.value = 'Please write to me when ' + about.charAt(0).toUpperCase() + about.slice(1) + ' is ready to order.';
    var co = form.querySelector('input[name=company]');
    if (co && forName && !co.value) co.value = forName;

    var note = document.getElementById('formNote');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      note.className = ''; note.textContent = '';
      var fd = new FormData(form), data = {};
      fd.forEach(function (v, k) { if (String(v).trim()) data[k] = String(v).trim(); });
      if (data.website) return; // honeypot
      var em = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.name || !data.email || !em.test(data.email)) {
        note.className = 'err'; note.textContent = 'Please add your name and a valid email address.'; return;
      }
      data.invitedAs = forName || '';
      var sub = form.querySelector('button[type=submit]'); sub.disabled = true;
      fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error('x'); return r.json(); })
        .then(function () {
          note.className = 'ok';
          note.textContent = 'Received. A member of our team will write to you personally.';
          form.reset(); setSeg(data.segment || 'gold');
        })
        .catch(function () {
          var lines = []; Object.keys(data).forEach(function (k) { lines.push(k + ': ' + data[k]); });
          location.href = 'mailto:hello@onyxaura.in?subject=' + encodeURIComponent('ONYXAURA enquiry — ' + (data.segment || '')) + '&body=' + encodeURIComponent(lines.join('\n'));
          note.className = 'err'; note.textContent = 'Something did not go through. Please write to hello@onyxaura.in and we will answer.';
        })
        .then(function () { sub.disabled = false; });
    });
  }

  function whenNear(el, fn, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: (margin || 300) + 'px' });
    o.observe(el);
  }

  /* hero video: autoplay, but respect reduced motion and data saver */
  var hv = document.querySelector('.hero-bg');
  if (hv) {
    var saver = navigator.connection && navigator.connection.saveData;
    if (reduce || saver) { hv.removeAttribute('autoplay'); hv.pause(); }
    else { var pl = hv.play(); if (pl && pl.catch) pl.catch(function () {}); }
  }

  if (!reduce) {
    var stage = document.querySelector('.foot-stage');
    if (stage) stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      stage.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      stage.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  /* the Gold bottle on the home page: the model from the Gold page, turning slowly (assets/gold-bottle.js) */
  var g3 = document.getElementById('gold3d');
  if (g3) whenNear(g3, function () {
    import('/assets/gold-bottle.js').then(function (m) { m.mount(g3, { auto: !reduce, yaw: -.6, zoom: 1.02, shadow: true, backdrop: { glow: '#c5b358', a0: .07, t1: .9, a1: 0, t2: .91, size: [.9, .7] } }); }).catch(function () {});
  }, 600);

  /* line drawings draw themselves the first time they are seen */
  var arts = document.querySelectorAll('.soon-art');
  if (arts.length && 'IntersectionObserver' in window && !reduce) {
    var ao = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); ao.unobserve(e.target); } }); }, { threshold: .3 });
    arts.forEach(function (a) { ao.observe(a); });
  } else arts.forEach(function (a) { a.classList.add('drawn'); });

  /* the founder's drawing and the road draw themselves on first sight */
  var once = function (el, fn) {
    if (!el) return;
    if (!('IntersectionObserver' in window) || reduce) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold: .35 });
    o.observe(el);
  };
  once(document.querySelector('.founder-mark'), function () { document.querySelector('.founder-mark').classList.add('drawn'); });
  var road = document.querySelector('[data-road]');
  once(road, function () {
    var items = road.querySelectorAll('li'), now = 0;
    items.forEach(function (li, i) { if (li.classList.contains('now')) now = i; });
    items.forEach(function (li, i) { if (i < now) li.classList.add('done'); });
    road.style.setProperty('--p', ((now + .5) / items.length).toFixed(3));
  });

  /* numbers count up the first time they are seen */
  var counts = document.querySelectorAll('[data-countup]');
  if (counts.length && 'IntersectionObserver' in window && !reduce) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, to = parseFloat(el.getAttribute('data-countup')), t0 = performance.now();
        (function step(now) { var p = Math.min(1, (now - t0) / 1400), k = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * k); if (p < 1) requestAnimationFrame(step); })(t0);
      });
    }, { threshold: .5 });
    counts.forEach(function (el) { el.textContent = '0'; co.observe(el); });
  }
})();
