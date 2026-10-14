import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        index: './index.html',
        background: './src/background/index.ts',
      },
      output: {
        // manifest.json names background.js, so the worker's output name is fixed
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
