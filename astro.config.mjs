// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { satteri } from '@astrojs/markdown-satteri';
import mermaid from './src/plugins/mermaid.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://devan.gg',
	base: '/training',
	// Diagrams are pre-rendered to src/generated/mermaid, re-rendering any that are
	// stale as pages build; see src/plugins/mermaid.mjs
	markdown: {
		processor: satteri({ mdastPlugins: [mermaid] }),
	},
	integrations: [
		starlight({
			title: 'Training with Dev',
			lastUpdated: true,
			components: {
				Header: './src/components/Header.astro',
				PageTitle: './src/components/PageTitle.astro',
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
