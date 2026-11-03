/* ONYXAURA · Gold: the bottle, modelled from the concept sheet (height 260 mm, body 76 mm, cap 42 mm).
   Five parts, as drawn: brushed gold cap, faceted crystal ring, silicone seal, fluted glass body, and the gold frame.
   Built in millimetres, shown at 1 unit = 100 mm. ES module: import('/assets/gold-bottle.js').then(m => m.mount(el, opts)). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const MM = 0.01;                      // millimetres to scene units
const H = 260, CY = 130;              // overall height, and the centre the model turns about
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
const small = Math.min(window.innerWidth, window.innerHeight) < 700;

/* ---------- profiles, traced from the concept render and scaled to the stated dimensions ---------- */
// outer face of the frame bars, top (under the collar) to the feet: [radius, height]
const FRAME = [[20.6, 204], [25.6, 198], [29.9, 189.7], [35, 173.3], [37.3, 157], [38, 140.6], [38, 124.3], [36.8, 107.9], [34.8, 91.6], [32.3, 75.2], [28.6, 58.9], [25.9, 45.8], [27.4, 37.5], [30.1, 29.4], [32.1, 13.1], [32.6, 3.5], [32.6, 0]];
// the glass, base to neck
const GLASS = [[0, 40], [14, 40.2], [19.5, 41.5], [22.6, 45], [24, 50], [26.5, 60], [30.3, 75], [32.8, 91.6], [34.3, 108], [35, 124.3], [35, 140.6], [34.3, 157], [32.3, 173.3], [27.4, 189.7], [20.5, 197], [15.5, 201], [13.5, 204], [13.2, 208], [13.2, 228], [12.2, 229.2], [10.6, 229.4]];
const WATER = [[0, 42.6], [12, 42.7], [17.5, 43.9], [20.6, 47], [22.1, 51], [24.5, 60], [28.3, 75], [30.8, 91.6], [32.3, 108], [33, 124.3], [33, 140.6], [32.3, 157], [30.3, 173.3], [28.4, 180], [27.9, 181.6], [0, 181.6]];

// the OnyxAura mark (facets and panel) in its own 652 x 1950 drawing space
const FACETS = [[[318, 5], [220, 128], [318, 190]], [[217, 162], [318, 222], [317, 745], [193, 688], [237, 222]], [[185, 718], [300, 772], [15, 955]], [[329, 793], [490, 967], [385, 1632], [40, 1950], [0, 1008]], [[393, 1663], [595, 1940], [68, 1940]]];
const PANEL = [[352, 5], [352, 765], [527, 953], [422, 1633], [600, 1937], [647, 988], [449, 695], [408, 225], [430, 160], [430, 90]];

const PARTS = {
  cap: { label: 'Cap', note: 'Brushed gold, engraved', lift: 98, anchor: [21, 247] },
  seal: { label: 'Seal', note: 'Food-grade silicone', lift: 74, anchor: [19, 232] },
  ring: { label: 'Faceted ring', note: 'Crystal-cut glass', lift: 52, anchor: [21, 219] },
  glass: { label: 'Body', note: 'Fluted clear glass, 700 ml', lift: 22, anchor: [35, 120] },
  frame: { label: 'Frame', note: 'Plated in 22-carat gold', lift: -12, anchor: [38, 60] }
};
const VIEWS = { front: [0, 0, 1], side: [Math.PI / 2, 0, 1], top: [0, 1.22, .86], base: [0, -1.3, .8], whole: [0, 0, 1] };

/* ---------- helpers ---------- */
const v2 = a => a.map(p => new THREE.Vector2(p[0] * MM, p[1] * MM));
function smooth(points, n) {
  const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal', .5);
  return c.getSpacedPoints(n).map(p => [p.x, p.y]);
}
function interp(table, y) { // radius at a height, from a top-to-bottom table
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if ((y <= a[1] && y >= b[1]) || (y >= a[1] && y <= b[1])) { const t = (y - a[1]) / ((b[1] - a[1]) || 1); return a[0] + (b[0] - a[0]) * t; }
  }
  return table[table.length - 1][0];
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, renderer, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function drawMark(g, x, y, h, fill, stroke) { // the mark, h pixels tall, top-left at x, y
  const s = h / 1950;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = fill;
  FACETS.forEach(f => { g.beginPath(); f.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); });
  g.strokeStyle = stroke; g.lineWidth = 34; g.lineJoin = 'round';
  g.beginPath(); PANEL.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke();
  g.restore();
}

