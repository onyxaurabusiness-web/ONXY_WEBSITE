/* ONYXAURA · Partnerships: drawn rooms with hotspots, a label proof you can edit, the process. No libraries. */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pressed(btns, on) { btns.forEach(function (b) { var y = b === on; b.classList.toggle('on', y); b.setAttribute('aria-pressed', y ? 'true' : 'false'); }); }
  function onceVisible(el, fn, threshold) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold: threshold || .3 });
    o.observe(el);
  }

  /* ---------- hero: a survey crosshair that follows the pointer ---------- */
  var hero = $('[data-hero]');
  if (hero && fine) {
    var raf0 = 0;
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || raf0) return;
      raf0 = requestAnimationFrame(function () {
        raf0 = 0; var r = hero.getBoundingClientRect();
        hero.style.setProperty('--cx', (e.clientX - r.left).toFixed(1) + 'px'); hero.style.setProperty('--cy', (e.clientY - r.top).toFixed(1) + 'px');
        hero.classList.add('live');
      });
    });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('live'); });
  }

  /* ---------- the drawings: drawn on as they arrive, and they lean toward the pointer ---------- */
  function prep(svg) {
    var out = [], i = 0;
    $$('.ln:not(.dash):not(.dim),.gd:not(.dash)', svg).forEach(function (el) {
      var len; try { len = el.getTotalLength(); } catch (e) { return; }
      if (!len) return;
      el.style.strokeDasharray = len + ' ' + len; el.style.strokeDashoffset = len; el._len = len; el._i = i++; out.push(el);
    });
    svg._els = out;
  }
  function play(svg) {
    if (!svg._els) return; svg._t = Date.now();
    svg._els.forEach(function (el) {
      el.style.transition = 'stroke-dashoffset 1.9s cubic-bezier(.2,.7,.2,1) ' + Math.min(el._i * 38, 1100) + 'ms';
      el.style.strokeDashoffset = 0;
    });
  }
  function replay(svg) {
    if (!svg._els || Date.now() - (svg._t || 0) < 2800) return;
    svg._els.forEach(function (el) { el.style.transition = 'none'; el.style.strokeDashoffset = el._len; });
    void svg.getBoundingClientRect(); play(svg);
  }
  $$('[data-fig]').forEach(function (fig) {
    var svg = $('svg.art', fig); if (!svg) return;
    if (!reduce) { prep(svg); onceVisible(fig, function () { play(svg); }, .3); }
    if (fine && !reduce) {
      var groups = $$('[data-depth]', svg), raf = 0;
      fig.addEventListener('pointermove', function (e) {
        var r = fig.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          groups.forEach(function (g) { var d = parseFloat(g.getAttribute('data-depth')) * .55; g.style.transform = 'translate(' + (-nx * d).toFixed(2) + 'px,' + (-ny * d).toFixed(2) + 'px)'; });
        });
      });
      fig.addEventListener('pointerleave', function () { groups.forEach(function (g) { g.style.transform = ''; }); });
      fig.addEventListener('pointerenter', function () { replay(svg); });
    }

    /* hotspots: one card at a time; hover previews, click keeps it open */
    var spots = $$('.hs', fig);
    if (!spots.length) return;
    var card = document.createElement('div'); card.className = 'hs-card'; card.hidden = true; card.setAttribute('role', 'status'); fig.appendChild(card);
    var cur = null, pinned = false;
    function show(b) {
      cur = b; spots.forEach(function (x) { x.setAttribute('aria-expanded', x === b ? 'true' : 'false'); });
      card.innerHTML = '<b></b><span></span>'; card.firstChild.textContent = b.getAttribute('data-h'); card.lastChild.textContent = b.getAttribute('data-t');
      var x = parseFloat(b.style.getPropertyValue('--x')), y = parseFloat(b.style.getPropertyValue('--y')), lh = fig.clientWidth * .75;
      card.style.left = clamp(x, 24, 76) + '%';
      if (y < 48) { card.style.top = (y / 100 * lh + 26) + 'px'; card.style.transform = 'translateX(-50%)'; }
      else { card.style.top = (y / 100 * lh - 26) + 'px'; card.style.transform = 'translate(-50%,-100%)'; }
      card.hidden = false;
    }
    function hide() { cur = null; pinned = false; card.hidden = true; spots.forEach(function (x) { x.setAttribute('aria-expanded', 'false'); }); }
    spots.forEach(function (b) {
      b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', b.getAttribute('data-h'));
      b.addEventListener('click', function (e) { e.stopPropagation(); if (cur === b && pinned) hide(); else { show(b); pinned = true; } });
      if (fine) {
        b.addEventListener('mouseenter', function () { if (!pinned) show(b); });
        b.addEventListener('mouseleave', function () { if (!pinned) hide(); });
      }
      b.addEventListener('focus', function () { if (!pinned) show(b); });
    });
    document.addEventListener('click', function (e) { if (cur && !e.target.closest('.hs')) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) hide(); });
  });

  /* ---------- the label proof ---------- */
  var proof = $('[data-proof]');
  if (proof) {
    var psvg = $('.proof-svg', proof), pname = $('[data-pf-name]', proof), pstd = $('[data-pf-std]', proof), pin = $('#pf-in', proof);
    var vbtns = $$('[data-pf-v]', proof), cbtns = $$('[data-pf-c]', proof), chk = $('[data-pf-chk]', proof);
    var st = { v: 'glass', c: 'obsidian', std: false };
    var seed = ''; try { seed = (sessionStorage.getItem('oa_for') || '').slice(0, 18); } catch (e) {}
    if (seed) pin.value = seed;
    var paint = function () {
      var clean = pin.value.replace(/[^\p{L}\p{N} &.'\-]/gu, '').slice(0, 18).trim();
      psvg.setAttribute('data-v', st.v); psvg.setAttribute('data-c', st.c);
      pname.textContent = (clean || 'Your name').toUpperCase();
      pname.style.opacity = clean ? 1 : .45;
      var glass = st.v === 'glass', cy, max;
      if (glass) { cy = st.std ? 236 : 255; max = st.std ? 104 : 128; } else { cy = st.std ? 244 : 261; max = st.std ? 150 : 184; }
      pname.setAttribute('transform', 'translate(120 ' + cy + ') rotate(-90)');
      pname.style.fontSize = '15px';
      var len = pname.getComputedTextLength ? pname.getComputedTextLength() : 0;
      if (len > max) pname.style.fontSize = (15 * max / len).toFixed(2) + 'px';
      pstd.style.display = st.std ? '' : 'none';
      pstd.setAttribute('transform', 'translate(120 ' + (glass ? 302 : 336) + ')');
    };
    pin.addEventListener('input', paint);
    vbtns.forEach(function (b) { b.addEventListener('click', function () { st.v = b.getAttribute('data-pf-v'); pressed(vbtns, b); paint(); }); });
    cbtns.forEach(function (b) { b.addEventListener('click', function () { st.c = b.getAttribute('data-pf-c'); pressed(cbtns, b); paint(); }); });
    chk.addEventListener('change', function () { st.std = chk.checked; paint(); });
    paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  }

  /* ---------- the process ---------- */
  var proc = $('[data-process]');
  if (proc) {
    var list = $('.p-steps', proc), steps = $$('.ps', proc), read = $('[data-pread]', proc), touched = false, timer = 0;
    var setStep = function (i, user) {
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); s.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      list.style.setProperty('--i', i);
      read.textContent = steps[i].parentNode.getAttribute('data-d');
      if (user) { touched = true; clearInterval(timer); }
    };
    steps.forEach(function (s, k) {
      s.addEventListener('click', function () { setStep(k, true); });
      if (fine) s.addEventListener('mouseenter', function () { setStep(k, true); });
      s.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        var j = clamp(k + d, 0, steps.length - 1); steps[j].focus(); setStep(j, true); e.preventDefault();
      });
    });
    setStep(0);
    if (!reduce) onceVisible(list, function () {
      var k = 0; timer = setInterval(function () { k++; if (touched || k > steps.length - 1) { clearInterval(timer); return; } setStep(k); }, 1600);
    }, .5);
  }
})();
