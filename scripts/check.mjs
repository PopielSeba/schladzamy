import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Check the built output, independently of the source templates.
// Usage: node scripts/check.mjs [directory-containing-built-site]
// For a subdirectory deployment, use the same BASE_PATH and full SITE_URL as the build.
const defaultDist = fileURLToPath(new URL('../dist/', import.meta.url));
const dist = process.argv[2] ? path.resolve(process.argv[2]) : defaultDist;
const basePath = ('/' + (process.env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')).replace(/^\/$/, '');
const expectedSiteUrl = new URL(process.env.SITE_URL || 'https://schladzamy.pl').href.replace(/\/+$/, '');
const requiredRoutes = [
  '/',
  '/serwis-klimatyzacji/',
  '/wynajem-klimatyzacji/',
  '/sprzedaz-klimatyzacji/',
  '/klimatyzatory/',
  '/klimatyzatory/lennox-bah-085/',
  '/klimatyzatory/carrier-fc93/',
  '/klimatyzatory/dantherm-ac-m18/',
  '/zastosowania/klimatyzacja-hal-namiotowych/',
  '/zastosowania/klimatyzacja-imprez/',
  '/zastosowania/klimatyzacja-magazynow/',
  '/kontakt/',
];
const errors = new Set();
const titles = new Map();
const descriptions = new Map();
const canonicalOrigins = new Set();
const canonicalUrls = new Map();
let localReferenceCount = 0;
let jsonLdCount = 0;

function report(location, message) {
  errors.add(location + ': ' + message);
}

function decodeEntities(value) {
  const named = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? match;
    const hex = entity[1].toLowerCase() === 'x';
    const number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
  });
}

function textContent(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attributes(source) {
  const result = Object.create(null);
  const pattern = /(?:^|\s)([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function tags(html) {
  const withoutBodies = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>')
    .replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, '$1</style>');
  return [...withoutBodies.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)]
    .map((match) => ({ name: match[1].toLowerCase(), attrs: attributes(match[2]) }));
}

async function isFile(filename) {
  try {
    return (await stat(filename)).isFile();
  } catch {
    return false;
  }
}

async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await htmlFiles(filename));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(filename);
  }
  return result.sort();
}

function routeOf(filename) {
  const relative = path.relative(dist, filename).split(path.sep).join('/');
  return '/' + relative.replace(/(?:^|\/)index\.html$/, (match) => match.startsWith('/') ? '/' : '');
}

function routeFile(route) {
  return path.join(dist, route.replace(/^\/+/, ''), 'index.html');
}

function publicRoute(route) {
  return basePath + route;
}

function uniqueValue(values, value, route, label) {
  const normalized = textContent(value).toLocaleLowerCase('pl');
  if (!normalized) {
    report(route, label + ' is empty');
    return;
  }
  const previous = values.get(normalized);
  if (previous && previous !== route) report(route, label + ' duplicates ' + previous);
  else values.set(normalized, route);
}

async function checkLocalReference(value, route, attribute) {
  const reference = value.trim();
  if (!reference) {
    if (attribute === 'src') report(route, 'empty src attribute');
    return;
  }
  if (reference.startsWith('#') || reference.startsWith('//')
    || /^(?:https?:|mailto:|tel:|data:|blob:)/i.test(reference)) return;
  if (/^[a-z][a-z\d+.-]*:/i.test(reference)) {
    report(route, 'unsupported ' + attribute + ' URL: ' + reference);
    return;
  }
  localReferenceCount += 1;
  let pathname;
  try {
    const pageRoute = publicRoute(route.startsWith('/') ? route : '/');
    pathname = decodeURIComponent(new URL(reference, 'https://local.invalid' + pageRoute).pathname);
  } catch {
    report(route, 'invalid ' + attribute + ' URL: ' + reference);
    return;
  }
  if (basePath) {
    if (pathname === basePath) pathname = '/';
    else if (pathname.startsWith(basePath + '/')) pathname = pathname.slice(basePath.length);
    else {
      report(route, attribute + ' is outside BASE_PATH ' + basePath + ': ' + reference);
      return;
    }
  }
  const filename = path.resolve(dist, '.' + pathname);
  const relative = path.relative(dist, filename);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    report(route, attribute + ' escapes the output directory: ' + reference);
    return;
  }
  if (!await isFile(filename) && !await isFile(path.join(filename, 'index.html'))) {
    report(route, 'missing local ' + attribute + ' target: ' + reference);
  }
}

