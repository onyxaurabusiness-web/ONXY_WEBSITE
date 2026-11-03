/* ONYXAURA · The Craft: the line, the room, the vessel, the seal, the record. No libraries. */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad(n) { return ('0' + n).slice(-2); }
  function whileVisible(el, on, off, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) on(); else if (off) off(); }, { rootMargin: (margin || 120) + 'px 0px' }).observe(el);
  }
  function onceVisible(el, fn, threshold) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold: threshold || .35 });
    o.observe(el);
  }
  function pressed(btns, on) { btns.forEach(function (b) { var y = b === on; b.classList.toggle('on', y); b.setAttribute('aria-pressed', y ? 'true' : 'false'); }); }

  /* ---------- toast + clipboard ---------- */
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 1800); }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () {});
    var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove();
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

  /* ---------- words that lift toward the pointer ---------- */
  function split(el) {
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else { var s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); }
          });
          n.replaceChild(frag, c);
        } else if (c.nodeType === 1 && !c.classList.contains('confirm') && c.tagName !== 'BR' && c.tagName !== 'BUTTON') walk(c);
      });
    })(el);
  }
  function lift(h) {
    var words = $$('.w', h), raf = 0, px = 0, py = 0, on = false;
    function paint() {
      raf = 0;
      words.forEach(function (w) {
        var r = w.getBoundingClientRect(), d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        var l = on ? clamp(1 - d / 170, 0, 1) : 0;
        if (l > .01) { w.style.transform = 'translateY(' + (-l * 9).toFixed(2) + 'px)'; w.style.color = 'rgb(' + Math.round(244 - 47 * l) + ',' + Math.round(241 - 62 * l) + ',' + Math.round(236 - 148 * l) + ')'; }
        else { w.style.transform = ''; w.style.color = ''; }
      });
    }
    var zone = h.closest('.ch-head') || h;
    zone.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; on = true; if (!raf) raf = requestAnimationFrame(paint); });
    zone.addEventListener('pointerleave', function () { on = false; if (!raf) raf = requestAnimationFrame(paint); });
  }
  var heads = $$('[data-split]');
  heads.forEach(split);
  if (fine && !reduce) heads.forEach(lift);

  /* ---------- chapter anchors, rail, scroll spy ---------- */
  $$('.chapter').forEach(function (ch) {
    var h = $('h2', ch); if (!h || !ch.id) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'anchor'; b.textContent = '#'; b.setAttribute('aria-label', 'Copy a link to this chapter');
    h.appendChild(b);
    b.addEventListener('click', function () {
      copy(location.origin + location.pathname + '#' + ch.id);
      try { history.replaceState(null, '', '#' + ch.id); } catch (e) {}
      toast('Link copied');
    });
  });
  var rail = $('[data-rail]'), chapters = $$('.chapter'), rlinks = rail ? $$('a', rail) : [], nextSec = $('.s-next');
  function spy() {
    var vh = window.innerHeight, y = window.scrollY, active = '';
    chapters.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.top < vh * .5 && r.bottom > vh * .5) active = c.id;
      c.classList.toggle('in', r.top < vh * .6 && r.bottom > vh * .2);
    });
    if (rail && chapters.length) {
      var first = chapters[0].getBoundingClientRect(), last = chapters[chapters.length - 1].getBoundingClientRect();
      var std = $('.c-std'), nt = std ? std.getBoundingClientRect().top : (nextSec ? nextSec.getBoundingClientRect().top : 1e9);
      rail.classList.toggle('show', first.top < vh * .6 && nt > vh * .55);
      rail.style.setProperty('--p', clamp((vh * .45 - first.top) / (last.bottom - first.top), 0, 1).toFixed(3));
      rlinks.forEach(function (a) { var on = a.getAttribute('data-ch') === active; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }
  }
  var spyRaf = 0;
  window.addEventListener('scroll', function () { if (!spyRaf) spyRaf = requestAnimationFrame(function () { spyRaf = 0; spy(); }); }, { passive: true });
  window.addEventListener('resize', spy); spy();

  /* ---------- a small particle field, used twice ---------- */
  /* kinds: [{ n, color, r0, r1, vis(stage, rank) -> bool, scale(stage) -> number }] */
  function Field(cv, kinds) {
    var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = 1, H = 1, P = [], raf = 0, stage = 0, running = false;
    function size() { var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function seed() {
      P = [];
      kinds.forEach(function (k, ki) {
        for (var i = 0; i < k.n; i++) P.push({ k: ki, x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .35) * .22, vy: (Math.random() - .5) * .18, rank: Math.random(), s: Math.random(), a: 0, ph: Math.random() * 6.28 });
      });
    }
    function draw(t, snap) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var p = P[i], k = kinds[p.k], want = k.vis(stage, p.rank) ? 1 : 0;
        p.a = snap ? want : p.a + (want - p.a) * .06;
        if (!snap) { p.x += p.vx + Math.sin(t * .0007 + p.ph) * .06; p.y += p.vy + Math.cos(t * .0006 + p.ph) * .05; if (p.x > W + 4) p.x = -4; if (p.x < -4) p.x = W + 4; if (p.y > H + 4) p.y = -4; if (p.y < -4) p.y = H + 4; }
        if (p.a < .02) continue;
        ctx.globalAlpha = p.a; ctx.fillStyle = k.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, (k.r0 + p.s * (k.r1 - k.r0)) * (k.scale ? k.scale(stage) : 1), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function loop(t) { if (!running) return; draw(t, false); raf = requestAnimationFrame(loop); }
    var api = {
      setStage: function (s) { stage = s; if (!running) draw(0, true); },
      start: function () { if (reduce || running) return; running = true; raf = requestAnimationFrame(loop); },
      stop: function () { running = false; cancelAnimationFrame(raf); }
    };
    size(); seed(); draw(0, true);
    var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); seed(); draw(0, true); }, 160); });
    return api;
  }

  /* ---------- the line: seven stations ---------- */
  var stations = $('[data-stations]');
  if (stations) {
    var nodes = $$('.node', stations), text = $('[data-sttext]'), scv = $('[data-stcv]');
    var dust = [1, .62, .14, .1, .04, .03, .03], dustSize = [1, .85, .5, .45, .4, .4, .4], minerals = [0, 0, 0, .75, .75, .75, .75];
    var sfield = scv ? Field(scv, [
      { n: 260, color: 'rgba(244,241,236,.62)', r0: .8, r1: 3, vis: function (s, r) { return r < dust[s]; }, scale: function (s) { return dustSize[s]; } },
      { n: 90, color: 'rgba(197,179,88,.95)', r0: 1.6, r1: 2.4, vis: function (s, r) { return r < minerals[s]; } }
    ]) : null;
    var touched = false, timer = 0;
    var setStation = function (i, user) {
      nodes.forEach(function (n, k) { n.classList.toggle('on', k === i); n.classList.toggle('done', k < i); n.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      stations.style.setProperty('--i', i);
      if (stations.scrollWidth > stations.clientWidth + 2) {   // narrow screens scroll sideways: keep the active station in view
        var li = nodes[i].parentNode;
        stations.scrollTo({ left: Math.max(0, li.offsetLeft - (stations.clientWidth - li.offsetWidth) / 2), behavior: reduce ? 'auto' : 'smooth' });
      }
      var d = $('.desc', nodes[i].parentNode);
      text.innerHTML = '<div class="tp">' + d.innerHTML + '</div>';
      if (sfield) sfield.setStage(i);
      if (user) { touched = true; clearInterval(timer); }
    };
    nodes.forEach(function (n, k) {
      n.addEventListener('click', function () { setStation(k, true); });
      if (fine) n.addEventListener('mouseenter', function () { setStation(k, true); });
      n.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        var j = clamp(k + d, 0, nodes.length - 1); nodes[j].focus(); setStation(j, true); e.preventDefault();
      });
    });
    setStation(0);
    if (scv && sfield) whileVisible(scv, sfield.start, sfield.stop, 160);
    if (!reduce) onceVisible(stations, function () {
      var k = 0;
      timer = setInterval(function () { k++; if (touched || k > nodes.length - 1) { clearInterval(timer); return; } setStation(k); }, 1900);
    });
  }

  /* ---------- V. the room ---------- */
  var room = $('[data-room]');
  if (room) {
    var ISO = [
      { c: 'ISO 9', n: 35200000, note: 'About the air of an ordinary indoor room.' },
      { c: 'ISO 8', n: 3520000, note: 'Ten times fewer particles than the ISO 9 limit.' },
      { c: 'ISO 7', n: 352000, note: 'A hundred times fewer than the ISO 9 limit.' },
      { c: 'ISO 6', n: 35200, note: 'A thousand times fewer than the ISO 9 limit.' },
      { c: 'ISO 5', n: 3520, note: 'Ten thousand times fewer than the ISO 9 limit. The class used around the filling point in sterile pharmaceutical filling.' }
    ];
    var counts = ISO.map(function (c) { return Math.round(420 * Math.pow(c.n / 35200000, .35)); });
    var rcv = $('.room-cv', room), rng = $('#iso-range', room), cls = $('[data-iso-cls]', room), num = $('[data-iso-n]', room), note = $('[data-iso-note]', room);
    var rfield = Field(rcv, [{ n: 420, color: 'rgba(244,241,236,.7)', r0: .8, r1: 2.2, vis: function (s, r) { return r < counts[s] / 420; } }]);
    var setRoom = function (i) {
      cls.textContent = ISO[i].c;
      num.textContent = String(ISO[i].n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      note.textContent = ISO[i].note; rfield.setStage(i);
      rng.setAttribute('aria-valuetext', ISO[i].c + ', at most ' + num.textContent + ' particles per cubic metre');
    };
    rng.addEventListener('input', function () { setRoom(+rng.value); });
    setRoom(0); whileVisible(rcv, rfield.start, rfield.stop, 160);
  }

  /* ---------- VI. the vessel ---------- */
  var vessel = $('[data-vessel]');
  if (vessel) {
    var VD = {
      glass: {
        names: ['Melt', 'Gob', 'Form', 'Anneal', 'Inspect'],
        meta: ['About 2,350 °F · 1,290 °C', 'About 2,200 °F · 1,200 °C', 'Leaves above 1,000 °F · 540 °C', '1,050 °F down to 390 °F', ''],
        h: ['Sand becomes glass.', 'A measured piece.', 'Shaped in seconds.', 'Cooled slowly, on purpose.', 'Checked, bottle by bottle.'],
        p: [
          'Raw materials are heated continuously in a furnace to about 2,350 °F (about 1,290 °C), until they melt.',
          'The molten glass cools to about 2,200 °F (about 1,200 °C) in the forehearth, and is cut into gobs, each a measured portion for one bottle.',
          'A gob drops into a blank mould. Air, or a plunger and then air, forms the neck, and a second mould blows the body. Forming takes a few seconds, and the bottle leaves the machine above 1,000 °F (about 540 °C).',
          'The bottle is reheated to about 1,050 °F (about 565 °C), then cooled to about 390 °F (about 200 °C) over a long time, so that no stress is left in the glass.',
          'A coating on the outside helps the glass resist scratches. Every bottle is checked for thickness, dimensions and appearance, and any that fail go back to the furnace to be melted again.'
        ]
      },
      can: {
        names: ['Preform', 'Blow', 'Flange', 'Fill', 'Seam'],
        meta: ['Food-grade clear PET', 'Clear all round, 500 ml', 'Ready for its lid', 'Filled open', 'Aluminium lid, double seam'],
        h: ['It starts small.', 'Blown to shape.', 'Ready for its lid.', 'Filled open.', 'Closed after filling.'],
        p: [
          'The clear body begins as a small preform of food-grade PET.',
          'Warmed and blown into its mould, it takes the shape of the can, clear all the way round, so you can see the water.',
          'The open top is formed with a flange, so an aluminium lid can be seamed onto it.',
          'The can is filled while it is still open at the top, in the clean room.',
          'The aluminium lid is fitted after filling, by a double seam. See The Seal, next.'
        ]
      }
    };
    var vkind = 'glass', vstage = 0;
    var vr = $('#v-range', vessel), vo = $('[data-vstage]', vessel), vh = $('[data-vh]', vessel), vp = $('[data-vp]', vessel), vt = $('[data-vtemp]', vessel);
    var vsvgs = $$('.v-svg', vessel), vbtns = $$('[data-vsel]', vessel);
    var paintV = function () {
      var d = VD[vkind];
      vessel.setAttribute('data-v', vkind);
      vsvgs.forEach(function (s) { s.setAttribute('data-s', vstage); });
      vo.textContent = d.names[vstage]; vh.textContent = d.h[vstage]; vp.textContent = d.p[vstage]; vt.textContent = d.meta[vstage];
      vr.setAttribute('aria-valuetext', d.names[vstage]);
    };
    vr.addEventListener('input', function () { vstage = +vr.value; paintV(); });
    vbtns.forEach(function (b) {
      b.addEventListener('click', function () { vkind = b.getAttribute('data-vsel'); pressed(vbtns, b); paintV(); });
    });
    paintV();
    if (!reduce) onceVisible(vessel, function () {   // let it play through once, then leave it to the visitor
      var k = 0, tm = setInterval(function () {
        if (+vr.value !== vstage) { clearInterval(tm); return; }
        k++; if (k > 4 || vr.matches(':active')) { clearInterval(tm); return; }
        vstage = k; vr.value = k; paintV();
      }, 1800);
      vr.addEventListener('pointerdown', function () { clearInterval(tm); }, { once: true });
      vbtns.forEach(function (b) { b.addEventListener('click', function () { clearInterval(tm); }, { once: true }); });
    }, .5);
  }

  /* ---------- VII. the seal ---------- */
  var seal = $('[data-seal]');
  if (seal) {
    var SD = [
      { h: 'Lid on.', p: 'The filled can’s flange meets the curl of the lid, which carries a ring of sealing compound.', n: '' },
      { h: 'First roll.', p: 'A first roller folds the lid’s curl under and around the flange of the body. The two are now hooked together.', n: 'Hooked' },
      { h: 'Second roll.', p: 'A second roller flattens the fold and presses it tight. The compound is squeezed into the gaps, and the joint is closed.', n: 'Airtight' }
    ];
    var sbtns = $$('[data-sstep]', seal), sh = $('[data-sh]', seal), sp = $('[data-sp]', seal), sn = $('[data-sealnote]', seal);
    var setSeal = function (i) {
      seal.setAttribute('data-s', i); sh.textContent = SD[i].h; sp.textContent = SD[i].p; sn.textContent = SD[i].n;
      pressed(sbtns, sbtns[i]);
    };
    sbtns.forEach(function (b, i) { b.addEventListener('click', function () { setSeal(i); }); });
    setSeal(0);
  }

  /* ---------- VIII. the record ---------- */
  var rec = $('[data-rec]');
  if (rec) {
    var PIECES = { INC: 'Incline', BLK: 'Black Water', HIM: 'Himalayan', GLD: 'Gold' };
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var big = $('[data-rec-big]', rec), code = $('[data-rec-code]', rec), read = $('[data-rec-read]', rec);
    var cur = null, sel = 3;
    var make = function () {
      var keys = Object.keys(PIECES), d = new Date(), h = 6 + Math.floor(Math.random() * 16), m = Math.floor(Math.random() * 60);
      return {
        run: 'A' + pad(10 + Math.floor(Math.random() * 89)) + pad(Math.floor(Math.random() * 100)),
        piece: keys[Math.floor(Math.random() * keys.length)], line: 'L' + (1 + Math.floor(Math.random() * 2)),
        batch: 'B' + pad(Math.floor(Math.random() * 100)) + pad(1 + Math.floor(Math.random() * 99)),
        date: pad(d.getFullYear() % 100) + pad(d.getMonth() + 1) + pad(d.getDate()), day: d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(),
        time: pad(h) + pad(m), clock: pad(h) + ':' + pad(m)
      };
    };
    var parts = function (c) {
      return [
        { t: c.run, h: 'The run', p: 'The production run: one continuous session on the line.' },
        { t: c.piece, h: 'The water', p: 'Which water is inside: ' + PIECES[c.piece] + '.' },
        { t: c.line, h: 'The line', p: 'Which filling line packed it.' },
        { t: c.batch, h: 'The batch', p: 'The batch it belongs to. Every pack from the same batch shares it, so a batch can be found, tested and, if it were ever needed, withdrawn together.' },
        { t: c.date, h: 'The day', p: 'The day it was packed, year, month and day: ' + c.day + '.' }
      ];
    };
    var paintRec = function () {
      var ps = parts(cur), html = '';
      ps.forEach(function (x, i) { html += (i ? '<span class="sep" aria-hidden="true">·</span>' : '') + '<button type="button" data-i="' + i + '" class="' + (i === sel ? 'on' : '') + '" aria-pressed="' + (i === sel) + '">' + x.t + '</button>'; });
      code.innerHTML = html; big.textContent = ps[sel].t;
      read.innerHTML = '<p class="rr-h">' + ps[sel].h + '</p><p class="rr-p">' + ps[sel].p + '</p>';
    };
    code.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; sel = +b.getAttribute('data-i'); paintRec(); });
    if (fine) code.addEventListener('mouseover', function (e) { var b = e.target.closest('button[data-i]'); if (!b || +b.getAttribute('data-i') === sel) return; sel = +b.getAttribute('data-i'); paintRec(); });
    $('[data-rec-new]', rec).addEventListener('click', function () { cur = make(); paintRec(); });
    cur = make(); paintRec();
  }
})();
