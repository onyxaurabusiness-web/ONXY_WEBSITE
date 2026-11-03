(function () {
  'use strict';

  var W = window.OAWire;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad(n) { return ('0' + n).slice(-2); }

  /* run on() while el is on screen, off() when it is not */
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

  /* ---------- toast + clipboard ---------- */
  var toastEl = $('#toast'), toastT = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () {});
    var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove();
  }

  /* ---------- hero: video, dissolve loop, contours, survey HUD ---------- */
  var hero = $('[data-hero]');
  if (hero) {
    var vid = $('.s-video', hero), pauseBtn = $('.s-pause', hero), cv = $('.s-contours', hero);
    var contours = (W && cv) ? W.Contours(cv, { fps: 30 }) : null;
    var conn = navigator.connection, saver = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
    var userPaused = reduce || saver, heroVisible = true;

    if (saver && vid) {                                  // spare the data: poster only
      var s0 = $('source', vid); if (s0) s0.remove();
      vid.removeAttribute('autoplay'); vid.load();
    }
    var srcEl = vid && $('source', vid);
    if (srcEl) srcEl.addEventListener('error', function () { hero.classList.add('no-video'); });

    function apply() {
      var play = !userPaused && heroVisible && !document.hidden;
      if (vid && vid.querySelector('source')) {
        if (play) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } else vid.pause();
      }
      if (contours) {
        if (play) contours.start(); else { contours.stop(); contours.render(); }
      }
      pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      pauseBtn.textContent = userPaused ? 'Play motion' : 'Pause motion';
    }
    pauseBtn.addEventListener('click', function () { userPaused = !userPaused; apply(); });
    document.addEventListener('visibilitychange', apply);
    whileVisible(hero, function () { heroVisible = true; apply(); }, function () { heroVisible = false; apply(); }, 0);

    if (vid) {
      // a soft dissolve instead of a hard cut where the clip loops
      vid.addEventListener('ended', function () { vid.currentTime = 0; vid.classList.remove('dip'); apply(); });
      (function tick() {
        if (vid.duration && !vid.paused && heroVisible) vid.classList.toggle('dip', vid.duration - vid.currentTime < .6);
        requestAnimationFrame(tick);
      })();
    }

    // survey crosshair and read-out
    var hxEl = $('[data-hx]', hero), hyEl = $('[data-hy]', hero), raf = 0, mx = 0, my = 0, mr = null;
    hero.addEventListener('pointermove', function (e) {
      mr = hero.getBoundingClientRect(); mx = e.clientX - mr.left; my = e.clientY - mr.top;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (e.pointerType === 'mouse') {
          hero.style.setProperty('--cx', mx.toFixed(1) + 'px'); hero.style.setProperty('--cy', my.toFixed(1) + 'px');
          hero.classList.add('live');
          if (hxEl) hxEl.textContent = (mx / mr.width).toFixed(3);
          if (hyEl) hyEl.textContent = (my / mr.height).toFixed(3);
        }
        if (contours) contours.setPointer(mx, my, true);
      });
    });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('live'); if (contours) contours.setPointer(0, 0, false); });
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
        if (l > .01) {
          w.style.transform = 'translateY(' + (-l * 9).toFixed(2) + 'px)';
          w.style.color = 'rgb(' + Math.round(244 - 47 * l) + ',' + Math.round(241 - 62 * l) + ',' + Math.round(236 - 148 * l) + ')';
        } else { w.style.transform = ''; w.style.color = ''; }
      });
    }
    var zone = h.closest('.ch-head') || h;
    zone.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; on = true; if (!raf) raf = requestAnimationFrame(paint); });
    zone.addEventListener('pointerleave', function () { on = false; if (!raf) raf = requestAnimationFrame(paint); });
  }
  var heads = $$('[data-split]');
  heads.forEach(split);
  if (fine && !reduce) heads.forEach(lift);

  /* ---------- chapter anchors: copy a link to this chapter ---------- */
  $$('.chapter').forEach(function (ch) {
    var h = $('h2', ch);
    if (!h || !ch.id) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'anchor'; b.textContent = '#'; b.setAttribute('aria-label', 'Copy a link to this chapter');
    h.appendChild(b);
    b.addEventListener('click', function () {
      copy(location.origin + location.pathname + '#' + ch.id);
      try { history.replaceState(null, '', '#' + ch.id); } catch (e) {}
      toast('Link copied');
    });
  });

  /* ---------- chapter rail + scroll spy ---------- */
  var rail = $('[data-rail]'), chapters = $$('.chapter'), rlinks = rail ? $$('a', rail) : [];
  var nextSec = $('.s-next');
  function spy() {
    var vh = window.innerHeight, y = window.scrollY, active = '';
    chapters.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.top < vh * .5 && r.bottom > vh * .5) active = c.id;
      c.classList.toggle('in', r.top < vh * .6 && r.bottom > vh * .2);
    });
    if (rail) {
      var first = chapters[0].getBoundingClientRect(), last = chapters[chapters.length - 1].getBoundingClientRect();
      var nt = nextSec ? nextSec.getBoundingClientRect().top : 1e9;
      rail.classList.toggle('show', y > hero.offsetHeight * .55 && nt > vh * .55);
      rail.style.setProperty('--p', clamp((vh * .45 - first.top) / (last.bottom - first.top), 0, 1).toFixed(3));
      rlinks.forEach(function (a) {
        var on = a.getAttribute('data-ch') === active;
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
  }
  var spyRaf = 0;
  window.addEventListener('scroll', function () { if (!spyRaf) spyRaf = requestAnimationFrame(function () { spyRaf = 0; spy(); }); }, { passive: true });
  window.addEventListener('resize', spy);
  spy();

  /* ---------- the thread ---------- */
  var chain = $('[data-chain]');
  if (chain) {
    var nodes = $$('.node', chain), panel = $('#trace-panel'), touched = false, timer = 0;
    var setNode = function (i, user) {
      nodes.forEach(function (n, k) {
        n.classList.toggle('on', k === i); n.classList.toggle('done', k < i);
        n.setAttribute('aria-pressed', k === i ? 'true' : 'false');
      });
      chain.style.setProperty('--i', i);
      var d = $('.desc', nodes[i].parentNode);
      panel.innerHTML = '<div class="tp">' + d.innerHTML + '</div>';
      if (user) { touched = true; clearInterval(timer); }
    };
    nodes.forEach(function (n, k) {
      n.addEventListener('click', function () { setNode(k, true); });
      if (fine) n.addEventListener('mouseenter', function () { setNode(k, true); });
      n.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        var j = clamp(k + d, 0, nodes.length - 1); nodes[j].focus(); setNode(j, true); e.preventDefault();
      });
    });
    setNode(0);
    if (!reduce) onceVisible(chain, function () {
      var k = 0;
      timer = setInterval(function () { k++; if (touched || k > nodes.length - 1) { clearInterval(timer); return; } setNode(k); }, 1500);
    });
  }

  /* ---------- I. terrain ---------- */
  var tc = $('#terrain');
  if (W && tc) {
    var terrain = W.Terrain(tc, {});
    var seg = $$('.t-ui .seg button');
    seg.forEach(function (b) {
      b.addEventListener('click', function () {
        terrain.setMode(b.getAttribute('data-mode'));
        seg.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      });
    });
    var lr = $('.t-ui input[type=range]');
    lr.addEventListener('input', function () { terrain.setLight(lr.value / 100); });
    whileVisible(tc, terrain.start, terrain.stop, 160);
  }

  /* ---------- II. journey ---------- */
  var jf = $('[data-journey]');
  if (jf) {
    var path = $('#j-path'), lit = $('#j-lit'), dot = $('#j-dot'), range = $('#j-range'), out = $('.j-out', jf), play = $('.j-play', jf);
    var labels = $$('.jl', jf), strata = $$('.strata path', jf), svg = $('.jsvg', jf), rain = $('.rain', jf);
    var len = path.getTotalLength(), prog = 0, auto = false, raf2 = 0, lastT = 0, STAGES = ['Snowmelt', 'Rock', 'Spring'];
    var rainEnd = 148 / len, srcStart = .9;
    for (var q = 0; q <= 1; q += .005) { if (path.getPointAtLength(q * len).x > 1060) { srcStart = q; break; } }
    var k = 1; function scaleK() { k = svg.getBoundingClientRect().width / 1200 || 1; lit.style.strokeDasharray = (len * k) + ' ' + (len * k * 1.01); }
    scaleK(); lit.style.strokeDashoffset = len * k;

    var setProg = function (p) {
      prog = clamp(p, 0, 1);
      lit.style.strokeDashoffset = len * k * (1 - prog);
      var pt = path.getPointAtLength(prog * len);
      dot.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      var st = prog < rainEnd ? 0 : (prog < srcStart ? 1 : 2);
      labels.forEach(function (l) { l.classList.toggle('on', +l.getAttribute('data-st') === st); });
      out.textContent = STAGES[st]; range.value = Math.round(prog * 1000);
    };
    var loop = function (ts) {
      if (!auto) return;
      var dt = (ts - lastT) / 1000; lastT = ts;
      setProg(prog + dt / 7.5);
      if (prog >= 1) { auto = false; play.setAttribute('aria-pressed', 'false'); play.textContent = 'Replay'; return; }
      raf2 = requestAnimationFrame(loop);
    };
    var startAuto = function () {
      if (prog >= 1) setProg(0);
      auto = true; lastT = performance.now(); play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
      raf2 = requestAnimationFrame(loop);
    };
    var stopAuto = function () { auto = false; cancelAnimationFrame(raf2); play.textContent = prog >= 1 ? 'Replay' : 'Play'; play.setAttribute('aria-pressed', 'false'); };
    play.addEventListener('click', function () { if (auto) stopAuto(); else startAuto(); });
    range.addEventListener('input', function () { if (auto) stopAuto(); setProg(range.value / 1000); });
    window.addEventListener('resize', function () { scaleK(); setProg(prog); });
    setProg(0);
    if (reduce) setProg(1); else onceVisible(jf, startAuto, .45);

    // the rain leans toward the pointer
    if (fine && !reduce) {
      svg.addEventListener('pointermove', function (e) { var r = svg.getBoundingClientRect(); rain.style.transform = 'skewX(' + (-((e.clientX - r.left) / r.width - .5) * 16).toFixed(1) + 'deg)'; });
      svg.addEventListener('pointerleave', function () { rain.style.transform = ''; });
    }
    // strata drift like contour lines
    if (W && !reduce) {
      var wt = 0, wRaf = 0, wLast = 0, wOn = false;
      var wave = function (ts) {
        if (!wOn) return;
        wRaf = requestAnimationFrame(wave);
        if (ts - wLast < 50) return; wLast = ts; wt = ts / 1000;
        strata.forEach(function (p, i) {
          var base = 250 + i * 55, d = '';
          for (var x = 0; x <= 1200; x += 40) {
            var y = base + 30 * W.fbm(x * .0035 + i * 2.7, wt * .07 + i * 1.3, .5, 2);
            d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1);
          }
          p.setAttribute('d', d);
        });
      };
      whileVisible(jf, function () { if (!wOn) { wOn = true; wRaf = requestAnimationFrame(wave); } }, function () { wOn = false; cancelAnimationFrame(wRaf); }, 80);
    }
  }

  /* ---------- III. the keeper's day ---------- */
  var kg = $('[data-keeper]');
  if (kg) {
    var kr = $('#k-range'), clock = $('#k-clock'), per = $('#k-period'), sun = $('#k-sun'), note = $('[data-k-note]'), NAMES = { dawn: 'First light', day: 'Day', dusk: 'Dusk', night: 'Night' };
    var DAY = [
      [0, 'The spring runs on through the night. Nothing is drawn.'],
      [5, 'The walk up to the intake begins, in the dark.'],
      [6, 'First light. The flow is read and the screens are checked before anything is drawn.'],
      [7.5, 'The day’s samples are taken, sealed and labelled for pH and TDS.'],
      [9, 'The collection tank fills by gravity from the spring, closed to the air.'],
      [12, 'A second check of the flow, and of the ground around the intake.'],
      [15, 'The tank is sealed, logged and readied to leave the mountain.'],
      [17, 'Dusk. The readings of the day are written up.'],
      [19, 'The intake is closed for the night.']
    ];
    var setT = function (t) {
      var hh = Math.floor(t), mm = Math.round((t - hh) * 60); if (mm === 60) { hh += 1; mm = 0; }
      clock.textContent = pad(hh % 24) + ':' + pad(mm);
      var p = (t >= 5 && t < 8) ? 'dawn' : (t >= 8 && t < 17) ? 'day' : (t >= 17 && t < 20) ? 'dusk' : 'night';
      per.textContent = NAMES[p]; kg.setAttribute('data-p', p);
      if (note) { var n = DAY[0][1]; DAY.forEach(function (d) { if (t >= d[0]) n = d[1]; }); note.textContent = n; }
      var th = (t - 6) / 12 * Math.PI, s = Math.sin(th), x = 300 - 240 * Math.cos(th), y = s >= 0 ? 190 - 150 * s : 190 - 60 * s;
      sun.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      sun.style.opacity = s >= 0 ? 1 : .45;
    };
    kr.addEventListener('input', function () { setT(parseFloat(kr.value)); });
    setT(6);
    var portrait = $('.portrait', kg);
    portrait.addEventListener('pointermove', function (e) {
      var r = portrait.getBoundingClientRect();
      portrait.style.setProperty('--mx', (e.clientX - r.left) + 'px'); portrait.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  /* ---------- IV. the batch report ---------- */
  var pr = $('[data-proof]');
  if (pr) {
    var tabs = $$('[role=tab]', pr), ind = $('.tab-ind', pr), ph = $('.ph', pr), minO = $('[data-min-out]', pr), maxO = $('[data-max-out]', pr), cell = $('[data-ph-cell]', pr), panelEl = $('#pp'), curMin = 7, curMax = 7;
    var userSel = false;
    var tween = function (el, from, to, key) {
      var t0 = performance.now(), tok = el._tw = (el._tw || 0) + 1;
      (function step(now) {
        if (tok !== el._tw) return;                       // a newer choice has taken over
        var p = clamp((now - t0) / 800, 0, 1), e = 1 - Math.pow(1 - p, 3), v = from + (to - from) * e;
        if (key === 'min') curMin = v; else curMax = v;
        if (p < 1 && !reduce) { el.textContent = v.toFixed(1); requestAnimationFrame(step); }
        else { el.textContent = to.toFixed(1); if (key === 'min') curMin = to; else curMax = to; }
      })(t0);
      setTimeout(function () { if (tok === el._tw) { el.textContent = to.toFixed(1); if (key === 'min') curMin = to; else curMax = to; } }, 950);   // finishes even if the tab is throttled
    };
    var place = function (t) { ind.style.width = t.offsetWidth + 'px'; ind.style.transform = 'translateX(' + t.offsetLeft + 'px)'; };
    var select = function (i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
      var t = tabs[i], mn = parseFloat(t.getAttribute('data-min')), mx = parseFloat(t.getAttribute('data-max'));
      ph.style.setProperty('--min', mn); ph.style.setProperty('--max', mx);
      tween(minO, curMin, mn, 'min'); tween(maxO, curMax, mx, 'max');
      cell.textContent = mn.toFixed(1) + ' – ' + mx.toFixed(1);
      var tc = $('[data-tds-cell]', pr), sc = $('[data-src-cell]', pr);
      if (tc) tc.textContent = t.getAttribute('data-tds') || '';
      if (sc) sc.textContent = t.getAttribute('data-src') || '';
      panelEl.setAttribute('aria-labelledby', t.id);
      place(t); if (focus) t.focus();
    };
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { userSel = true; select(k); });
      t.addEventListener('keydown', function (e) {
        userSel = true;
        var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (e.key === 'Home') { select(0, true); e.preventDefault(); return; }
        if (e.key === 'End') { select(tabs.length - 1, true); e.preventDefault(); return; }
        if (d) { select((k + d + tabs.length) % tabs.length, true); e.preventDefault(); }
      });
    });
    window.addEventListener('resize', function () { place(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
    place(tabs[0]);
    // the band slides in the first time it is seen
    ph.style.setProperty('--min', 7); ph.style.setProperty('--max', 7); minO.textContent = '7.0'; maxO.textContent = '7.0';
    if (reduce) select(0); else onceVisible(pr, function () { if (!userSel) select(0); }, .35);
  }

  /* ---------- I. the map: four waters, four sources, one plant ---------- */
  var map = $('[data-map]');
  if (map) {
    var mbtns = $$('.map-ui button', map), mread = $('[data-map-read]', map), svgm = $('.map-svg', map);
    var pick = function (b) {
      var k = b.getAttribute('data-k');
      mbtns.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      $$('.src, .route', svgm).forEach(function (g) { g.classList.toggle('on', g.getAttribute('data-k') === k); });
      mread.innerHTML = '<div><dt>Where</dt><dd>' + b.getAttribute('data-where') + '</dd></div><div><dt>Altitude</dt><dd>' + b.getAttribute('data-alt') + '</dd></div>' +
        '<div><dt>Ground</dt><dd>' + b.getAttribute('data-rock') + '</dd></div><div><dt>pH &middot; TDS</dt><dd>' + b.getAttribute('data-ph') + ' &middot; ' + b.getAttribute('data-tds') + '</dd></div>';
    };
    mbtns.forEach(function (b) { b.addEventListener('click', function () { pick(b); }); if (fine) b.addEventListener('mouseenter', function () { pick(b); }); });
    $$('.src', svgm).forEach(function (g) { g.addEventListener('click', function () { var b = mbtns.filter(function (x) { return x.getAttribute('data-k') === g.getAttribute('data-k'); })[0]; if (b) pick(b); }); });
    pick(mbtns[0]);
  }

  /* ---------- a soft gold light follows the pointer across the photograph slots ---------- */
  if (fine) $$('.slot').forEach(function (s) {
    s.addEventListener('pointermove', function (e) {
      var r = s.getBoundingClientRect();
      s.style.setProperty('--mx', (e.clientX - r.left) + 'px'); s.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
})();
