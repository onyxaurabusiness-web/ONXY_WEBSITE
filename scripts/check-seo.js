// Static SEO and link checks for built pages. Usage: node scripts/check-seo.js [page.html ...]
// Reports title/description length, heading structure, canonical, structured data and broken internal links.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['source.html'];
const exists = p => fs.existsSync(path.join(root, p));
let problems = 0;
const warn = (page, msg) => { problems++; console.log('  ✗ ' + msg); };

for (const page of pages) {
  const h = fs.readFileSync(path.join(root, page), 'utf8');
  console.log('\n' + page);
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  console.log('  title (' + title.length + '): ' + title);
  console.log('  description (' + desc.length + ')');
  if (!title) warn(page, 'missing <title>'); else if (title.length > 70) warn(page, 'title longer than 70 characters');
  if (!desc) warn(page, 'missing meta description'); else if (desc.length < 70 || desc.length > 165) warn(page, 'description should be 70 to 165 characters');
  const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canon) warn(page, 'missing canonical'); else console.log('  canonical: ' + canon);
  if (/<meta name="robots" content="[^"]*noindex/.test(h)) warn(page, 'page is set to noindex');
  if (!/<html lang="en">/.test(h)) warn(page, 'missing lang attribute');
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  console.log('  headings: h1=' + h1 + ' h2=' + (h.match(/<h2[\s>]/g) || []).length + ' h3=' + (h.match(/<h3[\s>]/g) || []).length);
  if (h1 !== 1) warn(page, 'expected exactly one h1, found ' + h1);
  ['og:title', 'og:description', 'og:url', 'og:image'].forEach(p => { if (!h.includes('property="' + p + '"')) warn(page, 'missing ' + p); });
  const ogimg = (h.match(/property="og:image" content="https:\/\/onyxaura\.in([^"]+)"/) || [])[1];
  if (ogimg && !exists(ogimg.replace(/^\//, ''))) warn(page, 'og:image file not found: ' + ogimg);
  // structured data
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  ld.forEach((m, i) => { try { const j = JSON.parse(m[1]); const t = (j['@graph'] || [j]).map(x => x['@type']).join(', '); console.log('  json-ld #' + (i + 1) + ' valid: ' + t); } catch (e) { warn(page, 'json-ld #' + (i + 1) + ' is not valid JSON'); } });
  if (!ld.length) warn(page, 'no structured data');
  // images and svgs: accessible names
  [...h.matchAll(/<img\b[^>]*>/g)].forEach(m => { if (!/\balt=/.test(m[0])) warn(page, 'img without alt: ' + m[0].slice(0, 60)); });
  [...h.matchAll(/<svg\b[^>]*>/g)].forEach(m => { if (!/aria-hidden="true"|role="img"|aria-label/.test(m[0]) && !/class="foot-fallback"/.test(m[0])) warn(page, 'svg without a name or aria-hidden: ' + m[0].slice(0, 70)); });
  // internal links
  const links = new Set([...h.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[#?][^"]*)?"/g)].map(m => m[1]));
  let broken = 0;
  for (const l of links) {
    if (l === '/') continue;
    const clean = l.replace(/^\//, '');
    const ok = exists(clean) || exists(clean + '.html') || exists(clean + '/index.html');
    if (!ok) { broken++; warn(page, 'broken internal link: ' + l); }
  }
  console.log('  internal links checked: ' + links.size + ', broken: ' + broken);
  const confirms = (h.match(/class="confirm"/g) || []).length;
  console.log('  unresolved [CONFIRM] placeholders: ' + confirms);
}
console.log('\n' + (problems ? problems + ' issue(s) found' : 'No issues found'));
process.exit(problems ? 1 : 0);
