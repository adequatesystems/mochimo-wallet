import { version } from '../../package.json'

export const manifest = {
  manifest_version: 3,
  name: "Mochimo Wallet",
  version,
  description: "A cryptocurrency wallet for Mochimo blockchain",
  action: {
    default_popup: "index.html"
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
  }
} as const

export type ChromeManifest = typeof manifest 