/* a flat ribbon swept along a path: four faces, smooth along its length, sharp at its edges */
function ribbon(path, width, thick, opts = {}) {
  const n = path.length, pos = [], nor = [], uv = [], idx = [];
  const P = path.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const T = P.map((p, i) => P[Math.min(n - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
  const S = [], N = [];
  for (let i = 0; i < n; i++) {
    let out = opts.out ? opts.out(P[i], i) : new THREE.Vector3(P[i].x, 0, P[i].z);
    if (out.lengthSq() < 1e-9) out = new THREE.Vector3(0, 0, 1);
    out.normalize();
    const s = new THREE.Vector3().crossVectors(T[i], out).normalize();
    S.push(s); N.push(new THREE.Vector3().crossVectors(s, T[i]).normalize());
  }
  // faces: outer (+N), inner (-N), side (+S), side (-S)
  const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  faces.forEach(([fn, fs]) => {
    const base = pos.length / 3, quads = [];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 2; k++) {
        const sign = k ? 1 : -1;
        let o;
        if (fn) o = P[i].clone().addScaledVector(N[i], fn * thick / 2).addScaledVector(S[i], sign * width / 2 * fn);
        else o = P[i].clone().addScaledVector(S[i], fs * width / 2).addScaledVector(N[i], sign * thick / 2 * fs);
        pos.push(o.x, o.y, o.z);
        const nn = fn ? N[i].clone().multiplyScalar(fn) : S[i].clone().multiplyScalar(fs);
        nor.push(nn.x, nn.y, nn.z);
        uv.push(k, i / (n - 1));
      }
      if (i < n - 1) quads.push(base + i * 2);
    }
    // wind every face so that it faces along its own normal, whichever way the sweep runs
    const at = j => new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
    const a0 = quads[0], gn = new THREE.Vector3().crossVectors(at(a0 + 1).sub(at(a0)), at(a0 + 2).sub(at(a0)));
    const flip = gn.dot(new THREE.Vector3(nor[a0 * 3], nor[a0 * 3 + 1], nor[a0 * 3 + 2])) < 0;
    quads.forEach(a => { if (flip) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // only the outer face carries the band's artwork: put it in its own group
  const per = (n - 1) * 6;
  g.addGroup(0, per, 0); g.addGroup(per, per * 3, 1);
  return g;
}

/* the fluted glass: a lathe whose radius ripples around the circumference, fading out at the base and the neck */
function fluted(profile, flutes, depth, seg) {
  const rings = profile.length, pos = [], uv = [], idx = [];
  for (let j = 0; j < rings; j++) {
    const [r0, y] = profile[j];
    const fade = THREE.MathUtils.smoothstep(y, 52, 70) * (1 - THREE.MathUtils.smoothstep(y, 178, 196));
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2;
      const ripple = 1 - depth * fade * (0.5 - 0.5 * Math.cos(flutes * a));
      const r = r0 * ripple;
      pos.push(Math.sin(a) * r * MM, y * MM, Math.cos(a) * r * MM);
      uv.push(i / seg, j / (rings - 1));
      if (j < rings - 1 && i < seg) { const p = j * (seg + 1) + i, q = p + seg + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* the faceted ring: rows of four-sided pyramids around a cylinder */
function facetRing(r, y0, y1, rows, cols, h) {
  const pos = [], cell = (y1 - y0) / rows, da = Math.PI * 2 / cols;
  const at = (a, rr, y) => [Math.sin(a) * rr * MM, y * MM, Math.cos(a) * rr * MM];
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * da / 2;
    for (let i = 0; i < cols; i++) {
      const a0 = i * da + off, a1 = a0 + da, ya = y0 + j * cell, yb = ya + cell;
      const c = at((a0 + a1) / 2, r + h, (ya + yb) / 2);
      const p00 = at(a0, r, ya), p10 = at(a1, r, ya), p11 = at(a1, r, yb), p01 = at(a0, r, yb);
      pos.push(...p00, ...p10, ...c, ...p10, ...p11, ...c, ...p11, ...p01, ...c, ...p01, ...p00, ...c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* ---------- artwork for the engraved surfaces ---------- */
const GOLD_HEX = '#d9b45c', GOLD_DEEP = '#6e5019';
function capSideArt(renderer) { // wraps the cap; the front sits at u = 0.5
  const c = canvas(2048, 384), g = c.getContext('2d');
  g.fillStyle = GOLD_HEX; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${120 + Math.random() * 90},${90 + Math.random() * 60},30,${Math.random() * .05})`; g.fillRect(Math.random() * c.width, 0, 1, c.height); } // brushing
  drawMark(g, 1024 - 20, 70, 110, GOLD_DEEP, GOLD_DEEP);
  g.fillStyle = GOLD_DEEP; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '500 62px "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
  if ('letterSpacing' in g) g.letterSpacing = '22px';
  g.fillText('ONYXAURA', 1024 + 11, 262);
  return tex(c, renderer);
}
function capTopArt(renderer) {
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = GOLD_HEX; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(110,80,25,.35)'; g.lineWidth = 2;
  for (let r = 40; r < 256; r += 7) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); } // turned finish
  drawMark(g, 256 - 50, 256 - 150, 300, GOLD_DEEP, GOLD_DEEP);
  return tex(c, renderer);
}
function bandArt(renderer) { // the front band: the mark, then ONYXAURA reading downwards
  const c = canvas(160, 2048), g = c.getContext('2d');
  g.fillStyle = GOLD_HEX; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(140,100,30,${Math.random() * .06})`; g.fillRect(0, Math.random() * c.height, c.width, 1); }
  drawMark(g, 80 - 22, 760, 132, GOLD_DEEP, GOLD_DEEP);
  g.save(); g.translate(80, 1230); g.rotate(Math.PI / 2);
  g.fillStyle = GOLD_DEEP; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '500 70px "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
  if ('letterSpacing' in g) g.letterSpacing = '26px';
  g.fillText('ONYXAURA', 13, 0);
  g.restore();
  return tex(c, renderer);
}
function etchArt(renderer, num) { // the number, laser-etched on the underside of the glass (white on black = alpha)
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '500 30px "Hanken Grotesk", Arial, sans-serif';
  if ('letterSpacing' in g) g.letterSpacing = '10px';
  const words = 'ONYXAURA  ·  GOLD  ·  ', R = 196;
  for (let i = 0; i < 2; i++) { // around the rim
    [...words].forEach((ch, k) => {
      const a = (i * words.length + k) / (words.length * 2) * Math.PI * 2;
      g.save(); g.translate(256 + Math.sin(a) * R, 256 - Math.cos(a) * R); g.rotate(a); g.fillText(ch, 0, 0); g.restore();
    });
  }
  g.font = '400 92px "Bodoni Moda", Georgia, serif';
  if ('letterSpacing' in g) g.letterSpacing = '4px';
  g.fillText('No. ' + String(num).padStart(3, '0'), 256, 262);
  g.lineWidth = 2; g.beginPath(); g.arc(256, 256, 160, 0, Math.PI * 2); g.stroke();
  return tex(c, renderer, false);
}
function shadowArt(renderer) {
  const c = canvas(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.45, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return tex(c, renderer, false);
}

/* ---------- a studio for the gold to reflect: a dark room with soft panels of light ---------- */
function studio(renderer, warm) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ color: warm ? 0x0d0a06 : 0x080808, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, color, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(4.5, 6, 4.2, 2, 3.4, 0xfff1d6, 6.5);     // key, warm, front right
  panel(1.4, 8, -4.8, 0.4, 1.6, 0xffffff, 4.2);  // tall strip, left
  panel(7, 1.4, 0, 5.4, 0.6, 0xffffff, 3.2);     // top strip
  panel(5, 1.2, 0.5, -4.6, 3, 0xe9c97a, 1.4);    // gold bounce, low front
  panel(2.2, 6, 1.5, 0.5, -5.2, 0xfff6e6, 2.2);  // back light, for the glass edges
  panel(2.6, 7, -0.9, 0.6, 6.2, 0xffe6bd, 2.6);  // front fill behind the camera, so faces that look straight at it still glow
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, .035).texture; pm.dispose();
  return t;
}

/* ---------- the model ---------- */
function build(renderer, opts) {
  const seg = small ? 96 : 160, root = new THREE.Group(), parts = {};
  const maxA = renderer.capabilities.getMaxAnisotropy();
  const gold = new THREE.MeshPhysicalMaterial({ color: GOLD_HEX, metalness: 1, roughness: .27, anisotropy: .55, anisotropyRotation: Math.PI / 2, clearcoat: .25, clearcoatRoughness: .2, envMapIntensity: 1.25 });
  const goldBright = gold.clone(); goldBright.roughness = .16; goldBright.anisotropy = 0;
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .025, transmission: 1, thickness: .06, ior: 1.5, specularIntensity: .9, envMapIntensity: 1.05, clearcoat: .3, clearcoatRoughness: .04 });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .01, transmission: 1, thickness: .06, ior: 1.65, dispersion: 4, specularIntensity: 1.4, envMapIntensity: 1.8, flatShading: true });
  const water = new THREE.MeshPhysicalMaterial({ color: 0xeef3f4, metalness: 0, roughness: 0, transparent: true, opacity: .07, envMapIntensity: .9, depthWrite: false });
  const silicone = new THREE.MeshPhysicalMaterial({ color: 0xf2efe8, roughness: .55, sheen: .4, sheenColor: new THREE.Color(0xffffff) });

  /* cap */
  const cap = new THREE.Group(); cap.name = 'cap';
  const capSideMat = gold.clone(); capSideMat.map = capSideArt(renderer); capSideMat.map.anisotropy = maxA;
  const side = new THREE.Mesh(new THREE.CylinderGeometry(21 * MM, 21 * MM, (258.6 - 234.2) * MM, seg, 1, true, Math.PI), capSideMat);
  side.position.y = (234.2 + 258.6) / 2 * MM; cap.add(side);
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[0, 260], [19.8, 260], [20.7, 259.6], [21, 258.6]]).reverse(), seg), gold));
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[16, 233.2], [19.5, 233.2], [20.6, 233.4], [21, 234.2]]), seg), gold));
  const topMat = gold.clone(); topMat.map = capTopArt(renderer); topMat.anisotropy = 0; topMat.roughness = .22;
  const top = new THREE.Mesh(new THREE.CircleGeometry(19.6 * MM, seg), topMat); top.rotation.x = -Math.PI / 2; top.position.y = 260.05 * MM; cap.add(top);
  parts.cap = cap;

  /* seal */
  const seal = new THREE.Group(); seal.name = 'seal';
  seal.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[13.4, 231.2], [19.2, 231.2], [19.6, 232.2], [19.2, 233.2], [13.4, 233.2], [13.4, 231.2]]), seg), silicone));
  parts.seal = seal;

  /* faceted ring */
  const ring = new THREE.Group(); ring.name = 'ring';
  ring.add(new THREE.Mesh(facetRing(19.2, 208.4, 230.8, 4, small ? 20 : 24, 2.1), crystal));
  ring.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[19.4, 230.8], [13.6, 230.8]]), seg), crystal));
  ring.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[13.6, 208.4], [19.4, 208.4]]), seg), crystal));
  parts.ring = ring;

  /* glass, water and the etched base */
  const body = new THREE.Group(); body.name = 'glass';
  const gp = smooth(GLASS, small ? 90 : 140);
  body.add(new THREE.Mesh(fluted(gp, 28, .045, seg), glass));
  const wp = smooth(WATER.slice(0, -1), 90).concat([WATER[WATER.length - 1]]);
  const wmesh = new THREE.Mesh(new THREE.LatheGeometry(v2(wp), seg), water); wmesh.renderOrder = 2; body.add(wmesh);
  const etchMat = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: .7, metalness: 0, transparent: true, depthWrite: false });
  const etch = new THREE.Mesh(new THREE.CircleGeometry(13 * MM, 64), etchMat);
  etch.rotation.x = Math.PI / 2; etch.position.y = 39.85 * MM; body.add(etch);
  parts.glass = body;

  /* the frame: bars, the front band, the collar, the cradle, the feet ring, the lattice and the cross underneath */
  const frame = new THREE.Group(); frame.name = 'frame';
  const prof = smooth(FRAME, small ? 90 : 150);           // [r, y] top to bottom
  const BARS = 16, TH = 1.7, W = 2.7;
  for (let k = 0; k < BARS; k++) {
    const a = k / BARS * Math.PI * 2;
    const front = k === 0;
    const path = prof.map(([r, y]) => { const rr = (r - TH / 2) * MM; return [Math.sin(a) * rr, y * MM, Math.cos(a) * rr]; });
    const geo = ribbon(path, (front ? 7.4 : W) * MM, (front ? 2.1 : TH) * MM);
    let mats = [gold, gold];
    if (front) { const bm = gold.clone(); bm.map = bandArt(renderer); bm.anisotropy = 0; mats = [bm, gold]; }
    frame.add(new THREE.Mesh(geo, mats));
  }
  const lathe = (pts, mat) => frame.add(new THREE.Mesh(new THREE.LatheGeometry(v2(pts), seg), mat));
  lathe([[13.9, 203.2], [21.6, 203.2], [22.2, 204], [22.2, 207.6], [21.6, 208.4], [13.9, 208.4], [13.9, 203.2]], goldBright); // collar
  lathe([[22.4, 40.6], [25.6, 40.6], [26, 41.4], [26, 43.6], [25.6, 44.4], [22.4, 44.4], [22.4, 40.6]], gold);              // cradle
  lathe([[31, 0], [33.2, 0], [33.6, .6], [33.6, 3.4], [33.2, 4], [31, 4], [31, 0]], goldBright);                             // feet ring
  // the lattice: an X between each pair of legs, low on the frame
  const legAt = (a, y) => { const r = interp(FRAME, y) - TH / 2; return [Math.sin(a) * r * MM, y * MM, Math.cos(a) * r * MM]; };
  for (let k = 0; k < BARS; k++) {
    const a0 = k / BARS * Math.PI * 2, a1 = (k + 1) / BARS * Math.PI * 2, steps = 18;
    [[4, 38], [38, 4]].forEach(([ya, yb]) => {
      const path = [];
      for (let s = 0; s <= steps; s++) { const t = s / steps, a = a0 + (a1 - a0) * t, y = ya + (yb - ya) * t; path.push(legAt(a, y)); }
      frame.add(new THREE.Mesh(ribbon(path, 1.9 * MM, 1.3 * MM), gold));
    });
  }
  // the cross underneath, seen in the base view
  [0, Math.PI / 2].forEach(a => {
    const path = [];
    for (let s = 0; s <= 24; s++) { const t = s / 24 * 2 - 1, r = t * 31.4; path.push([Math.sin(a) * r * MM, 1.2 * MM, Math.cos(a) * r * MM]); }
    frame.add(new THREE.Mesh(ribbon(path, 3 * MM, 2.2 * MM, { out: () => new THREE.Vector3(0, 1, 0) }), gold));
  });
  parts.frame = frame;

  Object.values(parts).forEach(p => root.add(p));
  root.position.y = -CY * MM;

  /* a soft contact shadow */
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: shadowArt(renderer), transparent: true, depthWrite: false, opacity: opts.shadow === false ? 0 : 1 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = -CY * MM - .002; sh.renderOrder = -1;

  return { root, parts, shadow: sh, etch, setNumber: n => { if (etchMat.alphaMap) etchMat.alphaMap.dispose(); etchMat.alphaMap = etchArt(renderer, n); etchMat.needsUpdate = true; } };
}

