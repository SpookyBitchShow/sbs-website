// @ts-check
import { defineConfig } from 'astro/config';
import compress from 'astro-compress';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://spookybitchshow.de',
  integrations: [
    sitemap(),
    compress({
      CSS: true,
      HTML: true,
      Image: false, // We're already using Astro's Image component
      JavaScript: true,
      SVG: true,
    })
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Enable gzip compression
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor code for better caching
            vendor: ['astro']
          }
        }
      }
    }
  },
  build: {
    // Inline small assets to reduce HTTP requests
    inlineStylesheets: 'auto'
  }
});