// Read URLs independently of their width/pixel-density descriptors. Data URLs
// may contain commas, so splitting the entire attribute on commas is unsafe.
function srcsetReferences(value) {
  const references = [];
  let position = 0;
  while (position < value.length) {
    while (position < value.length && /[\s,]/.test(value[position])) position += 1;
    if (position >= value.length) break;
    const start = position;
    while (position < value.length && !/\s/.test(value[position])) position += 1;
    let reference = value.slice(start, position);
    if (reference.endsWith(',')) reference = reference.replace(/,+$/, '');
    else {
      while (position < value.length && value[position] !== ',') position += 1;
      if (value[position] === ',') position += 1;
    }
    if (reference) references.push(reference);
  }
  return references;
}

async function checkPage(filename) {
  const html = await readFile(filename, 'utf8');
  const route = routeOf(filename);
  const is404 = route === '/404.html';
  const allTags = tags(html);
  const htmlTag = allTags.find((tag) => tag.name === 'html');
  if (!htmlTag || !/^pl(?:-|$)/i.test(htmlTag.attrs.lang ?? '')) {
    report(route, 'missing Polish html lang attribute');
  }

  const pageTitles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  if (pageTitles.length !== 1) report(route, 'expected exactly one title element');
  else uniqueValue(titles, pageTitles[0][1], route, 'title');

  const pageDescriptions = allTags.filter((tag) => tag.name === 'meta'
    && tag.attrs.name?.toLowerCase() === 'description');
  if (pageDescriptions.length !== 1) report(route, 'expected exactly one meta description');
  else uniqueValue(descriptions, pageDescriptions[0].attrs.content ?? '', route, 'description');

  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)];
  if (headings.length !== 1 || !textContent(headings[0]?.[1] ?? '')) {
    report(route, 'expected exactly one nonempty H1');
  }

  const canonicals = allTags.filter((tag) => tag.name === 'link'
    && (tag.attrs.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  if (is404) {
    if (canonicals.length) report(route, '404 page must not have a canonical link');
  } else if (canonicals.length !== 1) {
    report(route, 'expected exactly one canonical link');
  } else {
    try {
      const url = new URL(canonicals[0].attrs.href);
      if (url.protocol !== 'https:' || url.search || url.hash || url.pathname !== publicRoute(route)) {
        report(route, 'canonical must be an absolute HTTPS URL for this route without query or fragment');
      }
      if (expectedSiteUrl && url.href !== expectedSiteUrl + route) {
        report(route, 'canonical differs from SITE_URL for this route');
      }
      canonicalOrigins.add(url.origin);
      const duplicate = canonicalUrls.get(url.href);
      if (duplicate) report(route, 'canonical duplicates ' + duplicate);
      canonicalUrls.set(url.href, route);
    } catch {
      report(route, 'invalid canonical URL');
    }
  }

  let pageJsonLdCount = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(match[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    pageJsonLdCount += 1;
    jsonLdCount += 1;
    try {
      const data = JSON.parse(match[2]);
      if (data === null || typeof data !== 'object') throw new Error('expected an object or array');
    } catch (error) {
      report(route, 'invalid JSON-LD: ' + error.message);
    }
  }
  // Error pages need no structured data; any present JSON-LD is still validated.
  if (!is404 && !pageJsonLdCount) report(route, 'missing JSON-LD');

  for (const tag of allTags) {
    if (tag.name === 'img' && !Object.hasOwn(tag.attrs, 'alt')) {
      report(route, 'image has no alt attribute: ' + (tag.attrs.src ?? '(missing src)'));
    }
    // Empty alt is valid for an intentionally decorative image.
    for (const attribute of ['href', 'src', 'action', 'data-gallery-image']) {
      if (Object.hasOwn(tag.attrs, attribute)) {
        await checkLocalReference(tag.attrs[attribute], route, attribute);
      }
    }
    for (const attribute of ['srcset', 'imagesrcset']) {
      if (!Object.hasOwn(tag.attrs, attribute)) continue;
      const references = srcsetReferences(tag.attrs[attribute]);
      if (!references.length) report(route, 'empty ' + attribute + ' attribute');
      for (const reference of references) await checkLocalReference(reference, route, attribute);
    }
  }

  const publicText = textContent(html.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ''))
    + ' ' + allTags.flatMap((tag) => [tag.attrs.alt ?? '', tag.attrs.content ?? '', tag.attrs.title ?? '']).join(' ');
  if (/\b(?:TODO|FIXME|TBD|lorem)\b/i.test(decodeEntities(html))) {
    report(route, 'unfinished placeholder text found');
  }
  if (/\bMASTER[\s-]*BV[\s-]*691\s*S\b/i.test(publicText)) {
    report(route, 'heater model left over from the source website');
  }
}

async function checkSitemap() {
  const filename = path.join(dist, 'sitemap.xml');
  if (!await isFile(filename)) {
    report('sitemap.xml', 'missing file');
    return;
  }
  const xml = await readFile(filename, 'utf8');
  const locations = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)];
  const routes = new Set();
  const seenUrls = new Set();
  if (!locations.length) report('sitemap.xml', 'no URL entries found');
  for (const match of locations) {
    const location = decodeEntities(match[1].trim());
    try {
      const url = new URL(location);
      if (url.protocol !== 'https:' || url.search || url.hash) {
        report('sitemap.xml', 'invalid canonical URL: ' + location);
      }
      if (canonicalOrigins.size === 1 && !canonicalOrigins.has(url.origin)) {
        report('sitemap.xml', 'origin differs from page canonicals: ' + location);
      }
      if (seenUrls.has(url.href)) report('sitemap.xml', 'duplicate URL: ' + location);
      seenUrls.add(url.href);
      routes.add(url.pathname);
      if (url.pathname === publicRoute('/404.html')) report('sitemap.xml', '404 page must not be listed');
      if (!canonicalUrls.has(url.href)) {
        report('sitemap.xml', 'URL has no matching page canonical: ' + location);
      }
      await checkLocalReference(url.pathname, 'sitemap.xml', 'loc');
    } catch {
      report('sitemap.xml', 'malformed URL: ' + location);
    }
  }
  for (const route of requiredRoutes) {
    if (!routes.has(publicRoute(route))) report('sitemap.xml', 'missing route ' + publicRoute(route));
  }
}

