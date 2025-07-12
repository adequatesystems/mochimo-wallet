import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { manifest } from './src/config/manifest'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

function generateManifest(mode: string): Plugin {
  return {
    name: 'generate-manifest',
    writeBundle() {
      const outDir = mode === 'extension' ? 'dist/extension' : 'dist'
      const finalManifest = {
        ...manifest,
        icons: mode === 'development' ? {} : {
          "16": `icons/icon-16.png`,
          "48": `icons/icon-48.png`,
          "128": `icons/icon-128.png`
        }
      }

      fs.writeFileSync(
        `${outDir}/manifest.json`,
        JSON.stringify(finalManifest, null, 2)
      )
    }
  }
}

export default defineConfig(({ mode }) => {
  const isExtension = mode === 'extension';
  const isWeb = mode === 'web';
  const env = loadEnv(mode, process.cwd(), '');

  const commonPlugins = [react()];
  const plugins = [
    ...commonPlugins,
    ...(isExtension ? [generateManifest(mode)] : []),
    ...(isWeb ? [
      VitePWA({
        manifest: {
          name: manifest.name,
          short_name: manifest.name,
          description: manifest.description,
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#ffffff',
          icons: [
            { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' }
          ]
        }
      })
    ] : [])
  ];

  const buildConfig = isExtension
    ? {
        outDir: 'dist/extension',
        rollupOptions: {
          input: {
            popup: 'index.html',
            background: 'src/background/index.ts'
          },
          output: {
            entryFileNames: (chunkInfo) => {
              return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js';
            }
          },
          manualChunks: {
            vendor: ['react', 'react-dom']
          }
        }
      }
    : isWeb
      ? {
          outDir: 'dist/web',
          define: {
            'process.env': {},
            'global': {},
          }
        }
      : {};

  return {
    define: {
      __API_URL__: JSON.stringify(env.MESH_API_URL),
      'process.env.VERSION': JSON.stringify(manifest.version)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    plugins,
    build: buildConfig,
    preview: {}
  };
});
