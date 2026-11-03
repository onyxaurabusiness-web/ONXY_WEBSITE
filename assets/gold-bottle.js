/* ONYXAURA · Gold: the bottle, modelled from the product shoot (studio front, cap close-up and top view) at its stated height of 260 mm.
   As photographed: a brushed gold cap engraved with the mountain mark and ONYXAURA, its top a brushed-silver disc in a gold rim;
   a ring of crystal-cut glass; a gold collar; a fluted glass body; and a polished gold frame of sixteen flat bars that run to the
   floor as legs, the front one a wider band carrying the mark and the name, cradling the glass on a ring and two zigzags of
   strips between the legs. Built in millimetres, shown at 1 unit = 100 mm.
   ES module: import('/assets/gold-bottle.js').then(m => m.mount(el, opts)). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const MM = 0.01;                      // millimetres to scene units
const H = 260, CY = 130;              // overall height, and the centre the model turns about
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
const small = Math.min(window.innerWidth, window.innerHeight) < 700;

/* ---------- the silhouette, measured from the front studio photograph ---------- */
// outer face of the frame bars [radius, height], from under the collar down to the floor: straight down for a few millimetres,
// then the shoulder, the widest point a little above the middle, and an even taper to the feet
const FRAME = [[23.7, 205.6], [23.7, 200], [23.8, 197], [24.1, 194], [24.7, 192], [25.5, 190], [26.9, 188], [28.6, 186], [30.8, 184], [33.0, 182], [35.4, 180], [37.6, 178], [39.5, 176], [41.0, 174], [42.4, 172], [43.6, 170], [44.6, 168], [45.5, 166], [46.3, 164], [46.9, 162], [47.4, 160], [47.8, 158], [48.3, 154], [48.8, 150], [49.1, 146], [49.2, 142], [49.1, 138], [48.9, 134], [48.7, 130], [48.4, 126], [48.2, 122], [48.0, 118], [47.8, 114], [47.6, 110], [47.4, 106], [47.1, 102], [46.9, 98], [46.6, 94], [46.4, 90], [46.1, 86], [45.9, 82], [45.6, 78], [45.3, 74], [44.9, 70], [44.4, 66], [43.9, 62], [43.3, 58], [42.7, 54], [42.0, 50], [41.3, 46], [40.6, 42], [39.9, 38], [39.1, 34], [38.3, 30], [37.5, 26], [36.7, 22], [36.0, 18], [35.2, 14], [34.4, 10], [33.8, 6], [33.4, 3], [33.1, 0]];
// sixteen bars; every other one (the front band among them) runs on to the floor as a leg, the rest end in the cradle
const BAR = { n: 16, w: 4.3, th: 2.2 }, BAND = { w: 9.0, th: 2.4 };
const NECK = 13.4, COLLAR = [205.4, 210.4, 24.0], RING = [210.6, 233.8, 23.8], CAP = [235.5, 260.0, 25.3];
const GLASS_BOTTOM = 24, FILL = 186;
// the glass follows the bars down to here, then rounds in to a full bowl that fills the cradle
const BOWL = [[0, 24], [10, 24.4], [18, 25.8], [24, 28], [28.5, 31], [31.6, 34.5], [34, 38.5], [35.8, 43], [37.2, 48.5], [38.4, 55], [39.6, 62], [40.8, 70], [42.4, 78], [43.6, 86]];
// low between the legs, four zigzags of strips running leg to leg, two rising from the front band (and every quarter turn) to
// the legs between, two falling: [height at the band, height at the next leg]
const ZIGS = [[39.0, 47.3], [29.2, 40.4], [26.8, 14.1], [20.7, 9.7]];
// the bars between the legs leave the frame here and curve in under the glass as the ribs of a basket, meeting below it
const RIB_FROM = 70;
// where the engraving sits (heights in mm): on the cap the mark over the name; on the front band the mark, then the name reading downwards
const CAP_MARK = 252.2, CAP_TEXT = 245.3, BAND_MARK = 119.5, BAND_TEXT = [115.1, 80.2];

// the mountain mark, traced from the cap close-up, in an 80 x 42 box: a ridge of three peaks and an inner peak
const PEAK_OUT = [[0, 42], [22.8, 13.5], [27.5, 20.2], [40.2, 0], [50.4, 12.5], [55.4, 9.2], [80, 40.6]];
const PEAK_IN = [[23.8, 32.3], [41.4, 12.5], [59.5, 33.7]];

const PARTS = {
  cap: { label: 'Cap', note: 'Brushed gold, a silver top, engraved', lift: 98, anchor: [25.2, 248] },
  seal: { label: 'Seal', note: 'Food-grade silicone', lift: 76, anchor: [21.5, 236.5] },
  ring: { label: 'Faceted ring', note: 'Crystal-cut glass', lift: 52, anchor: [25.4, 222] },
  glass: { label: 'Body', note: 'Fluted clear glass, 700 ml', lift: 24, anchor: [46, 128] },
  frame: { label: 'Frame', note: 'Plated in 22-carat gold', lift: -10, anchor: [42, 52] }
};
// the shoot was taken on a long lens from a little above the cap: a narrow field of view and the bottle tipped slightly towards us
const FOV = 10, PITCH = .09;
const VIEWS = { front: [0, PITCH, 1], side: [Math.PI / 2, PITCH, 1], top: [0, 1.2, .86], base: [0, -1.28, .8], whole: [0, PITCH, 1] };

