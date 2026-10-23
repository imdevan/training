// Renders every ```mermaid block in the docs to src/generated/mermaid/<name>.svg
// (name from the fence meta), which src/plugins/mermaid.mjs inlines at build time. Run locally (it
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
import { diagramName, hashComment, parseSvgFile, sourceHash } from '../src/plugins/mermaid-source.mjs';

const MERMAID_BLOCK = /^```mermaid([^\n]*)\n([\s\S]*?)\n```[ \t]*$/gm;

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
		const path = join(entry.parentPath, entry.name);
		const source = await readFile(path, 'utf8');
		for (const [, meta, code] of source.matchAll(MERMAID_BLOCK)) {
			const name = diagramName(meta, path);
			const hash = sourceHash(code);
			const existing = diagrams.get(name);
			if (existing && existing.hash !== hash) {
				throw new Error(`mermaid: "${name}" is used by ${existing.path} and ${path} with different diagrams`);
			}
			diagrams.set(name, { hash, code: code.trim(), path });
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

const existing = new Map();
for (const file of (await readdir(outputDir)).filter((f) => f.endsWith('.svg'))) {
	const { hash } = parseSvgFile(await readFile(join(outputDir, file), 'utf8'));
	existing.set(file.replace(/\.svg$/, ''), hash);
}
const toRender = [...diagrams].filter(([name, { hash }]) => existing.get(name) !== hash);

// Remove SVGs for diagrams that were renamed or deleted
const stale = [...existing.keys()].filter((name) => !diagrams.has(name)).map((name) => `${name}.svg`);
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

	for (const [name, { hash, code }] of toRender) {
		const svg = await page.evaluate(
			async ({ id, code }) => (await window.mermaid.render(id, code)).svg,
			{ id: `mermaid-${name}`, code },
		);
		await writeFile(join(outputDir, `${name}.svg`), `${hashComment(hash)}\n${svg}`);
		console.log(`mermaid: rendered ${name}.svg`);
	}
} finally {
	await browser.close();
}

await clearContentCache();
