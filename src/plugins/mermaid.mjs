// Swaps each ```mermaid block for the SVG pre-rendered by `bun run mermaid`
// (scripts/render-mermaid.mjs), inlined so custom.css can theme it. A missing
// or out-of-date SVG is rendered on the spot, so editing a diagram during
// `astro dev` (or building with an uncommitted edit) just works.

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { defineMdastPlugin } from 'satteri';
import { outputDir } from '../../mermaid.config.mjs';
import { diagramName, parseSvgFile, sourceHash } from './mermaid-source.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const script = join(root, 'scripts/render-mermaid.mjs');

// One render at a time: pages are processed concurrently, and a single run
// renders every stale diagram anyway
let rendering = Promise.resolve();

function renderDiagrams() {
	const run = rendering.then(() => promisify(execFile)(process.execPath, [script], { cwd: root }));
	rendering = run.catch(() => {});
	return run;
}

async function readSvg(file) {
	try {
		return parseSvgFile(await readFile(file, 'utf8'));
	} catch {
		return {};
	}
}

export default defineMdastPlugin({
	name: 'mermaid-prerendered',
	async code(node, ctx) {
		if (node.lang !== 'mermaid') return;

		const where = ctx.fileURL ? fileURLToPath(ctx.fileURL) : 'a mermaid block';
		const name = diagramName(node.meta, where);
		const file = join(root, outputDir, `${name}.svg`);
		const hash = sourceHash(node.value);

		let { hash: rendered, svg } = await readSvg(file);
		if (rendered !== hash) {
			try {
				await renderDiagrams();
			} catch (error) {
				throw new Error(`mermaid: couldn't render ${name}.svg for ${where}\n${error.stderr || error.message}`);
			}
			({ hash: rendered, svg } = await readSvg(file));
			if (rendered !== hash) {
				throw new Error(`mermaid: ${file} is still out of date with ${where} after rendering`);
			}
		}

		// An html node is emitted verbatim; `{ raw }` would re-parse the SVG as
		// markdown (smart quotes in its <style>, text after <br> dropped)
		ctx.replaceNode(node, { type: 'html', value: `<div class="mermaid">${svg}</div>` });
	},
});
