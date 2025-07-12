/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MESH_API_URL: string
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 