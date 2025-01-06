import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        cv: 'cv.html',
        blog: 'blog.html'  // Added blog.html since you have that page now
      }
    }
  }
});