/* ---------- helpers ---------- */
const v2 = a => a.map(p => new THREE.Vector2(p[0] * MM, p[1] * MM));
function smooth(points, n) {
  const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal', .5);
  return c.getSpacedPoints(n).map(p => [p.x, p.y]);
}
function interp(table, y) { // radius at a height, from a table running either way
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if ((y <= a[1] && y >= b[1]) || (y >= a[1] && y <= b[1])) { const t = (y - a[1]) / ((b[1] - a[1]) || 1); return a[0] + (b[0] - a[0]) * t; }
  }
  return y > table[0][1] ? table[0][0] : table[table.length - 1][0];
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, renderer, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function drawPeaks(g, cx, cy, w, color, lw) { // the mountain mark, w pixels wide, centred on cx, cy
  const s = w / 80, h = 42 * s;
  g.save(); g.translate(cx - w / 2, cy - h / 2); g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'miter'; g.lineCap = 'butt';
  [PEAK_OUT, PEAK_IN].forEach(P => { g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0] * s, p[1] * s) : g.moveTo(p[0] * s, p[1] * s)); g.stroke(); });
  g.restore();
}
function brushed(g, w, h, dir, base, n, alpha) { // fine brushing marks over a base colour
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * alpha;
    g.fillStyle = Math.random() > .5 ? `rgba(255,236,190,${a})` : `rgba(90,62,18,${a})`;
    if (dir === 'h') g.fillRect(0, Math.random() * h, w, Math.random() < .2 ? 2 : 1);
    else g.fillRect(Math.random() * w, 0, 1, h);
  }
}
function spaced(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }
function lettered(g, text, capH, span, x, y) { // capitals `capH` pixels tall, letter-spaced to run exactly `span` pixels, centred on x, y
  g.font = `500 100px ${SANS}`; spaced(g, 0); g.textBaseline = 'alphabetic';
  const size = capH / ((g.measureText('H').actualBoundingBoxAscent || 70) / 100);
  g.font = `500 ${size}px ${SANS}`;
  const sp = Math.max(0, (span - g.measureText(text).width) / (text.length - 1));
  spaced(g, sp); g.fillText(text, x + sp / 2, y + capH / 2);
}

/* a flat ribbon swept along a path: four faces, smooth along its length, sharp at its edges, closed at both ends;
   `width` is a number, or a function of the distance along the path (0 to 1) */
