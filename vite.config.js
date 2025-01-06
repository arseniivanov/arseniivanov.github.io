import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        cv: 'cv.html',
        blog: 'blog.html'
      }
    }
  },
  // Add this section to copy public assets
  publicDir: 'public',
  // Add this section to ensure PDFs are handled
  assetsInclude: ['**/*.pdf']
});
