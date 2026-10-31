// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
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
    // Starlight adds its own sitemap unless one is configured here; this one
    // leaves out /bg, which is only reachable by its URL
    sitemap({ filter: (page) => !page.endsWith('/bg/') }),
    starlight({
      title: 'Training with Dev',
      favicon: 'https://devan.gg/compy-guy.png',
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://devan.gg/training/homepage-screenshot.webp' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '800' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '374' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://devan.gg/training/homepage-screenshot.webp' } },
      ],
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
