/* ONYXAURA · Gold. Gold dust, a lit 3D object, a pour, a certificate, and quiet controls. */
(function () {
  'use strict';

  var W = window.OAWire;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function whileVisible(el, on, off, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) on(); else if (off) off(); }, { rootMargin: (margin || 140) + 'px 0px' }).observe(el);
  }
  function onceNear(el, fn) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: '400px 0px' });
    o.observe(el);
  }
  function onceVisible(el, fn, threshold) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold: threshold || .4 });
    o.observe(el);
  }

  /* =====================================================================
     3D: the Gold bottle, modelled from the product shoot (assets/gold-bottle.js, three.js, loaded on demand).
     Without WebGL or modules the photograph of the bottle stays in place.
     ===================================================================== */
  var bottleP = null;
  function loadBottle() { if (!bottleP) bottleP = import('/assets/gold-bottle.js').catch(function () { return null; }); return bottleP; }
  function mountBottle(box, opts) {
    return loadBottle().then(function (m) { return m ? m.mount(box, opts) : null; }).catch(function () { return null; });
  }
  window.OAGold = { mountBottle: mountBottle };


  if (!document.body.classList.contains('gold-page')) return;

  /* =====================================================================
     Gold dust: slow motes that drift up and step away from the pointer.
     ===================================================================== */
  (function dust() {
    var c = $('.dust'); if (!c) return;
    var ctx = c.getContext('2d'), w = 0, h = 0, motes = [], px = -1e4, py = -1e4, running = false, raf = 0, last = 0;
    function spawn(any) { return { x: Math.random() * w, y: any ? Math.random() * h : h + 12, r: .5 + Math.random() * 1.5, v: .1 + Math.random() * .34, a: Math.random() * 6.28, s: .6 + Math.random() * 1.5, o: .3 + Math.random() * .6 }; }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = window.innerWidth; h = window.innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 700 ? 30 : 70; while (motes.length < n) motes.push(spawn(true)); motes.length = n;
    }
    function draw(t, move) {
      ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        if (move) {
          m.y -= m.v; m.x += Math.sin(t / 1900 + m.a) * .2;
          var dx = m.x - px, dy = m.y - py, d2 = dx * dx + dy * dy;
          if (d2 < 14400) { var d = Math.sqrt(d2) || 1, f = (120 - d) / 120 * 1.4; m.x += dx / d * f; m.y += dy / d * f; }
          if (m.y < -10) motes[i] = spawn(false);
        }
        var a = m.o * (.5 + .5 * Math.sin(t / 650 * m.s + m.a));
        ctx.fillStyle = 'rgba(244,222,140,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
      }
    }
    function frame(t) { if (!running) return; raf = requestAnimationFrame(frame); if (t - last < 33) return; last = t; draw(t, true); }
    resize(); window.addEventListener('resize', function () { resize(); if (!running) draw(0, false); });
    if (reduce) { draw(1000, false); return; }
    function go() { if (!running && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } }
    function halt() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) halt(); else go(); });
    window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    go();
  })();

  /* ---------- a soft light follows the pointer; foil follows it too ---------- */
  if (fine) {
    var lraf = 0;
    window.addEventListener('pointermove', function (e) {
      if (lraf) return;
      lraf = requestAnimationFrame(function () { lraf = 0; document.body.style.setProperty('--gx', e.clientX + 'px'); document.body.style.setProperty('--gy', e.clientY + 'px'); });
    }, { passive: true });
    if (!reduce) $$('[data-track]').forEach(function (el) {
      var zone = el.closest('section') || el;
      zone.addEventListener('pointermove', function (e) { el.classList.add('track'); el.style.setProperty('--fxp', (e.clientX / window.innerWidth * 200).toFixed(1) + '%'); });
      zone.addEventListener('pointerleave', function () { el.classList.remove('track'); });
    });
  }

  /* ---------- 1. hero and the vessel viewer ---------- */
  var heroBox = $('[data-viewer=hero]'), vesselBox = $('[data-viewer=vessel]'), vessel = null, pendingNo = 14;
  // what the glass shows through it: the gold glow drawn behind each stage in gold.css
  var HALO = '#e8d78a';
  if (heroBox) onceNear(heroBox, function () { mountBottle(heroBox, { auto: true, yaw: -.5, zoom: 1.02, backdrop: { glow: HALO, a0: .3, t1: .56, a1: .1, t2: .76, size: [.58, .46] } }); });
  var NAMES = { front: 'Front', side: 'Side', top: 'Top', base: 'Base' };
  var seg = $$('.v-ui [data-look]'), tag = $('[data-vtag]'), apartB = $('[data-apart]'), dimsB = $('[data-dims]'), lr = $('.v-ui input[type=range]'), turn = $('.v-ui .turn');
  var press = function (b, on) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  var apart = false, showDims = false, spin = !reduce, cur = 'front';
  function look(name) {
    cur = NAMES[name] ? name : 'front';
    seg.forEach(function (x) { press(x, x.getAttribute('data-look') === name); });
    if (tag) tag.textContent = NAMES[name] || 'Whole';
    if (apart && (name === 'top' || name === 'base')) { apart = false; press(apartB, false); }
    if (vessel) { vessel.view(name); if (name === 'top' || name === 'base') vessel.auto(false); else vessel.auto(spin); }
  }
  seg.forEach(function (b) { b.addEventListener('click', function () { look(b.getAttribute('data-look')); }); });
  if (apartB) apartB.addEventListener('click', function () {
    apart = !apart; press(apartB, apart);
    if (apart) { showDims = false; press(dimsB, false); look('front'); }
    if (tag) tag.textContent = apart ? 'Five parts' : NAMES[cur];
    if (vessel) vessel.explode(apart);
  });
  if (dimsB) dimsB.addEventListener('click', function () {
    showDims = !showDims; press(dimsB, showDims);
    if (showDims) { apart = false; press(apartB, false); look('front'); if (tag) tag.textContent = 'Dimensions'; }
    if (vessel) { vessel.dims(showDims); vessel.auto(showDims ? false : spin); }
  });
  if (lr) lr.addEventListener('input', function () { if (vessel) vessel.light(parseFloat(lr.value)); });
  if (turn) {
    turn.setAttribute('aria-pressed', spin ? 'true' : 'false'); turn.textContent = spin ? 'Turning' : 'Still';
    turn.addEventListener('click', function () { spin = !spin; turn.setAttribute('aria-pressed', spin ? 'true' : 'false'); turn.textContent = spin ? 'Turning' : 'Still'; if (vessel) vessel.auto(spin); });
  }
  if (vesselBox) onceNear(vesselBox, function () {
    mountBottle(vesselBox, { auto: spin, yaw: -.35, number: pendingNo, zoomable: true, backdrop: { glow: HALO, a0: .2, t1: .72, a1: 0, t2: .73, at: [.5, .46], size: [.62, .52] } }).then(function (v) { vessel = v; });
  });
  // the base link in the edition sends the inspector to the base, where the number is etched
  $$('[data-base-link]').forEach(function (a) { a.addEventListener('click', function () { setTimeout(function () { look('base'); }, 450); }); });

  /* ---------- 3b. the product shoot: each photograph opens full size; the stone-spa band settles as it arrives ---------- */
  var shots = $$('[data-full]');
  if (shots.length && window.HTMLDialogElement) {
    var lb = document.createElement('dialog');
    lb.className = 'lightbox'; lb.setAttribute('aria-label', 'The product shoot');
    lb.innerHTML = '<figure class="lb-fig"><img alt=""></figure>' +
      '<div class="lb-bar"><button type="button" class="sq" data-lb="-1" aria-label="Previous photograph">&larr;</button><output class="small" aria-live="polite"></output><button type="button" class="sq" data-lb="1" aria-label="Next photograph">&rarr;</button></div>' +
      '<button type="button" class="sq lb-close" aria-label="Close">&times;</button>';
    document.body.appendChild(lb);
    var lbImg = $('img', lb), lbOut = $('output', lb), at = 0, sx = null;
    var show = function (i) {
      at = (i + shots.length) % shots.length;
      var a = shots[at], label = $('span', a);
      lbImg.src = a.getAttribute('href'); lbImg.alt = $('img', a).alt;
      lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
      lbOut.textContent = (label ? label.textContent + ' · ' : '') + (at + 1) + ' / ' + shots.length;
    };
    shots.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); show(i); lb.showModal(); document.documentElement.style.overflow = 'hidden'; });
    });
    lb.addEventListener('close', function () { document.documentElement.style.overflow = ''; shots[at].focus(); });
    $$('[data-lb]', lb).forEach(function (b) { b.addEventListener('click', function () { show(at + parseInt(b.getAttribute('data-lb'), 10)); }); });
    $('.lb-close', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-fig')) lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); });
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1)); sx = null; });
  }
  var band = $('[data-band]');
  if (band) onceVisible(band, function () { band.classList.add('in'); }, .2);

  /* ---------- 2. the edition: a specimen number ---------- */
  var odo = $('[data-odo]');
  if (odo) {
    var dgs = $$('.dg', odo), out = $('[data-odo-out]', odo), num = 0;
    var setNum = function (n, initial) {
      num = ((n % 1000) + 1000) % 1000; if (num === 0 && !initial) num = n > 0 ? 1 : 999;   // 000 is never a bottle
      var s = ('00' + num).slice(-3);
      dgs.forEach(function (d, i) { d.style.setProperty('--n', s.charAt(i)); });
      out.textContent = 'No. ' + s + ' / ∞';
      pendingNo = num || 1; if (vessel) vessel.number(pendingNo);
    };
    $$('[data-step]', odo).forEach(function (b) { b.addEventListener('click', function () { setNum(num + parseInt(b.getAttribute('data-step'), 10)); }); });
    odo.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setNum(num + 1); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setNum(num - 1); e.preventDefault(); }
    });
    setNum(0, true);
    if (reduce) setNum(14); else onceVisible(odo, function () { var k = 0; (function up() { k++; setNum(k); if (k < 14) setTimeout(up, 60); })(); }, .5);
  }
  // sheen on the gold fields follows the scroll
  var sheenEls = $$('.edition, .g-close');
  function sheen() {
    var vh = window.innerHeight;
    sheenEls.forEach(function (el) {
      var r = el.getBoundingClientRect(), p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      el.style.setProperty('--sheen', ((p - .5) * 150).toFixed(1));
    });
  }

  /* ---------- 4. the water: gold contours that bend around the pointer ---------- */
  var wc = $('.w-contours'), water = $('.water');
  if (W && wc && water) {
    var cont = W.Contours(wc, { fps: 24, base: '232,215,138', index: '251,240,191', baseAlpha: .2, indexAlpha: .5 });
    water.addEventListener('pointermove', function (e) { var r = water.getBoundingClientRect(); cont.setPointer(e.clientX - r.left, e.clientY - r.top, true); });
    water.addEventListener('pointerleave', function () { cont.setPointer(0, 0, false); });
    whileVisible(water, function () { cont.start(); }, function () { cont.stop(); }, 100);
  }

  /* ---------- 5. the ritual: a pour ---------- */
  var pour = $('[data-pour]');
  if (pour) {
    var svg = $('.scene', pour), range = $('input[type=range]', pour), hold = $('.hold', pour), outP = $('output', pour);
    var bottle = $('#bottle', pour), stream = $('#stream', pour), liqA = $('#liqA', pour), liqB = $('#liqB', pour), topA = $('#topA', pour), topB = $('#topB', pour);
    var REST = { x: 130, y: 178 }, GA = 330, GB = 500, BOT = 470, MAXH = 98;
    var POUR_A = { x: GA - 22, y: 318, a: 106 }, POUR_B = { x: GB - 22, y: 318, a: 106 };
    var p = 0, holding = false, last2 = 0, raf3 = 0, touched = false;
    function level(el, top, cx, lv) {
      var h = MAXH * clamp(lv, 0, 1), y = BOT - h, half = 42 + 13 * (BOT - y) / 130;
      el.setAttribute('y', y.toFixed(1)); el.setAttribute('height', h.toFixed(1));
      top.setAttribute('d', 'M' + (cx - half).toFixed(1) + ' ' + y.toFixed(1) + 'H' + (cx + half).toFixed(1));
      top.style.opacity = h > 1 ? 1 : 0;
      return y;
    }
    function setP(v) {
      p = clamp(v, 0, 1);
      var x, y, a, lvA = 0, lvB = 0, pouring = null;
      if (p < .08) { var e = ease(p / .08); x = lerp(REST.x, POUR_A.x, e); y = lerp(REST.y, POUR_A.y, e); a = lerp(0, POUR_A.a, e); }
      else if (p < .46) { x = POUR_A.x; y = POUR_A.y; a = POUR_A.a; lvA = (p - .08) / .38 * .78; pouring = 'A'; }
      else if (p < .54) { var e2 = ease((p - .46) / .08); x = lerp(POUR_A.x, POUR_B.x, e2); y = lerp(POUR_A.y, POUR_B.y, e2) - Math.sin(e2 * Math.PI) * 38; a = POUR_A.a; lvA = .78; }
      else if (p < .92) { x = POUR_B.x; y = POUR_B.y; a = POUR_B.a; lvA = .78; lvB = (p - .54) / .38 * .78; pouring = 'B'; }
      else { var e3 = ease((p - .92) / .08); x = lerp(POUR_B.x, REST.x, e3); y = lerp(POUR_B.y, REST.y, e3); a = lerp(POUR_B.a, 0, e3); lvA = .78; lvB = .78; }
      bottle.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + a.toFixed(1) + ')');
      var yA = level(liqA, topA, GA, lvA), yB = level(liqB, topB, GB, lvB);
      stream.setAttribute('d', pouring ? 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'V' + (pouring === 'A' ? yA : yB).toFixed(1) : 'M0 0V0');
      outP.textContent = p < .04 ? 'Standing' : (p < .5 ? 'First glass' : (p < .93 ? 'Second glass' : 'Poured'));
      range.value = Math.round(p * 1000);
    }
    function loop(ts) {
      if (!holding) return;
      var dt = Math.min((ts - last2) / 1000, .05); last2 = ts;
      setP(p + dt / 7); raf3 = requestAnimationFrame(loop);
      if (p >= 1) holding = false;
    }
    function begin() { touched = true; if (p >= 1) setP(0); holding = true; last2 = performance.now(); raf3 = requestAnimationFrame(loop); }
    function end() { holding = false; cancelAnimationFrame(raf3); }
    hold.addEventListener('pointerdown', function (e) { e.preventDefault(); begin(); try { hold.setPointerCapture(e.pointerId); } catch (er) {} });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { hold.addEventListener(n, end); });
    hold.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !holding) { e.preventDefault(); begin(); } });
    hold.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') end(); });
    range.addEventListener('input', function () { touched = true; end(); setP(range.value / 1000); });
    setP(0);
    if (reduce) setP(1);
    else onceVisible(pour, function () {   // one slow pour on first sight, unless the visitor has already taken over
      var t0 = performance.now();
      (function demo(ts) { if (touched || holding) return; var k = clamp((ts - t0) / 9000, 0, 1); setP(k); if (k < 1) requestAnimationFrame(demo); })(t0);
    }, .5);
  }

  /* ---------- 6. the register: a live certificate ---------- */
  var cs = $('[data-cert]');
  if (cs) {
    var cert = $('#cert'), nameIn = $('#cert-name'), noIn = $('#cert-no'), cNo = $('#c-no'), cName = $('#c-name');
    var upd = function () {
      var n = parseInt(noIn.value, 10); if (isNaN(n)) n = 14; n = clamp(n, 1, 999);
      cNo.textContent = 'No. ' + ('00' + n).slice(-3);
      var nm = (nameIn.value || '').replace(/\s+/g, ' ').trim();
      cName.textContent = nm || 'Your name'; cName.classList.toggle('ph', !nm);
    };
    nameIn.addEventListener('input', upd); noIn.addEventListener('input', upd); upd();
    if (fine && !reduce) {
      cs.addEventListener('pointermove', function (e) {
        var r = cert.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        cert.style.setProperty('--ry', (nx * 14).toFixed(2) + 'deg'); cert.style.setProperty('--rx', (-ny * 11).toFixed(2) + 'deg');
        cert.style.setProperty('--sx', ((nx + .5) * 100).toFixed(1) + '%'); cert.style.setProperty('--sy', ((ny + .5) * 100).toFixed(1) + '%');
      });
      cs.addEventListener('pointerleave', function () { cert.style.setProperty('--ry', '0deg'); cert.style.setProperty('--rx', '0deg'); });
    }
  }

  /* ---------- 7. how to receive one ---------- */
  var steps = $('[data-steps]');
  if (steps) {
    var items = $$('li', steps), timer = 0, touchedS = false;
    var setStep = function (i, user) {
      items.forEach(function (li, k) { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); $('button', li).setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      steps.style.setProperty('--i', i);
      if (user) { touchedS = true; clearInterval(timer); }
    };
    items.forEach(function (li, k) {
      var b = $('button', li);
      b.addEventListener('click', function () { setStep(k, true); });
      if (fine) b.addEventListener('mouseenter', function () { setStep(k, true); });
    });
    setStep(0);
    if (!reduce) onceVisible(steps, function () {
      var k = 0; timer = setInterval(function () { k++; if (touchedS || k > items.length - 1) { clearInterval(timer); return; } setStep(k); }, 1700);
    }, .5);
  }

  /* ---------- 8. questions ---------- */
  var qas = $$('.qa');
  qas.forEach(function (qa) {
    var b = $('.q', qa);
    b.addEventListener('click', function () {
      var open = qa.classList.contains('open');
      qas.forEach(function (x) { x.classList.remove('open'); $('.q', x).setAttribute('aria-expanded', 'false'); });
      if (!open) { qa.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- rail and the dock ---------- */
  var rail = $('[data-rail]'), rlinks = rail ? $$('a', rail) : [], hero = $('[data-hero]'), dock = $('[data-dock]');
  var ids = ['edition', 'vessel', 'water', 'ritual', 'register', 'receive'], secEls = ids.map(function (id) { return document.getElementById(id); });
  var priceEl = $('.price'), closeEl = $('[data-close]');
  function spy() {
    var vh = window.innerHeight, y = window.scrollY, active = '';
    secEls.forEach(function (s) { if (!s) return; var r = s.getBoundingClientRect(); if (r.top < vh * .5 && r.bottom > vh * .5) active = s.id; });
    var pastHero = y > hero.offsetHeight * .6, endR = closeEl ? closeEl.getBoundingClientRect().top : 1e9;
    if (rail) {
      rail.classList.toggle('show', pastHero && endR > vh * .6);
      rlinks.forEach(function (a) { var on = a.getAttribute('data-s') === active; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }
    if (dock) {
      var pr = priceEl ? priceEl.getBoundingClientRect() : null, vw = window.innerWidth, hide = (pr && pr.top < vh * .85 && pr.bottom > 0) || endR < vh * .9;
      if (!hide) $$('[data-nodock]').forEach(function (n) { var r = n.getBoundingClientRect(); if (r.right > vw - 340 && r.top < vh && r.bottom > vh - 120) hide = true; });
      dock.classList.toggle('show', pastHero && !hide);
    }
    sheen();
  }
  var spyRaf = 0;
  window.addEventListener('scroll', function () { if (!spyRaf) spyRaf = requestAnimationFrame(function () { spyRaf = 0; spy(); }); }, { passive: true });
  window.addEventListener('resize', spy);
  spy();
})();
