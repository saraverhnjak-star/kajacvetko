import { mkdir, readFile, writeFile } from 'node:fs/promises';

// GitHub Pages has no SPA rewrites. Give every existing route an HTML entry.
// Keep these paths in sync with src/i18n.js and routeIds in src/main.jsx.
const languages = ['sl', 'de', 'en'];
const pages = ['', 'o-meni', 'razstave', 'kontakt'];
const output = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', output), 'utf8');

for (const language of languages) {
  for (const page of pages) {
    const directory = new URL(`${language}/${page ? `${page}/` : ''}`, output);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL('index.html', directory), html);
  }
}

await writeFile(new URL('.nojekyll', output), '');
console.log('Prepared 12 GitHub Pages route entry points.');
