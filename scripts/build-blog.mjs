// Builds the English blog from Markdown: content/blog/<slug>.md -> blog/<slug>.html,
// plus blog/index.html, and adds every post to sitemap.xml.
//
// The site is plain static HTML, so the generated pages are committed like the
// rest of the site. Run after adding or editing a post:
//
//   node scripts/build-blog.mjs
//
// Each post starts with front matter:
//
//   ---
//   title: Moving to Spain With Your UK Car
//   description: One or two sentences for Google and social cards.
//   date: 2026-11-18
//   image: /blog/img/spanish-number-plate.jpg
//   imageAlt: A Spanish number plate
//   imageCredit: Photo: Name, CC BY 2.0, via Wikimedia Commons
//   keywords: uk car spanish plates
//   ---
//
// Write posts in British English, like the rest of the site.
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'content', 'blog');
const OUT = path.join(ROOT, 'blog');
const SITE = 'https://replatebarcelona.com';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parse(file) {
  const m = file.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: m[2] };
}

const formatDate = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const header = `<header class="site">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Replate Barcelona home">
      <span class="brand__mark" aria-hidden="true"></span>
      <span>Replate <small>Barcelona</small></span>
    </a>
    <nav class="nav" aria-label="Main">
      <a href="/#how">How it works</a>
      <a href="/#costs">Costs</a>
      <a href="/#deadlines">Deadlines</a>
      <a href="/#faq">FAQ</a>
      <a href="/blog" aria-current="page">Guides</a>
      <a class="btn btn--primary btn--sm" href="/#quote">Get a quote</a>
    </nav>
  </div>
</header>`;

const footer = `<footer class="site-foot">
  <div class="wrap">
    <div class="row">
      <a class="brand" href="/"><span class="brand__mark" aria-hidden="true"></span><span>Replate <small>Barcelona</small></span></a>
      <span>UK and foreign cars onto Spanish plates · Barcelona and all of Catalonia · English · Español</span>
    </div>
    <div class="row">
      <span><a data-link="whatsapp" href="https://wa.me/34603904089" target="_blank" rel="noopener">Message us on WhatsApp</a></span>
      <span>© 2026 Replate Barcelona</span>
    </div>
    <p>Fees, tax rates and deadlines in these guides are based on 2026 rules in Catalonia. Your fixed quote confirms the exact amounts for your car.</p>
  </div>
</footer>`;

const style = `<style>
.blog-hero{background:var(--surface);border-bottom:1px solid var(--rule);padding-block:clamp(2.6rem,6vw,4.4rem)}
.blog-hero h1{font-size:var(--fs-h1);max-width:20ch;margin-top:.7rem}
.blog-hero .lead{margin-top:1rem}
.crumbs{font-family:var(--font-mono);font-size:.78rem;color:var(--muted)}
.crumbs a{color:inherit}
.blog-main{padding-block:clamp(2.4rem,5vw,4rem)}
.blog-figure{margin:0 0 2rem;max-width:760px}
.blog-figure img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:10px;display:block}
.blog-figure figcaption{margin-top:.45rem;font-size:.78rem;color:var(--muted)}
.blog-body{max-width:68ch;font-size:var(--fs-body);line-height:1.7}
.blog-body>*+*{margin-top:1.1em}
.blog-body h2{font-size:clamp(1.6rem,3vw,2.1rem);margin-top:1.6em}
.blog-body a{color:var(--accent)}
.blog-body ul,.blog-body ol{padding-left:1.3em}
.blog-body li+li{margin-top:.4em}
.blog-body table{display:block;overflow-x:auto;width:100%;border-collapse:collapse;font-size:.95rem}
.blog-body th,.blog-body td{text-align:left;padding:.55em .75em;border-bottom:1px solid var(--rule)}
.blog-cta{margin-top:2.5rem;max-width:68ch;padding:clamp(1.4rem,3vw,2rem);background:var(--accent-soft);border-radius:10px;display:grid;gap:.8rem}
.blog-cta h2{font-size:var(--fs-h3)}
.blog-list{list-style:none;margin:0;padding:0;display:grid;gap:clamp(1.4rem,3vw,2rem)}
@media(min-width:760px){.blog-list{grid-template-columns:1fr 1fr}}
.blog-card{display:grid;gap:.6rem;text-decoration:none;color:inherit;background:var(--surface);border:1px solid var(--rule);border-radius:10px;overflow:hidden;box-shadow:var(--shadow)}
.blog-card img{width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;display:block}
.blog-card__body{display:grid;gap:.45rem;padding:0 1.25rem 1.25rem}
.blog-card h2{font-size:var(--fs-h3)}
.blog-card:hover h2{color:var(--accent)}
.blog-card p{color:var(--muted)}
</style>`;

