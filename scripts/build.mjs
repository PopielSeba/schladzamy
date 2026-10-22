import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { pages, renderPage } from '../src/templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'dist');
const rawBase = process.env.BASE_PATH || '';
const base = rawBase === '/' ? '' : `/${rawBase.replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
if (base && !/^\/[a-zA-Z0-9/_-]+$/.test(base)) throw new Error('BASE_PATH must be a URL path, e.g. /schladzamy');
const parsedUrl = new URL(process.env.SITE_URL || 'https://schladzamy.pl');
if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error('SITE_URL must be an HTTP(S) URL');
const siteUrl = parsedUrl.href.replace(/\/+$/, '');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(resolve(root, 'public'), out, { recursive: true });

for (const page of pages) {
  let html = renderPage(page, { siteUrl });
  if (base) {
    html = html.replace(/\b(href|src|action|data-gallery-image)="\/(?!\/)/g, `$1="${base}/`);
    html = html.replace(/\b(srcset|imagesrcset)="([^"]*)"/g, (_, attribute, candidates) => {
      const prefixed = candidates.replace(/(^|,\s*)\/(?!\/)/g, `$1${base}/`);
      return `${attribute}="${prefixed}"`;
    });
  }
  const file = page.path === '/404.html' ? resolve(out, '404.html') : resolve(out, `.${page.path}`, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(p => !p.noindex).map(p => `  <url><loc>${siteUrl}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(resolve(out, 'sitemap.xml'), sitemap);
await writeFile(resolve(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(resolve(out, '.nojekyll'), '');
await writeFile(resolve(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n');
console.log(`Built ${pages.length} pages → dist (SITE_URL=${siteUrl}, BASE_PATH=${base || '/'})`);