/* ---------- dimension lines ---------- */
function dims() {
  const g = new THREE.Group(), m = new THREE.LineBasicMaterial({ color: 0xe8d38a, transparent: true, opacity: .85 });
  const line = pts => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0] * MM, (p[1] - CY) * MM, p[2] * MM))), m));
  const x = 52;
  line([[x, 0, 0], [x, H, 0]]); line([[x - 4, 0, 0], [x + 4, 0, 0]]); line([[x - 4, H, 0], [x + 4, H, 0]]);
  line([[-38, -14, 0], [38, -14, 0]]); line([[-38, -18, 0], [-38, -10, 0]]); line([[38, -18, 0], [38, -10, 0]]);
  line([[-21, H + 12, 0], [21, H + 12, 0]]); line([[-21, H + 8, 0], [-21, H + 16, 0]]); line([[21, H + 8, 0], [21, H + 16, 0]]);
  g.visible = false;
  return { group: g, labels: [{ t: '260 mm', p: [x + 8, H / 2, 0], cls: 'v' }, { t: 'Ø 76 mm', p: [0, -24, 0], cls: 'h' }, { t: 'Ø 42 mm', p: [0, H + 22, 0], cls: 'h' }] };
}

/* ---------- the viewer ---------- */
export function mount(el, opts = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : (opts.maxDpr || 2)));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opts.exposure || 1.02;
  renderer.domElement.className = 'g3-canvas';
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(opts.fov || 26, 1, .1, 60);
  scene.environment = studio(renderer, true);
  const model = build(renderer, opts);
  const pivot = new THREE.Group(); pivot.add(model.root); scene.add(pivot); scene.add(model.shadow);
  const key = new THREE.DirectionalLight(0xfff0d0, 1.1); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe4a8, .8); rim.position.set(-4, 1.5, -2); scene.add(rim);
  const D = dims(); scene.add(D.group);
  model.setNumber(opts.number || 14);

  // the overlay: part labels and dimensions, placed over the canvas
  const ov = document.createElement('div'); ov.className = 'g3-ov'; ov.setAttribute('aria-hidden', 'true'); el.appendChild(ov);
  const labelEls = {};
  Object.keys(PARTS).forEach(k => { const d = document.createElement('span'); d.className = 'g3-lbl'; d.innerHTML = '<b>' + PARTS[k].label + '</b><i>' + PARTS[k].note + '</i>'; ov.appendChild(d); labelEls[k] = d; });
  const dimEls = D.labels.map(l => { const d = document.createElement('span'); d.className = 'g3-dim ' + l.cls; d.textContent = l.t; ov.appendChild(d); return d; });

  // state
  let yaw = opts.yaw || -.35, pitch = 0, tYaw = yaw, tPitch = 0, vel = 0, hoverY = 0, hoverP = 0, dist = 1, tDist = 1;
  let explode = 0, tExplode = 0, auto = opts.auto !== false && !reduce, dragging = null, hovering = false, running = false, raf = 0, last = performance.now();
  let showDims = false, lightA = 0, W = 1, Hh = 1, baseDist = 6, shown = false, ready = false;

  function size() {
    W = el.clientWidth || 1; Hh = el.clientHeight || 1;
    renderer.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix();
    const fitH = (H + 40) * MM / 2 / Math.tan(cam.fov * Math.PI / 360), fitW = .62 / Math.tan(cam.fov * Math.PI / 360) / cam.aspect;
    baseDist = Math.max(fitH, fitW) * (opts.zoom || 1.06);
  }
  const project = (p, out) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam); out[0] = (v.x + 1) / 2 * W; out[1] = (1 - v.y) / 2 * Hh; return out; };
  const tmp = [0, 0];

  function frame(now) {
    const dt = Math.min(50, now - last) / 16.67; last = now;
    if (!dragging) { tYaw += vel * dt; vel *= Math.pow(.93, dt); if (Math.abs(vel) < 1e-4) vel = 0; if (auto && !hovering && explode < .01) tYaw += .0032 * dt; }
    const k = reduce ? 1 : 1 - Math.pow(1 - .085, dt);
    yaw += (tYaw + hoverY - yaw) * k; pitch += (tPitch + hoverP - pitch) * k;
    explode += (tExplode - explode) * (reduce ? 1 : 1 - Math.pow(1 - .07, dt));
    dist += (tDist - dist) * k;
    pivot.rotation.set(pitch, yaw, 0);
    pivot.position.y = reduce ? 0 : Math.sin(now / 1000 * 1.05) * .012;
    Object.keys(PARTS).forEach(n => { model.parts[n].position.y = PARTS[n].lift * MM * explode; });
    model.shadow.material.opacity = (1 - Math.min(1, Math.abs(pitch) * 1.4)) * (opts.shadow === false ? 0 : 1);
    key.position.set(Math.sin(lightA) * 6, 3.5, Math.cos(lightA) * 5);
    scene.environmentRotation.y = lightA * .9;
    const d = baseDist * dist * (1 + explode * .34);
    cam.position.set(0, explode * .43, d); cam.lookAt(0, explode * .43, 0);
    renderer.render(scene, cam);
    if (!shown) { shown = true; requestAnimationFrame(() => el.classList.add('live')); }

    // labels follow their parts while the bottle is apart
    const showL = explode > .55;
    ov.classList.toggle('apart', showL);
    if (showL) Object.keys(PARTS).forEach(n => {
      const [r, y] = PARTS[n].anchor, P = PARTS[n];
      project([r * MM * Math.cos(0), (y - CY + P.lift * explode) * MM, 0], tmp);
      labelEls[n].style.transform = 'translate(' + (tmp[0] + 14).toFixed(1) + 'px,' + tmp[1].toFixed(1) + 'px)';
    });
    ov.classList.toggle('dims', showDims && explode < .1);
    if (showDims) D.labels.forEach((l, i) => { project([l.p[0] * MM, (l.p[1] - CY) * MM, 0], tmp); dimEls[i].style.transform = 'translate(' + tmp[0].toFixed(1) + 'px,' + tmp[1].toFixed(1) + 'px)'; });
    D.group.visible = showDims && explode < .1;
    D.group.rotation.set(0, 0, 0);
  }
  function loop(now) { if (!running) return; raf = requestAnimationFrame(loop); if (ready) frame(now); }
  function start() { if (running) return; running = true; size(); last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // pointer: drag to turn with a little inertia; hover tilts it slightly
  el.addEventListener('pointerdown', e => {
    dragging = { x: e.clientX, y: e.clientY, yaw: tYaw, pitch: tPitch, lx: e.clientX };
    try { el.setPointerCapture(e.pointerId); } catch (er) {}
    el.classList.add('grab'); vel = 0;
  });
  el.addEventListener('pointermove', e => {
    if (dragging) {
      tYaw = dragging.yaw + (e.clientX - dragging.x) * .009;
      tPitch = THREE.MathUtils.clamp(dragging.pitch + (e.clientY - dragging.y) * .005, -1.3, 1.35);
      vel = (e.clientX - dragging.lx) * .0016; dragging.lx = e.clientX;
    } else if (fine && e.pointerType === 'mouse' && !reduce) {
      const r = el.getBoundingClientRect(); hovering = true;
      hoverY = ((e.clientX - r.left) / r.width - .5) * .5; hoverP = ((e.clientY - r.top) / r.height - .5) * .14;
    }
  });
  const release = () => { dragging = null; el.classList.remove('grab'); };
  el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', () => { hovering = false; hoverY = 0; hoverP = 0; });
  el.addEventListener('wheel', e => { if (!opts.zoomable) return; e.preventDefault(); tDist = THREE.MathUtils.clamp(tDist * (1 + e.deltaY * .0012), .55, 1.4); }, { passive: false });

  if ('ResizeObserver' in window) new ResizeObserver(size).observe(el);
  size();
  // compile the shaders off the main path first, so the page never stalls and the render image stays until the model is ready
  const go = () => { ready = true; };
  setTimeout(go, 2500);                                   // never wait longer than this for the compiler
  try { (renderer.compileAsync ? renderer.compileAsync(scene, cam) : Promise.resolve()).then(go, go); } catch (e) { go(); }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting) start(); else stop(); }, { rootMargin: '120px 0px' }).observe(el);
  else start();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (el.getBoundingClientRect().bottom > 0) start(); });

  return {
    view(name) {
      const v = VIEWS[name] || VIEWS.whole;
      const turns = Math.round((tYaw - v[0]) / (Math.PI * 2));   // take the short way round
      tYaw = v[0] + turns * Math.PI * 2; tPitch = v[1]; tDist = v[2]; vel = 0;
      if (name === 'top' || name === 'base') tExplode = 0;
    },
    explode(on) { tExplode = on ? 1 : 0; if (on) { tPitch = 0; showDims = false; } },
    dims(on) { showDims = !!on; if (on) { tExplode = 0; tPitch = 0; tDist = 1.16; } else tDist = 1; },
    light(v) { lightA = (v / 100 - .5) * 2.6; },
    auto(on) { auto = !!on && !reduce; },
    number(n) { model.setNumber(n); },
    /* jump to wherever the bottle is heading and draw that frame now (used for stills, and where animation frames are throttled) */
    settle() { yaw = tYaw; pitch = tPitch; explode = tExplode; dist = tDist; vel = 0; size(); frame(performance.now()); },
    canvas: renderer.domElement
  };
}