function ribbon(path, width, thick, opts = {}) {
  const n = path.length, pos = [], nor = [], uv = [], idx = [];
  const wAt = typeof width === 'function' ? width : () => width;
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
  const at = j => new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
  const wind = (a, b, c, d, nn) => { // a quad a-b-c-d (a,b first edge; c,d second edge), facing nn
    const gn = new THREE.Vector3().crossVectors(at(b).sub(at(a)), at(c).sub(at(a)));
    if (gn.dot(nn) < 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  };
  // faces: outer (+N), inner (-N), side (+S), side (-S); the outer face's u runs from the viewer's left to right, v from the path's start.
  // The broad faces are shaded as if gently crowned (their normals lean out towards the edges), as the polished bars are.
  const crown = opts.crown || 0;
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([fn, fs]) => {
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const width = wAt(i / (n - 1));
      for (let k = 0; k < 2; k++) {
        const sign = k ? 1 : -1;
        let o;
        if (fn) o = P[i].clone().addScaledVector(N[i], fn * thick / 2).addScaledVector(S[i], sign * width / 2 * fn);
        else o = P[i].clone().addScaledVector(S[i], fs * width / 2).addScaledVector(N[i], sign * thick / 2 * fs);
        pos.push(o.x, o.y, o.z);
        const nn = fn ? N[i].clone().multiplyScalar(fn).addScaledVector(S[i], sign * fn * crown).normalize() : S[i].clone().multiplyScalar(fs);
        nor.push(nn.x, nn.y, nn.z);
        uv.push(fn === 1 ? 1 - k : k, i / (n - 1));
      }
    }
    const nn0 = new THREE.Vector3(nor[base * 3], nor[base * 3 + 1], nor[base * 3 + 2]);
    for (let i = 0; i < n - 1; i++) { const a = base + i * 2; wind(a, a + 1, a + 2, a + 3, nn0); }
  });
  const per = (n - 1) * 6;
  // end caps: the four corners at each end, facing back along the path
  [[0, -1], [n - 1, 1]].forEach(([i, dir]) => {
    const base = pos.length / 3, nn = T[i].clone().multiplyScalar(dir), width = wAt(i / (n - 1));
    [[1, -1], [1, 1], [-1, -1], [-1, 1]].forEach(([a, b]) => {
      const o = P[i].clone().addScaledVector(N[i], a * thick / 2).addScaledVector(S[i], b * width / 2);
      pos.push(o.x, o.y, o.z); nor.push(nn.x, nn.y, nn.z); uv.push(0, 0);
    });
    wind(base, base + 1, base + 2, base + 3, nn);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // only the outer face carries artwork (the front band): put it in its own group
  g.addGroup(0, per, 0); g.addGroup(per, idx.length - per, 1);
  return g;
}

/* the fluted glass: a lathe whose radius ripples around the circumference, fading out at the base and the shoulder */
function fluted(profile, flutes, depth, seg) {
  const rings = profile.length, pos = [], uv = [], idx = [];
  for (let j = 0; j < rings; j++) {
    const [r0, y] = profile[j];
    const fade = THREE.MathUtils.smoothstep(y, 36, 52) * (1 - THREE.MathUtils.smoothstep(y, 180, 196));
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2;
      const r = r0 * (1 - depth * fade * Math.pow(.5 - .5 * Math.cos(flutes * a), 1.6));
      pos.push(Math.sin(a) * r * MM, y * MM, Math.cos(a) * r * MM);
      uv.push(i / seg, j / (rings - 1));
      if (j < rings - 1 && i < seg) { const p = j * (seg + 1) + i, q = p + seg + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const nr = g.attributes.normal, v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let j = 0; j < rings; j++) { // close the seam: both copies of the first column share one normal
    const a = j * (seg + 1), b = a + seg;
    v.fromBufferAttribute(nr, a).add(w.fromBufferAttribute(nr, b)).normalize();
    nr.setXYZ(a, v.x, v.y, v.z); nr.setXYZ(b, v.x, v.y, v.z);
  }
  return g;
}

/* the crystal ring: a diamond lattice of four-sided pyramids, staggered row by row, cut in half at its top and bottom edges
   (twelve round and three rows high, as in the cap close-up) */
function diamondRing(r, y0, y1, cols, rows, h) {
  const pos = [], da = Math.PI * 2 / cols, hv = (y1 - y0) / rows;
  const at = (a, rr, y) => [Math.sin(a) * rr * MM, Math.max(y0, Math.min(y1, y)) * MM, Math.cos(a) * rr * MM];
  for (let k = 0; k <= rows; k++) {
    const yc = y0 + k * hv, off = (k % 2) * da / 2, edge = k === 0 || k === rows;
    const apexY = k === 0 ? y0 + hv * .4 : k === rows ? y1 - hv * .4 : yc;
    for (let i = 0; i < cols; i++) {
      const ac = i * da + off;
      const L = at(ac - da / 2, r, yc), R = at(ac + da / 2, r, yc), T = at(ac, r, yc + hv), B = at(ac, r, yc - hv);
      const A = at(ac, r + h * (edge ? .5 : 1), apexY);
      pos.push(...L, ...B, ...A, ...B, ...R, ...A, ...R, ...T, ...A, ...T, ...L, ...A);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* ---------- artwork for the engraved and brushed surfaces (painted on canvases, repainted once the webfonts arrive) ---------- */
const GOLD_HEX = '#e0a650', INK = '#2a1f10';
const SANS = '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
const CAP_SIDE = [CAP[0] + 1.4, CAP[1] - .9]; // the engraved drum, between the lip and the rim
function paintCapSide(c) { // wraps the cap: 2048 px round its circumference, the front at u = 0.5; the name runs 27.7 mm of arc
  const g = c.getContext('2d'), k = c.width / (Math.PI * 2 * CAP[2]), top = CAP_SIDE[1];
  brushed(g, c.width, c.height, 'h', GOLD_HEX, 2400, .045);
  drawPeaks(g, c.width / 2, (top - CAP_MARK) * k, 11.9 * k, INK, .3 * k);
  g.fillStyle = INK; g.textAlign = 'center';
  lettered(g, 'ONYXAURA', 2.6 * k, 27.7 * k, c.width / 2, (top - CAP_TEXT) * k);
  return c;
}
function paintBand(c, k, at) { // the front band at k px per mm, from its top: the mark upright, then ONYXAURA reading downwards
  const g = c.getContext('2d');
  brushed(g, c.width, c.height, 'v', GOLD_HEX, 60, .03);
  drawPeaks(g, c.width / 2, at.mark * k, 7 * k, INK, .3 * k);
  g.save(); g.translate(c.width / 2, (at.text0 + at.text1) / 2 * k); g.rotate(Math.PI / 2);
  g.fillStyle = INK; g.textAlign = 'center';
  lettered(g, 'ONYXAURA', 3.1 * k, (at.text1 - at.text0) * k, 0, 0);
  g.restore();
  return c;
}
function paintTurned(c, base, light, dark, alpha) { // rows of turning marks: on a lathe they run round the part
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < c.height; y++) { g.fillStyle = `rgba(${Math.random() > .5 ? light : dark},${Math.random() * alpha})`; g.fillRect(0, y, c.width, 1); }
  return c;
}
function paintSilver(c) { // the brushed-silver disc in the top of the cap: concentric turning marks
  const g = c.getContext('2d'), m = c.width / 2;
  const gr = g.createRadialGradient(m, m, 0, m, m, m);
  gr.addColorStop(0, '#dcdddf'); gr.addColorStop(1, '#c4c6c9');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  for (let r = 2; r < m; r += 1.5) { g.strokeStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '70,72,76'},${Math.random() * .16})`; g.lineWidth = 1; g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.stroke(); }
  return c;
}
function etchArt(renderer, num) { // the number, laser-etched on the underside of the glass (white on black = alpha)
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `500 30px ${SANS}`; spaced(g, 10);
  const words = 'ONYXAURA  ·  GOLD  ·  ', R = 196;
  for (let i = 0; i < 2; i++) {
    [...words].forEach((ch, k) => {
      const a = (i * words.length + k) / (words.length * 2) * Math.PI * 2;
      g.save(); g.translate(256 + Math.sin(a) * R, 256 - Math.cos(a) * R); g.rotate(a); g.fillText(ch, 0, 0); g.restore();
    });
  }
  g.font = '400 92px "Bodoni Moda", Georgia, serif'; spaced(g, 4);
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

/* ---------- the studio the gold reflects, set up like the shoot: a pale sweep all round, a tall strip light either side,
   a soft light overhead and one behind, and straight ahead the dark of the camera, which gives polished gold its contrast ---------- */
function studio(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(12, 48, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd9d2c9).multiplyScalar(.62), side: THREE.BackSide })));
  const panel = (w, h, x, y, z, color, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(2, 10, -6.4, .6, 3.6, 0xffffff, 7);      // strip, left front
  panel(2, 10, 6.4, .6, 3.6, 0xfff5e8, 7);       // strip, right front
  panel(8, 4, 0, 8, .6, 0xffffff, 3.2);          // overhead
  panel(6, 7, 0, 1, -8, 0xffffff, 2.2);          // behind, for the edges of the glass
  panel(2.2, 1.9, 0, -.5, 9, 0x000000, 1);       // the camera, straight ahead
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, .03).texture; pm.dispose();
  return t;
}
/* what the glass reflects on a dark page: the room unlit, only the strip lights, so it reads clear (as in the dark photograph) */
function darkStudio(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(12, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b0a08, side: THREE.BackSide })));
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e8).multiplyScalar(5), side: THREE.DoubleSide });
  [[-6.4, .6, 3.6, 1.4, 10], [6.4, .6, 3.6, 1.4, 10], [-5, 1, -5.5, 1, 8], [5, 1, -5.5, 1, 8], [0, 8, .6, 7, 2.4]].forEach(([x, y, z, w, h]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  });
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, .02).texture; pm.dispose();
  return t;
}
/* what the cut crystal reflects: darkness broken by small hard lights, so each facet reads either bright or dark, as cut glass does */
function sparkle(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(12, 32, 16), new THREE.MeshBasicMaterial({ color: 0x4a4540, side: THREE.BackSide })));
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(6), side: THREE.DoubleSide });
  for (let i = 0; i < 26; i++) { // spread over the sphere on a golden-angle spiral
    const y = 1 - (i + .5) / 26 * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(i % 3 ? 1.1 : 2.2, i % 2 ? 2.4 : 1), lit);
    m.position.set(Math.cos(a) * rr * 9, y * 9, Math.sin(a) * rr * 9); m.lookAt(0, 0, 0); s.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, 0).texture; pm.dispose();
  return t;
}

/* what the glass sees behind it: a copy of the page's own background (a colour and an optional elliptical glow, as in the CSS),
   drawn only into the refraction pass, so the canvas itself stays transparent and the page shows round the bottle */
function backdrop(spec) {
  const srgb = c => { const k = new THREE.Color(c).convertLinearToSRGB(); return new THREE.Vector3(k.r, k.g, k.b); };
  const mat = new THREE.ShaderMaterial({
    uniforms: { // the colours stay in sRGB and are mixed there, as CSS mixes them, then turned to linear light
      base: { value: srgb(spec.base) }, glow: { value: srgb(spec.glow || spec.base) },
      stops: { value: new THREE.Vector4(spec.a0 || 0, spec.t1 || 1, spec.a1 || 0, spec.t2 || 1.0001) },
      at: { value: new THREE.Vector2(...(spec.at || [.5, .5])) }, size: { value: new THREE.Vector2(...(spec.size || [.5, .5])) }
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: 'uniform vec3 base, glow; uniform vec4 stops; uniform vec2 at, size; varying vec2 vUv;\n' +
      'void main() {\n float t = length((vUv - vec2(at.x, 1.0 - at.y)) / size);\n' +
      ' float a = t < stops.y ? mix(stops.x, stops.z, t / stops.y) : mix(stops.z, 0.0, clamp((t - stops.y) / max(1e-4, stops.w - stops.y), 0.0, 1.0));\n' +
      ' gl_FragColor = vec4(pow(mix(base, glow, a), vec3(2.2)), 1.0);\n}',
    depthTest: false, depthWrite: false
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.frustumCulled = false; m.renderOrder = -100;
  m.onBeforeRender = r => { mat.colorWrite = r.getRenderTarget() !== null; };
  return m;
}
function pageColor(el) { // the first solid background behind the viewer
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor, m = c.match(/[\d.]+/g);
    if (m && (m.length < 4 || +m[3] > .5)) return 'rgb(' + m.slice(0, 3).join(',') + ')';
  }
  return '#ffffff';
}

/* ---------- the model ---------- */
function build(renderer, opts) {
  const seg = small ? 112 : 176, root = new THREE.Group(), parts = {};
  const gold = new THREE.MeshPhysicalMaterial({ color: GOLD_HEX, metalness: 1, roughness: .12, clearcoat: .3, clearcoatRoughness: .08, envMapIntensity: 1.2 });
  // brushed round the cap, so its highlights run up and down it
  const goldBrushed = new THREE.MeshPhysicalMaterial({ color: GOLD_HEX, metalness: 1, roughness: .14, anisotropy: .35, anisotropyRotation: Math.PI / 2, clearcoat: .2, clearcoatRoughness: .15, envMapIntensity: 1.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, transmission: 1, thickness: .08, ior: 1.5, specularIntensity: .95, envMapIntensity: 1.1, clearcoat: .3, clearcoatRoughness: .04, depthWrite: false });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: .5, ior: 1.9, dispersion: 1.2, specularIntensity: 1.4, envMap: sparkle(renderer), envMapIntensity: 2.2, flatShading: true });
  const crystalSmooth = crystal.clone(); crystalSmooth.flatShading = false;
  const water = new THREE.MeshPhysicalMaterial({ color: 0xeef3f4, metalness: 0, roughness: 0, transparent: true, opacity: .05, envMapIntensity: .9, depthWrite: false });
  if (opts.darkPage) { const env = darkStudio(renderer); glass.envMap = env; water.envMap = env; }
  const silicone = new THREE.MeshPhysicalMaterial({ color: 0xf2efe8, roughness: .55, sheen: .4, sheenColor: new THREE.Color(0xffffff) });
  const painted = []; // canvases to repaint once the webfonts have loaded

  /* cap: a brushed gold drum with a lip below, a turned gold rim above and a brushed-silver disc set into it */
  const cap = new THREE.Group(); cap.name = 'cap';
  const [c0, c1, cr] = CAP;
  const capTex = tex(paintCapSide(canvas(2048, Math.round(2048 * (CAP_SIDE[1] - CAP_SIDE[0]) / (Math.PI * 2 * cr)))), renderer);
  painted.push([capTex, paintCapSide]);
  const capSide = goldBrushed.clone(); capSide.color.set(0xffffff); capSide.map = capTex;
  const side = new THREE.Mesh(new THREE.CylinderGeometry(cr * MM, cr * MM, (CAP_SIDE[1] - CAP_SIDE[0]) * MM, seg, 1, true, Math.PI), capSide);
  side.position.y = (CAP_SIDE[0] + CAP_SIDE[1]) / 2 * MM; cap.add(side);
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[16, c0], [cr + .3, c0], [cr + .45, c0 + .5], [cr + .45, c0 + 1.0], [cr + .3, c0 + 1.4], [cr, c0 + 1.4]]), seg), gold));            // lip
  const rimMat = goldBrushed.clone(); rimMat.color.set(0xffffff); rimMat.anisotropy = 0; rimMat.roughness = .22;
  rimMat.map = tex(paintTurned(canvas(16, 512), GOLD_HEX, '255,236,190', '96,66,20', .14), renderer);
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[cr, c1 - .9], [cr - .15, c1 - .3], [cr - .6, c1], [cr - 2.9, c1], [cr - 3.2, c1 - .4], [cr - 3.3, c1 - .7]]), seg), rimMat)); // turned rim
  // a cool silver: the studio it reflects is warm, and the shoot shows it grey
  const silver = new THREE.MeshPhysicalMaterial({ color: 0x9ea6b0, metalness: 1, roughness: .3, map: tex(paintSilver(canvas(512, 512)), renderer), envMapIntensity: .55 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry((cr - 3.3) * MM, seg), silver); disc.rotation.x = -Math.PI / 2; disc.position.y = (c1 - .7) * MM; cap.add(disc);
  parts.cap = cap;

  /* seal, inside the cap */
  const seal = new THREE.Group(); seal.name = 'seal';
  seal.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[NECK, c0 + .4], [21, c0 + .4], [21.4, c0 + 1.1], [21, c0 + 1.8], [NECK, c0 + 1.8], [NECK, c0 + .4]]), seg), silicone));
  parts.seal = seal;

  /* crystal ring: a smooth band, the diamond lattice, a smooth band, and its top and underside */
  const ring = new THREE.Group(); ring.name = 'ring';
  const [r0, r1, rr] = RING, f0 = r0 + 1.2, f1 = r1 - 2.4;
  ring.add(new THREE.Mesh(diamondRing(rr, f0, f1, 18, 4, 1.8), crystal));
  // the neck and the water inside the ring, which read dark through the cut crystal
  const core = new THREE.Mesh(new THREE.CylinderGeometry((NECK + .3) * MM, (NECK + .3) * MM, (r1 - r0) * MM, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x6b645c, roughness: .3, metalness: .4 }));
  core.position.y = (r0 + r1) / 2 * MM; ring.add(core);
  ring.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[NECK + .2, r0], [rr, r0], [rr, f0]]), seg), crystalSmooth));
  ring.add(new THREE.Mesh(new THREE.LatheGeometry(v2([[rr, f1], [rr, r1], [NECK + .2, r1]]), seg), crystalSmooth));
  parts.ring = ring;

  /* glass body, its water and the etched base: the glass follows the frame, just inside the bars */
  const body = new THREE.Group(); body.name = 'glass';
  // the glass sits just inside the bars, then draws in to its bowl, which rests in the cradle
  const bowl = BOWL, bowlTop = bowl[bowl.length - 1][1] + 2;
  const glassR = y => y >= bowlTop ? interp(FRAME, y) - BAR.th - .7 : interp(bowl, y);
  const gp = bowl.slice();
  for (let y = bowlTop; y <= 196; y += 1.6) gp.push([glassR(y), y]);
  gp.push([21, 199.5], [17, 202.8], [NECK + .4, 204.6], [NECK, 206.5], [NECK, r1 - .2], [NECK - .8, r1], [NECK - 2.4, r1]);
  body.add(new THREE.Mesh(fluted(smooth(gp, small ? 120 : 180), 24, .08, seg), glass));
  const wp = bowl.map(([r, y]) => [Math.max(0, r - 1.7), y + 1.6]);
  for (let y = bowlTop; y <= FILL; y += 2) wp.push([glassR(y) - 1.7, y]);
  const wpts = smooth(wp, 90); wpts.push([0, FILL]);
  const wmesh = new THREE.Mesh(new THREE.LatheGeometry(v2(wpts), seg), water); wmesh.renderOrder = 2; body.add(wmesh);
  const etchMat = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: .7, metalness: 0, transparent: true, depthWrite: false });
  const etch = new THREE.Mesh(new THREE.CircleGeometry(12 * MM, 64), etchMat);
  etch.rotation.x = Math.PI / 2; etch.position.y = (GLASS_BOTTOM - .15) * MM; body.add(etch);
  parts.glass = body;

  /* the frame */
  const frame = new THREE.Group(); frame.name = 'frame';
  const prof = smooth(FRAME, small ? 120 : 180);              // [r, y] top to bottom, evenly spaced along the curve
  const lens = [0]; for (let i = 1; i < prof.length; i++) lens.push(lens[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const len = lens[lens.length - 1], down = y => { for (let i = 1; i < prof.length; i++) if (prof[i][1] <= y) return lens[i]; return len; };
  // the band's artwork, drawn to scale along its length (mm from its top)
  const bk = Math.min(14, 4096 / len), bandAt = { mark: down(BAND_MARK), text0: down(BAND_TEXT[0]), text1: down(BAND_TEXT[1]) };
  const paintB = c => paintBand(c, bk, bandAt);
  const bandTex = tex(paintB(canvas(Math.round(BAND.w * bk), Math.round(len * bk))), renderer); bandTex.flipY = false;
  painted.push([bandTex, paintB]);
  const bandMat = gold.clone(); bandMat.color.set(0xffffff); bandMat.map = bandTex;
  const step = Math.PI * 2 / BAR.n;
  const lathe = (pts, mat) => frame.add(new THREE.Mesh(new THREE.LatheGeometry(v2(pts), seg), mat));
  // the ribs: down the frame to RIB_FROM, easing in onto the glass, then under its bowl to the middle (their own centre line, [r, y])
  const off = BAR.th / 2 + .5, ribLine = prof.filter(([, y]) => y >= RIB_FROM).map(([r, y]) => [r - BAR.th / 2, y]);
  for (let y = RIB_FROM - 2; y >= 50; y -= 2) {
    const t = THREE.MathUtils.smootherstep(RIB_FROM - y, 0, RIB_FROM - 52);
    ribLine.push([THREE.MathUtils.lerp(interp(FRAME, y) - BAR.th / 2, glassR(y) + off, t), y]);
  }
  // under the bowl the ribs stop at a small ring round the etched number, so it can still be read from below
  bowl.concat([[14.5, GLASS_BOTTOM + .9]]).filter(([r, y]) => r >= 14 && y < 49).sort((p, q) => q[0] - p[0]).forEach(([r, y]) => {
    const n = new THREE.Vector2(r, y - 70).normalize(); ribLine.push([r + n.x * off, y + n.y * off]);
  });
  const ribPts = smooth(ribLine, small ? 90 : 140), hubY = ribPts[ribPts.length - 1][1];
  lathe([[12.6, hubY - .75], [16, hubY - .75], [16, hubY + .75], [12.6, hubY + .75], [12.6, hubY - .75]], gold);
  const outOf = p => p.y < .6 ? new THREE.Vector3(p.x, p.y - .6, p.z) : new THREE.Vector3(p.x, 0, p.z);
  for (let k = 0; k < BAR.n; k++) {
    const a = k * step, front = k === 0, th = front ? BAND.th : BAR.th, odd = k % 2;
    const pts = odd ? ribPts : prof.map(([r, y]) => [r - th / 2, y]);
    const path = pts.map(([rc, y]) => [Math.sin(a) * rc * MM, y * MM, Math.cos(a) * rc * MM]);
    // the bars broaden where they gather under the collar, and the legs a little towards the floor
    const w = front ? BAND.w * MM : t => {
      const y = pts[Math.round(t * (pts.length - 1))][1];
      return BAR.w * MM * (1 + .45 * THREE.MathUtils.smoothstep(y, 180, 197) + (odd ? 0 : .22 * (1 - THREE.MathUtils.smoothstep(y, 30, 100))));
    };
    frame.add(new THREE.Mesh(ribbon(path, w, th * MM, { crown: front ? .18 : .26, out: odd ? outOf : null }), front ? [bandMat, gold] : gold));
  }
  const [k0, k1, kr] = COLLAR;
  lathe([[NECK + .4, k0], [kr - .4, k0], [kr, k0 + .5], [kr, k1 - .5], [kr - .4, k1], [NECK + .4, k1], [NECK + .4, k0]], goldBrushed);   // collar
  // the cradle: two zigzags of strips almost flush with the legs, running leg to leg: a V dipping onto the front band (and every
  // quarter turn) with a Λ rising to it below, opening out to the legs between
  const legAt = (a, y) => { const r = interp(FRAME, y) - 1.1; return [Math.sin(a) * r * MM, y * MM, Math.cos(a) * r * MM]; };
  ZIGS.forEach(([quarter, between]) => {
    for (let k = 0; k < BAR.n; k += 2) {
      const a0 = k * step, a1 = (k + 2) * step, ya = k % 4 ? between : quarter, yb = k % 4 ? quarter : between, path = [];
      for (let s = 0; s <= 24; s++) { const t = s / 24; path.push(legAt(a0 + (a1 - a0) * t, ya + (yb - ya) * t)); }
      frame.add(new THREE.Mesh(ribbon(path, 4.2 * MM, 1.8 * MM, { crown: .12 }), gold));
    }
  });
  parts.frame = frame;

  Object.values(parts).forEach(p => root.add(p));
  root.position.y = -CY * MM;

  /* a soft contact shadow */
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map: shadowArt(renderer), transparent: true, depthWrite: false, opacity: opts.shadow === false ? 0 : 1 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = -CY * MM - .002; sh.renderOrder = -1;

  let num = opts.number || 14;
  const setNumber = n => { num = n; if (etchMat.alphaMap) etchMat.alphaMap.dispose(); etchMat.alphaMap = etchArt(renderer, n); etchMat.needsUpdate = true; };
  return {
    root, parts, shadow: sh, etch, setNumber,
    repaint() { painted.forEach(([t, paint]) => { paint(t.image); t.needsUpdate = true; }); setNumber(num); }
  };
}

/* ---------- dimension lines ---------- */
function dims() {
  const g = new THREE.Group(), m = new THREE.LineBasicMaterial({ color: 0xe8d38a, transparent: true, opacity: .85 });
  const line = pts => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0] * MM, (p[1] - CY) * MM, p[2] * MM))), m));
  const x = 64, wb = 48.4, wc = CAP[2];
  line([[x, 0, 0], [x, H, 0]]); line([[x - 4, 0, 0], [x + 4, 0, 0]]); line([[x - 4, H, 0], [x + 4, H, 0]]);
  line([[-wb, -14, 0], [wb, -14, 0]]); line([[-wb, -18, 0], [-wb, -10, 0]]); line([[wb, -18, 0], [wb, -10, 0]]);
  line([[-wc, H + 12, 0], [wc, H + 12, 0]]); line([[-wc, H + 8, 0], [-wc, H + 16, 0]]); line([[wc, H + 8, 0], [wc, H + 16, 0]]);
  g.visible = false;
  return { group: g, labels: [{ t: '260 mm', p: [x + 8, H / 2, 0], cls: 'v' }, { t: 'Ø 76 mm', p: [0, -24, 0], cls: 'h' }, { t: 'Ø 42 mm', p: [0, H + 22, 0], cls: 'h' }] };
}

/* ---------- the viewer ---------- */
export function mount(el, opts = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(opts.dpr || Math.min(window.devicePixelRatio || 1, small ? 1.5 : (opts.maxDpr || 2)));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opts.exposure || 1.02;
  renderer.domElement.className = 'g3-canvas';
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(opts.fov || FOV, 1, .5, 120);
  scene.environment = studio(renderer);
  const fontsIn = !document.fonts || document.fonts.check(`500 20px ${SANS}`);
  const behind = Object.assign({ base: pageColor(el) }, opts.backdrop);
  const model = build(renderer, Object.assign({ darkPage: new THREE.Color(behind.base).getHSL({}).l < .4 }, opts));
  const pivot = new THREE.Group(); pivot.add(model.root); scene.add(pivot); scene.add(model.shadow);
  scene.add(backdrop(behind));
  const key = new THREE.DirectionalLight(0xfff0d0, .6); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe4a8, .5); rim.position.set(-4, 1.5, -2); scene.add(rim);
  const D = dims(); scene.add(D.group);
  model.setNumber(opts.number || 14);
  // the engraving is lettered in the site's own typeface: if it was still on its way, paint the lettering again once it lands
  if (!fontsIn && document.fonts.load) Promise.all([document.fonts.load(`500 20px ${SANS}`), document.fonts.load('400 20px "Bodoni Moda"')]).then(() => model.repaint(), () => {});

  // the overlay: part labels and dimensions, placed over the canvas
  const ov = document.createElement('div'); ov.className = 'g3-ov'; ov.setAttribute('aria-hidden', 'true'); el.appendChild(ov);
  const labelEls = {};
  Object.keys(PARTS).forEach(k => { const d = document.createElement('span'); d.className = 'g3-lbl'; d.innerHTML = '<b>' + PARTS[k].label + '</b><i>' + PARTS[k].note + '</i>'; ov.appendChild(d); labelEls[k] = d; });
  const dimEls = D.labels.map(l => { const d = document.createElement('span'); d.className = 'g3-dim ' + l.cls; d.textContent = l.t; ov.appendChild(d); return d; });

  // state
  const p0 = opts.pitch != null ? opts.pitch : PITCH;
  let yaw = opts.yaw || 0, pitch = p0, tYaw = yaw, tPitch = p0, vel = 0, hoverY = 0, hoverP = 0, dist = 1, tDist = 1;
  let explode = 0, tExplode = 0, auto = opts.auto !== false && !reduce, dragging = null, hovering = false, running = false, raf = 0, last = performance.now();
  let showDims = false, lightA = 0, W = 1, Hh = 1, baseDist = 6, shown = false, ready = false;

  function size() {
    W = el.clientWidth || 1; Hh = el.clientHeight || 1;
    renderer.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix();
    const fitH = (H + 40) * MM / 2 / Math.tan(cam.fov * Math.PI / 360), fitW = .66 / Math.tan(cam.fov * Math.PI / 360) / cam.aspect;
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
    pivot.position.y = reduce || opts.still ? 0 : Math.sin(now / 1000 * 1.05) * .012;
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
      project([r * MM, (y - CY + P.lift * explode) * MM, 0], tmp);
      labelEls[n].style.transform = 'translate(' + (tmp[0] + 14).toFixed(1) + 'px,' + tmp[1].toFixed(1) + 'px)';
    });
    ov.classList.toggle('dims', showDims && explode < .1);
    if (showDims) D.labels.forEach((l, i) => { project([l.p[0] * MM, (l.p[1] - CY) * MM, 0], tmp); dimEls[i].style.transform = 'translate(' + tmp[0].toFixed(1) + 'px,' + tmp[1].toFixed(1) + 'px)'; });
    D.group.visible = showDims && explode < .1;
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
  // compile the shaders off the main path first, so the page never stalls and the photograph stays until the model is ready
  const go = () => { ready = true; };
  setTimeout(go, 2500);                                   // never wait longer than this for the compiler
  try { (renderer.compileAsync ? renderer.compileAsync(scene, cam) : Promise.resolve()).then(go, go); } catch (e) { go(); }
  if (!opts.still) {
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting) start(); else stop(); }, { rootMargin: '120px 0px' }).observe(el);
    else start();
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (el.getBoundingClientRect().bottom > 0) start(); });
  }

  return {
    view(name) {
      const v = VIEWS[name] || VIEWS.whole;
      const turns = Math.round((tYaw - v[0]) / (Math.PI * 2));   // take the short way round
      tYaw = v[0] + turns * Math.PI * 2; tPitch = v[1]; tDist = v[2]; vel = 0;
      if (name === 'top' || name === 'base') tExplode = 0;
    },
    explode(on) { tExplode = on ? 1 : 0; if (on) { tPitch = .02; showDims = false; } },
    dims(on) { showDims = !!on; if (on) { tExplode = 0; tPitch = 0; tDist = 1.16; } else { tDist = 1; tPitch = p0; } },
    light(v) { lightA = (v / 100 - .5) * 2.6; },
    auto(on) { auto = !!on && !reduce; },
    number(n) { model.setNumber(n); },
    turn(a, p, d) { tYaw = a; if (p != null) tPitch = p; if (d != null) tDist = d; },
    repaint() { model.repaint(); },
    /* jump to wherever the bottle is heading and draw that frame now (used for stills, and where animation frames are throttled) */
    settle() { yaw = tYaw; pitch = tPitch; explode = tExplode; dist = tDist; vel = 0; size(); frame(performance.now()); },
    /* a still of the current view, as a data URL (mount with preserve: true for a dependable read-back) */
    still(type) { this.settle(); return renderer.domElement.toDataURL(type || 'image/png'); },
    canvas: renderer.domElement
  };
}
