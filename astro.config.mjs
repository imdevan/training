// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	site: 'https://devan.gg',
	base: '/training',
	integrations: [
		mermaid({
			theme: 'base',
			// mermaid computes derived colors (khroma) from these at init time,
			// so they must be literal colors, not CSS custom properties. The
			// actual visible colors come from the CSS overrides in custom.css,
			// which use var() and so adapt to light/dark automatically.
			autoTheme: false,
			mermaidConfig: {
				themeVariables: {
					fontFamily: 'Nunito, ui-sans-serif, system-ui, sans-serif',
					background: 'rgba(255,255,255,0)',
					primaryColor: '#cdf1e0',
					primaryBorderColor: '#3ecf8e',
					primaryTextColor: '#17301f',
					lineColor: '#7c8f85',
					edgeLabelBackground: '#ffffff',
				},
			},
		}),
		starlight({
			title: 'Training with Dev',
			components: {
				Header: './src/components/Header.astro',
			},
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{
					label: 'Overview',
					items: [
						{ label: 'Training with Dev', slug: 'index' },
					],
				},
				{
					label: 'Wiki & Reference',
					items: [
						{ label: 'Vocabulary & Cues', slug: 'vocab' },
						{ label: 'Games', slug: 'games' },
					],
				},
				{
					label: 'Theory',
					items: [{ autogenerate: { directory: 'theory' } }],
				},
			],
		}),
	],
});
