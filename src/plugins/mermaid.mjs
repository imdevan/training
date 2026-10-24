// Swaps each ```mermaid block for the SVG pre-rendered by `bun run mermaid`
// (scripts/render-mermaid.mjs), inlined so custom.css can theme it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineMdastPlugin } from 'satteri';
import { outputDir } from '../../mermaid.config.mjs';
import { diagramName, parseSvgFile, sourceHash } from './mermaid-source.mjs';

export default defineMdastPlugin({
	name: 'mermaid-prerendered',
	code(node, ctx) {
		if (node.lang !== 'mermaid') return;

		const where = ctx.fileURL ? fileURLToPath(ctx.fileURL) : 'a mermaid block';
		const name = diagramName(node.meta, where);
		const file = join(outputDir, `${name}.svg`);

		let contents;
		try {
			contents = readFileSync(file, 'utf8');
		} catch {
			throw new Error(`mermaid: ${file} is missing, run \`bun run mermaid\``);
		}
		const { hash, svg } = parseSvgFile(contents);
		if (hash !== sourceHash(node.value)) {
			throw new Error(`mermaid: ${file} is out of date with ${where}, run \`bun run mermaid\``);
		}

		// An html node is emitted verbatim; `{ raw }` would re-parse the SVG as
		// markdown (smart quotes in its <style>, text after <br> dropped)
		ctx.replaceNode(node, { type: 'html', value: `<div class="mermaid">${svg}</div>` });
	},
});
