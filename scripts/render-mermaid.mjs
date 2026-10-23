// Renders every ```mermaid block in the docs to an SVG in src/generated/mermaid,
// which src/plugins/mermaid.mjs inlines at build time. Run locally (it
// needs a Chromium) and commit the output, so remote builds don't need a browser.
//
// Uses $CHROMIUM_PATH if set, otherwise the first system Chromium/Chrome found,
// otherwise a Playwright-managed one (`bunx playwright-core install chromium`).

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { contentDir, fontStylesheet, mermaidConfig, outputDir } from '../mermaid.config.mjs';
import { mermaidHash } from '../src/plugins/mermaid-hash.mjs';

const MERMAID_BLOCK = /^```mermaid[^\n]*\n([\s\S]*?)\n```[ \t]*$/gm;

const SYSTEM_BROWSERS = [
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
	'/usr/bin/google-chrome',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

async function findDiagrams(dir) {
	const diagrams = new Map();
	for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) continue;
		const source = await readFile(join(entry.parentPath, entry.name), 'utf8');
		for (const [, code] of source.matchAll(MERMAID_BLOCK)) {
			diagrams.set(mermaidHash(code), code.trim());
		}
	}
	return diagrams;
}

// Astro caches rendered MDX until the file itself changes, so a re-rendered
// SVG (e.g. after editing mermaid.config.mjs) wouldn't show up without this
async function clearContentCache() {
	for (const path of ['.astro/data-store.json', 'node_modules/.astro/data-store.json']) {
		await rm(path, { force: true });
	}
}

const diagrams = await findDiagrams(contentDir);
await mkdir(outputDir, { recursive: true });

const existing = new Set((await readdir(outputDir)).filter((f) => f.endsWith('.svg')));
const toRender = [...diagrams].filter(([hash]) => !existing.has(`${hash}.svg`));

// Remove SVGs for diagrams that were edited or deleted
const stale = [...existing].filter((file) => !diagrams.has(file.replace(/\.svg$/, '')));
for (const file of stale) {
	await rm(join(outputDir, file));
	console.log(`mermaid: removed stale ${file}`);
}

if (toRender.length === 0) {
	if (stale.length > 0) await clearContentCache();
	console.log(`mermaid: ${diagrams.size} diagram(s) up to date`);
	process.exit(0);
}

const executablePath = process.env.CHROMIUM_PATH ?? SYSTEM_BROWSERS.find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath });

try {
	const page = await browser.newPage();
	await page.setContent(
		`<!doctype html><html><head><link rel="stylesheet" href="${fontStylesheet}"></head>` +
			`<body style="font-family: ${mermaidConfig.themeVariables.fontFamily}"></body></html>`,
	);
	await page.addScriptTag({ path: createRequire(import.meta.url).resolve('mermaid/dist/mermaid.min.js') });
	await page.evaluate(async (config) => {
		// Load every weight up front so labels are measured with the real font
		await Promise.all(
			[400, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px Nunito`)),
		);
		window.mermaid.initialize(config);
	}, mermaidConfig);

	for (const [hash, code] of toRender) {
		const svg = await page.evaluate(
			async ({ id, code }) => (await window.mermaid.render(id, code)).svg,
			{ id: `mermaid-${hash}`, code },
		);
		await writeFile(join(outputDir, `${hash}.svg`), svg);
		console.log(`mermaid: rendered ${hash}.svg`);
	}
} finally {
	await browser.close();
}

await clearContentCache();
