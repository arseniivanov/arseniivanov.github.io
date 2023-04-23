import { defineConfig } from 'vite';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  plugins: [
    copy({
      targets: [
        {
          src: 'models/**/*',
          dest: 'dist/models',
        },
      ],
      hook: 'writeBundle', // Use the 'writeBundle' hook for Vite compatibility
    }),
  ]
});
