(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---------- line draw-on for the illustrations ---------- */
  function prep(svg) {
    if (svg._els) return;
    var out = [], i = 0;
    $$('.ln:not(.dash),.gd:not(.dash)', svg).forEach(function (el) {
      if (el.getAttribute('vector-effect')) return;
      var len;
      try { len = el.getTotalLength(); } catch (e) { return; }
      if (!len) return;
      el.style.strokeDasharray = len + ' ' + len;
      el.style.strokeDashoffset = len;
      el._len = len; el._i = i++;
      out.push(el);
    });
    svg._els = out;
  }
  function play(svg) {
    if (!svg._els) return;
    svg._t = Date.now();
    svg._els.forEach(function (el) {
      el.style.transition = 'stroke-dashoffset 1.9s cubic-bezier(.2,.7,.2,1) ' + Math.min(el._i * 40, 1100) + 'ms';
      el.style.strokeDashoffset = 0;
    });
  }
  function replay(svg) {
    if (!svg._els || Date.now() - (svg._t || 0) < 2600) return;
    svg._els.forEach(function (el) { el.style.transition = 'none'; el.style.strokeDashoffset = el._len; });
    void svg.getBoundingClientRect();
    play(svg);
  }
  var arts = $$('svg.art');
  if (!reduce) {
    arts.forEach(prep);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { play(e.target); io.unobserve(e.target); } });
      }, { threshold: .3 });
      arts.forEach(function (a) { io.observe(a); });
    } else arts.forEach(play);
    $$('.entry').forEach(function (en) {
      var s = $('svg.art', en);
      if (s) en.addEventListener('mouseenter', function () { replay(s); });
    });
  }

  /* ---------- depth parallax (pointer + scroll) ---------- */
  function depth(svg, nx, ny, k) {
    $$('[data-depth]', svg).forEach(function (g) {
      var d = parseFloat(g.getAttribute('data-depth')) * (k || .55);
      g.style.transform = 'translate(' + (-nx * d).toFixed(2) + 'px,' + (-ny * d).toFixed(2) + 'px)';
    });
  }
  if (!reduce) {
    var zone = $('[data-hero-zone]');
    if (zone && fine) {
      var hs = $('svg.art', zone);
      zone.addEventListener('pointermove', function (e) {
        var r = zone.getBoundingClientRect();
        depth(hs, (e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1, 1);
      });
      zone.addEventListener('pointerleave', function () { depth(hs, 0, 0); });
    }
    // essay hero art: layers drift with scroll
    var ea = $('.essay-art svg.art');
    if (ea) {
      var onS = function () {
        var r = ea.getBoundingClientRect(), c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        depth(ea, 0, clamp(c, -1, 1) * 1.4, .8);
      };
      window.addEventListener('scroll', onS, { passive: true }); onS();
      if (fine) {
        var fig = $('.essay-art');
        fig.addEventListener('pointermove', function (e) {
          var r = fig.getBoundingClientRect(), c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
          depth(ea, (e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1 + clamp(c, -1, 1), .9);
        });
      }
    }
    // entry cards: depth + tilt
    if (fine) $$('[data-tilt]').forEach(function (box) {
      var svg = $('svg.art', box);
      box.addEventListener('pointermove', function (e) {
        var r = box.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
        svg.style.setProperty('--ry', (nx * 5).toFixed(2) + 'deg');
        svg.style.setProperty('--rx', (-ny * 4).toFixed(2) + 'deg');
        depth(svg, nx, ny, .7);
      });
      box.addEventListener('pointerleave', function () {
        svg.style.setProperty('--ry', '0deg'); svg.style.setProperty('--rx', '0deg'); depth(svg, 0, 0);
      });
    });
  }

  /* ---------- cursor lens ---------- */
  if (fine && !reduce && $$('[data-cursor]').length) {
    var lens = document.createElement('div');
    lens.className = 'lens'; lens.setAttribute('aria-hidden', 'true'); lens.innerHTML = '<span></span>';
    document.body.appendChild(lens);
    var lx = 0, ly = 0, tx = 0, ty = 0, label = lens.firstChild;
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) { label.textContent = t.getAttribute('data-cursor'); lens.classList.add('on'); } else lens.classList.remove('on');
    });
    document.addEventListener('pointerleave', function () { lens.classList.remove('on'); });
    (function loop() {
      lx += (tx - lx) * .18; ly += (ty - ly) * .18;
      lens.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var n = parseInt(el.getAttribute('data-count'), 10);
    if (reduce || !n || !('IntersectionObserver' in window)) return;
    el.textContent = '0';
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = Date.now();
      (function tick() {
        var p = clamp((Date.now() - t0) / 1200, 0, 1);
        el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })();
    });
    o.observe(el);
  });

  /* ---------- filters ---------- */
  var chips = $$('.chip'), entries = $$('.entry'), cnt = $('#jcount');
  function filter(f) {
    var n = 0;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-f') === f ? 'true' : 'false'); });
    entries.forEach(function (e) {
      var show = f === 'all' || e.getAttribute('data-tags').split(' ').indexOf(f) > -1;
      if (show) {
        n++; e.classList.remove('gone');
        requestAnimationFrame(function () { requestAnimationFrame(function () { e.classList.remove('hide'); }); });
      } else {
        e.classList.add('hide');
        setTimeout(function () { if (e.classList.contains('hide')) e.classList.add('gone'); }, 480);
      }
    });
    if (cnt) cnt.textContent = n + ' of ' + entries.length;
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { filter(c.getAttribute('data-f')); }); });
  var h = (location.hash || '').replace('#', '');
  if (h && chips.some(function (c) { return c.getAttribute('data-f') === h; })) filter(h);

  /* ---------- fragments carousel ---------- */
  var track = $('.frag-track');
  if (track) {
    var frags = $$('.frag', track), fc = $('#fcount'), fbar = $('.frag-bar i');
    var step = function () { return frags[0].offsetWidth + 24; };
    var sync = function () {
      var max = track.scrollWidth - track.clientWidth, p = max > 0 ? track.scrollLeft / max : 0;
      var idx = clamp(Math.round(track.scrollLeft / step()) + 1, 1, frags.length);
      if (fc) fc.textContent = ('0' + idx).slice(-2) + ' / ' + ('0' + frags.length).slice(-2);
      if (fbar) fbar.style.left = (p * 84) + '%';
    };
    track.addEventListener('scroll', sync, { passive: true }); sync();
    $$('.frag-ctl .round').forEach(function (b) {
      b.addEventListener('click', function () { track.scrollBy({ left: parseInt(b.getAttribute('data-dir'), 10) * step(), behavior: reduce ? 'auto' : 'smooth' }); });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { track.scrollBy({ left: step(), behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { track.scrollBy({ left: -step(), behavior: 'smooth' }); e.preventDefault(); }
    });
    // mouse drag
    var down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) track.classList.add('drag');
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false; track.classList.remove('drag');
    });
    track.addEventListener('click', function (e) { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
  }

  /* ---------- progress: essay bar + back-to-top ring ---------- */
  var rp = $('.read-progress i'), art = $('.essay'), top = $('.to-top'), ring = top && $('.bar', top);
  function onScroll() {
    var vh = innerHeight, doc = document.documentElement;
    if (rp && art) {
      var r = art.getBoundingClientRect();
      rp.style.transform = 'scaleX(' + clamp((vh * .45 - r.top) / r.height, 0, 1).toFixed(4) + ')';
    }
    if (top) {
      var p = clamp(window.scrollY / Math.max(1, doc.scrollHeight - vh), 0, 1);
      top.classList.toggle('on', window.scrollY > 520);
      ring.style.strokeDashoffset = (160 * (1 - p)).toFixed(2);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- essay reading tools ---------- */
  var tools = $('.tools');
  if (tools && art) {
    var sizes = [17, 18, 20, 22, 25], si = parseInt(store('oa_size'), 10);
    if (isNaN(si) || si < 0 || si > 4) si = 2;
    var applySize = function () { art.style.setProperty('--es', sizes[si] + 'px'); };
    applySize();
    $$('[data-size]', tools).forEach(function (b) {
      b.addEventListener('click', function () { si = clamp(si + parseInt(b.getAttribute('data-size'), 10), 0, 4); applySize(); store('oa_size', String(si)); });
    });
    var fb = $('[data-focus]', tools), paras = $$('p, .pull', art);
    var fio = null;
    var setFocus = function (on) {
      document.body.classList.toggle('focus', on);
      fb.setAttribute('aria-pressed', on ? 'true' : 'false');
      store('oa_focus', on ? '1' : '0');
      if (on && !fio && 'IntersectionObserver' in window) {
        fio = new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.target.classList.toggle('cur', e.isIntersecting); });
        }, { rootMargin: '-42% 0px -42% 0px' });
        paras.forEach(function (p) { fio.observe(p); });
      }
    };
    fb.addEventListener('click', function () { setFocus(!document.body.classList.contains('focus')); });
    if (store('oa_focus') === '1') setFocus(true);
    var cp = $('[data-copy]', tools);
    cp.addEventListener('click', function () {
      var url = location.href.split('?')[0].split('#')[0];
      var done = function () { var t = cp.textContent; cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = t; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else done();
    });
  }
})();