async function checkAiIndexes() {
  for (const name of ['llms.txt', 'llms-full.txt']) {
    const filename = path.join(dist, name);
    if (!await isFile(filename)) {
      report(name, 'missing information file');
      continue;
    }
    const content = await readFile(filename, 'utf8');
    if (!content.startsWith('# ')) report(name, 'missing Markdown heading');
    if (!content.includes('\n')) report(name, 'missing actual line breaks');
    if (content.includes(String.fromCharCode(92) + 'n')) report(name, 'literal escaped newline sequences');
    const serviceRoute = requiredRoutes.find(route => route.startsWith('/serwis-'));
    if (serviceRoute && !content.includes(serviceRoute)) report(name, 'missing service URL');
  }
}

async function main() {
  if (Number.parseInt(process.versions.node, 10) < 22) {
    throw new Error('Node.js 22 or newer is required.');
  }
  if (basePath && !/^\/[a-zA-Z0-9/_-]+$/.test(basePath)) {
    throw new Error('BASE_PATH must be a URL path, for example /schladzamy.');
  }
  if (expectedSiteUrl) {
    const url = new URL(expectedSiteUrl);
    if (url.protocol !== 'https:' || url.search || url.hash) {
      throw new Error('SITE_URL must be an HTTPS URL without a query or fragment.');
    }
    if (url.pathname.replace(/\/+$/, '') !== basePath) {
      throw new Error('The path in SITE_URL must match BASE_PATH.');
    }
  }
  try {
    if (!(await stat(dist)).isDirectory()) throw new Error('not a directory');
  } catch {
    throw new Error('Built site not found at ' + dist + '. Run the build first.');
  }
  for (const route of requiredRoutes) {
    if (!await isFile(routeFile(route))) report(route, 'missing generated HTML file');
  }
  if (!await isFile(path.join(dist, '404.html'))) report('/404.html', 'missing generated HTML file');
  const files = await htmlFiles(dist);
  for (const filename of files) await checkPage(filename);
  if (canonicalOrigins.size > 1) report('canonicals', 'pages use more than one origin');
  await checkSitemap();
  await checkAiIndexes();
  if (errors.size) {
    console.error('Site checks failed (' + errors.size + '):\n'
      + [...errors].map((error) => '  - ' + error).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Site checks passed: ' + files.length + ' HTML pages, '
      + jsonLdCount + ' JSON-LD blocks, ' + localReferenceCount + ' local references, sitemap.');
  }
}

await main().catch((error) => {
  console.error('Site checks failed: ' + error.message);
  process.exitCode = 1;
});
