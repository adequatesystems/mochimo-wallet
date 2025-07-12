var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { manifest } from './src/config/manifest';
import fs from 'fs';
import { VitePWA } from 'vite-plugin-pwa';
function generateManifest(mode) {
    return {
        name: 'generate-manifest',
        writeBundle: function () {
            var outDir = mode === 'extension' ? 'dist/extension' : 'dist';
            var finalManifest = __assign(__assign({}, manifest), { icons: mode === 'development' ? {} : {
                    "16": "icons/icon-16.png",
                    "48": "icons/icon-48.png",
                    "128": "icons/icon-128.png"
                } });
            fs.writeFileSync("".concat(outDir, "/manifest.json"), JSON.stringify(finalManifest, null, 2));
        }
    };
}
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var isExtension = mode === 'extension';
    var isWeb = mode === 'web';
    var env = loadEnv(mode, process.cwd(), '');
    var commonPlugins = [react()];
    var plugins = __spreadArray(__spreadArray(__spreadArray([], commonPlugins, true), (isExtension ? [generateManifest(mode)] : []), true), (isWeb ? [
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
    ] : []), true);
    var buildConfig = isExtension
        ? {
            outDir: 'dist/extension',
            rollupOptions: {
                input: {
                    popup: 'index.html',
                    background: 'src/background/index.ts'
                },
                output: {
                    entryFileNames: function (chunkInfo) {
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
        plugins: plugins,
        build: buildConfig,
        preview: {}
    };
});
