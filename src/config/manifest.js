import { version } from '../../package.json';
export var manifest = {
    manifest_version: 3,
    name: "Mochimo Wallet",
    version: version,
    description: "A cryptocurrency wallet for Mochimo blockchain",
    action: {
        default_popup: "index.html",
        default_width: 400,
        default_height: 600
    },
    side_panel: {
        default_path: "index.html"
    },
    permissions: [
        "storage",
        "sidePanel"
    ],
    background: {
        service_worker: "background.js",
        type: "module"
    },
    icons: {
        "16": "icons/icon-16.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
    },
    content_security_policy: {
        extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    }
};
