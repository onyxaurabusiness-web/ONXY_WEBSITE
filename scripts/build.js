// Builds the static site from partials. Usage: node scripts/build.js
//  - generates the shop pages (collection and collection/<product>) from assets/catalogue.json (scripts/build-shop.js)
//  - injects partials/header.html and partials/footer.html into every page (root, /journal and /collection)
//  - inlines partials/art/<name>.svg where a page has <!--ART:name--><!--/ART-->
//  - fills reading times for journal essays (<!--RT--> in an essay, <!--RT:slug--> on the index)
//  - creates quiet placeholder pages for menu destinations that do not exist yet (files tagged data-stub)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const header = read('partials/header.html').trim(), footer = read('partials/footer.html').trim();

require('./build-shop'); // writes collection.html and collection/<product>.html from assets/catalogue.json

const stubs = {
  source: ['The Source', 'Where it begins.', 'Every bottle can be traced to one place.'],
  craft: ['The Craft', 'How it is made.', 'The water is only half the work.'],
  collection: ['Collection', 'One standard. Three expressions.', 'Every bottle is sourced, tested and sealed to the same standard.'],
  gold: ['Gold', 'Gold.', 'Allocated, not sold.'],
  journal: ['Journal', 'Slow essays.', 'Published rarely.'],
  partnerships: ['Partnerships', 'OnyxAura, in your space.', 'A small number of cabins, tables and brands carry the house.'],
  privacy: ['Privacy', 'Privacy.', 'We use what you share only to reply to you.'],
  terms: ['Terms of enquiry', 'Terms of enquiry.', 'Plain and short.']
};

const stubPage = (key, title, h1, line) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ONYXAURA</title>
<meta name="description" content="${line}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#070707">
<link rel="canonical" href="https://onyxaura.in/${key}">
<link rel="icon" href="/assets/logo-mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Hanken+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body data-page="${key}" data-stub>
<!--HEADER--><!--/HEADER-->
<main>
<section class="page-hero">
  <div class="wrap">
    <p class="caps gold" style="margin-bottom:26px">${title}</p>
    <h1>${h1}</h1>
    <p class="lead">${line}</p>
    <p class="note" style="margin-top:40px">This page is being prepared.</p>
    <div class="btnrow"><a class="btn ghost" href="/">Return home</a></div>
  </div>
</section>
</main>
<!--FOOTER--><!--/FOOTER-->
<script src="/assets/site.js"></script>
</body>
</html>
`;

for (const [key, [title, h1, line]] of Object.entries(stubs)) {
  const f = path.join(root, key + '.html');
  if (fs.existsSync(f) && !read(key + '.html').includes('data-stub')) continue; // never overwrite a real page
  fs.writeFileSync(f, stubPage(key, title, h1, line));
}

const hdrRe = /<!--HEADER-->[\s\S]*?<!--\/HEADER-->/;
const ftrRe = /<!--FOOTER-->[\s\S]*?<!--\/FOOTER-->/;
const artRe = /<!--ART:(\w+)-->[\s\S]*?<!--\/ART-->/g;
const rtSlugRe = /<!--RT:([\w-]+)-->[\s\S]*?<!--\/RT-->/g;
const rtRe = /<!--RT-->[\s\S]*?<!--\/RT-->/g;
const art = n => read('partials/art/' + n + '.svg').trim();

const jdir = path.join(root, 'journal');
const essays = fs.existsSync(jdir) ? fs.readdirSync(jdir).filter(x => x.endsWith('.html')) : [];
const countWords = html => {
  const m = html.match(/<article class="essay">([\s\S]*?)<\/article>/);
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').split(/\s+/).filter(Boolean).length : 0;
};
const rt = {};
essays.forEach(f => { rt[f.replace('.html', '')] = Math.max(1, Math.round(countWords(read('journal/' + f)) / 200)) + ' min read'; });

const cdir = path.join(root, 'collection');
const products = fs.existsSync(cdir) ? fs.readdirSync(cdir).filter(x => x.endsWith('.html')) : [];
const pages = fs.readdirSync(root).filter(x => x.endsWith('.html')).concat(essays.map(f => 'journal/' + f), products.map(f => 'collection/' + f));
for (const f of pages) {
  let h = read(f);
  const page = (h.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || path.basename(f, '.html');
  // legacy pages: swap the old header, banner and footer for markers on first run
  h = h.replace(/<header class="nav">[\s\S]*?<\/header>\s*<div class="for-bar">[\s\S]*?<\/div>/, '<!--HEADER--><!--/HEADER-->')
       .replace(/<footer>[\s\S]*?<\/footer>/, '<!--FOOTER--><!--/FOOTER-->');
  const hd = header.replace('data-key="' + page + '"', 'data-key="' + page + '" data-current');
  h = h.replace(hdrRe, () => '<!--HEADER-->\n' + hd + '\n<!--/HEADER-->')
       .replace(ftrRe, () => '<!--FOOTER-->\n' + footer + '\n<!--/FOOTER-->')
       .replace(artRe, (m, n) => '<!--ART:' + n + '-->' + art(n) + '<!--/ART-->')
       .replace(rtSlugRe, (m, n) => '<!--RT:' + n + '-->' + (rt[n] || '') + '<!--/RT-->')
       .replace(rtRe, () => '<!--RT-->' + (rt[path.basename(f, '.html')] || '') + '<!--/RT-->');
  fs.writeFileSync(path.join(root, f), h);
}
console.log('built ' + pages.length + ' pages');
