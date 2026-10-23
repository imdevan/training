// Shared by scripts/render-mermaid.mjs (renders the SVGs) and
// src/plugins/mermaid.mjs (inlines them), so both agree on file names and
// on whether an SVG is still current.

import { createHash } from 'node:crypto';

// Each diagram is named in its fence meta (```mermaid reward-flow-chart) and
// rendered to <name>.svg, so the same name can be reused across pages
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function diagramName(meta, where) {
	const name = meta?.trim();
	if (!name || !NAME.test(name)) {
		throw new Error(
			`mermaid: ${where} needs a kebab-case name, e.g. \`\`\`mermaid reward-flow-chart (got "${name ?? ''}")`,
		);
	}
	return name;
}

// The SVG's first line records the hash of the source it was rendered from,
// so edited diagrams get re-rendered and stale ones fail the build
export function sourceHash(code) {
	return createHash('sha256').update(code.trim()).digest('hex').slice(0, 12);
}

export const hashComment = (hash) => `<!-- mermaid-source: ${hash} -->`;

const HASH_COMMENT = /^<!-- mermaid-source: ([0-9a-f]+) -->\n/;

export function parseSvgFile(contents) {
	const match = contents.match(HASH_COMMENT);
	return { hash: match?.[1], svg: contents.replace(HASH_COMMENT, '') };
}
