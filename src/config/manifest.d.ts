export declare const manifest: {
    readonly manifest_version: 3;
    readonly name: "Mochimo Wallet";
    readonly version: string;
    readonly description: "A cryptocurrency wallet for Mochimo blockchain";
    readonly action: {
        readonly default_popup: "index.html";
        readonly default_width: 400;
        readonly default_height: 600;
    };
    readonly side_panel: {
        readonly default_path: "index.html";
    };
    readonly permissions: readonly ["storage", "sidePanel"];
    readonly background: {
        readonly service_worker: "background.js";
        readonly type: "module";
    };
    readonly icons: {
        readonly "16": "icons/icon-16.png";
        readonly "48": "icons/icon-48.png";
        readonly "128": "icons/icon-128.png";
    };
    readonly content_security_policy: {
        readonly extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'";
    };
};
export type ChromeManifest = typeof manifest;
