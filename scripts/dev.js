// Local dev server: static files with clean URLs (as vercel.json does) plus the /api/* functions.
// Usage: node scripts/dev.js [port]      (default 5175; serve alone cannot run the checkout API)
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const port = +process.argv[2] || +process.env.PORT || 5175;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary', '.xml': 'application/xml', '.txt': 'text/plain' };
const redirects = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).redirects || []; } catch (e) { return []; } })();

const isFile = f => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } };
function resolve(p) {
  const base = path.join(root, p);
  if (!base.startsWith(root)) return null;
  for (const f of [base, base + '.html', path.join(base, 'index.html')]) if (isFile(f)) return f;
  return null;
}

function sendFile(req, res, file, status) {
  const size = fs.statSync(file).size, type = types[path.extname(file)] || 'application/octet-stream';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  const head = { 'Content-Type': type, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
  if (m && (m[1] || m[2])) {
    const s = m[1] ? +m[1] : size - +m[2], e = m[1] && m[2] ? +m[2] : size - 1;
    res.writeHead(206, Object.assign(head, { 'Content-Range': 'bytes ' + s + '-' + e + '/' + size, 'Content-Length': e - s + 1 }));
    return fs.createReadStream(file, { start: s, end: e }).pipe(res);
  }
  res.writeHead(status || 200, Object.assign(head, { 'Content-Length': size }));
  fs.createReadStream(file).pipe(res);
}

function runApi(req, res, name) {
  const file = path.join(root, 'api', name + '.js');
  if (name.startsWith('_') || !isFile(file)) { res.writeHead(404); return res.end('not found'); }
  let body = '';
  req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    Object.keys(require.cache).forEach(k => { if (k.startsWith(path.join(root, 'api')) || k.endsWith('catalogue.json')) delete require.cache[k]; });
    req.body = body; // handlers parse JSON strings themselves
    res.status = n => { res.statusCode = n; return res; };
    res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    try { await require(file)(req, res); }
    catch (e) { console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end('error'); } }
  });
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = decodeURIComponent(u.pathname);
  if (p.startsWith('/api/')) return runApi(req, res, p.slice(5).replace(/\/$/, ''));
  const r = redirects.find(x => x.source === p);
  if (r) { res.writeHead(301, { Location: r.destination }); return res.end(); }
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  const f = resolve(p === '/' ? '/index' : p);
  if (f) return sendFile(req, res, f);
  const nf = path.join(root, '404.html');
  if (isFile(nf)) return sendFile(req, res, nf, 404);
  res.writeHead(404); res.end('not found');
}).listen(port, () => console.log('ONYXAURA dev server on http://localhost:' + port));