function page({ title, description, canonical, ogImage, ogImageAlt, type, jsonLd, body }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Replate Barcelona">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="en_GB"><meta property="og:image" content="${ogImage}"><meta property="og:image:alt" content="${esc(ogImageAlt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${ogImage}"><meta name="robots" content="index, follow, max-image-preview:large">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/site.css">
${style}
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
</head>
<body>
${header}
<main id="main">
${body}
</main>
${footer}
</body>
</html>
`;
}

const posts = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const slug = f.replace(/\.md$/, '');
    const { data, body } = parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    return { slug, ...data, html: marked.parse(body) };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

fs.mkdirSync(OUT, { recursive: true });

for (const p of posts) {
  const url = `${SITE}/blog/${p.slug}`;
  const html = page({
    title: `${p.title} | Replate Barcelona`,
    description: p.description,
    canonical: url,
    ogImage: `${SITE}${p.image}`,
    ogImageAlt: p.imageAlt,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BlogPosting',
          headline: p.title,
          description: p.description,
          datePublished: p.date,
          image: `${SITE}${p.image}`,
          url,
          mainEntityOfPage: url,
          author: { '@type': 'Organization', name: 'Replate Barcelona', url: SITE },
          publisher: { '@type': 'Organization', name: 'Replate Barcelona', url: SITE },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
            { '@type': 'ListItem', position: 3, name: p.title, item: url },
          ],
        },
      ],
    },
    body: `<section class="blog-hero"><div class="wrap">
<p class="crumbs"><a href="/">Home</a> › <a href="/blog">Guides</a></p>
<p class="eyebrow" style="margin-top:1rem">${formatDate(p.date)}</p>
<h1>${esc(p.title)}</h1>
<p class="lead">${esc(p.description)}</p>
</div></section>
<section class="blog-main"><div class="wrap">
<figure class="blog-figure"><img src="${p.image}" alt="${esc(p.imageAlt)}" width="1920" height="1080">${p.imageCredit ? `<figcaption>${esc(p.imageCredit)}</figcaption>` : ''}</figure>
<div class="blog-body">${p.html}</div>
<aside class="blog-cta"><p class="eyebrow">Fixed, itemised quote</p><h2>Get your car on Spanish plates without leaving Catalonia</h2><p>We collect the car, sort the headlights, take it through the import ITV, deal with customs and tax, and bring it back on Spanish plates. Quotes within one working day.</p><p><a class="btn btn--primary" href="/#quote">Get my fixed quote</a></p></aside>
</div></section>`,
  });
  fs.writeFileSync(path.join(OUT, `${p.slug}.html`), html);
}

const cards = posts
  .map(
    (p) => `<li><a class="blog-card" href="/blog/${p.slug}"><img src="${p.image}" alt="${esc(p.imageAlt)}" loading="lazy" width="1920" height="1200"><div class="blog-card__body"><p class="eyebrow">${formatDate(p.date)}</p><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p></div></a></li>`,
  )
  .join('\n');

fs.writeFileSync(
  path.join(OUT, 'index.html'),
  page({
    title: 'Guides: UK Cars on Spanish Plates in Catalonia | Replate Barcelona',
    description:
      'Plain-English guides to putting a UK or foreign car on Spanish plates in Catalonia: deadlines, headlights, the import ITV, tax and paperwork.',
    canonical: `${SITE}/blog`,
    ogImage: `${SITE}${posts[0].image}`,
    ogImageAlt: posts[0].imageAlt,
    type: 'website',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Replate Barcelona guides', url: `${SITE}/blog` },
    body: `<section class="blog-hero"><div class="wrap">
<p class="crumbs"><a href="/">Home</a> › Guides</p>
<h1>Guides to Spanish plates</h1>
<p class="lead">Plain-English guides to getting a UK or foreign car onto Spanish plates in Catalonia: deadlines, headlights, the ITV, tax and paperwork.</p>
</div></section>
<section class="blog-main"><div class="wrap"><ul class="blog-list">
${cards}
</ul></div></section>`,
  }),
);

// Sitemap: replace the blog entries, keep everything else.
const sitemapPath = path.join(ROOT, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
sitemap = sitemap.replace(/\n?\s*<url>\s*<loc>https:\/\/replatebarcelona\.com\/blog[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
const entries = [`  <url>\n    <loc>${SITE}/blog</loc>\n    <lastmod>${posts[0].date}</lastmod>\n  </url>`]
  .concat(posts.map((p) => `  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>\n    <lastmod>${p.date}</lastmod>\n  </url>`))
  .join('\n');
sitemap = sitemap.replace('</urlset>', `${entries}\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Built ${posts.length} posts and the blog index; sitemap updated.`);
