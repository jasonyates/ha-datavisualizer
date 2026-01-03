import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'HaDataVisualizer',
      fileName: 'ha-data-visualizer',
      formats: ['es'],
    },
    outDir: '../custom_components/data_visualizer/frontend',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'ha-data-visualizer.js',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
