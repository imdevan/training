// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://devan.gg',
	base: '/training',
	integrations: [
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
						{ label: 'Learning Theory', slug: 'learning-theory' },
					],
				},
			],
		}),
	],
});
