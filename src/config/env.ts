interface EnvConfig {
  apiUrl: string
  isDevelopment: boolean
  isProduction: boolean
}

export const env: EnvConfig = {
  apiUrl: import.meta.env.VITE_MESH_API_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
} 
