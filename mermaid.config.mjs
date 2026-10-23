// Shared by scripts/render-mermaid.mjs (renders the SVGs) and
// src/plugins/mermaid.mjs (swaps them in at build time).

// mermaid computes derived colors (khroma) from these at render time, so they
// must be literal colors, not CSS custom properties. The actual visible colors
// come from the CSS overrides in custom.css, which use var() and so adapt to
// light/dark automatically.
export const mermaidConfig = {
	startOnLoad: false,
	theme: 'base',
	themeVariables: {
		fontFamily: 'Nunito, ui-sans-serif, system-ui, sans-serif',
		background: 'rgba(255,255,255,0)',
		primaryColor: '#cdf1e0',
		primaryBorderColor: '#3ecf8e',
		primaryTextColor: '#17301f',
		lineColor: '#7c8f85',
		edgeLabelBackground: '#ffffff',
	},
	// Labels are sized when the SVG is rendered, so anything in custom.css that
	// changes text size has to be applied here too or labels get clipped
	themeCSS: `
		.nodeLabel, .label, text { font-weight: 600; }
		.edgeLabel span, .edgeLabel p, .edgeLabel div, .edgeLabel text { font-weight: 800; white-space: nowrap; }
	`,
};

// Labels are measured in the browser at render time, so the font the SVG is
// rendered with has to match the site's
export const fontStylesheet =
	'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900;1000&display=swap';

export const contentDir = 'src/content/docs';
export const outputDir = 'src/generated/mermaid';
