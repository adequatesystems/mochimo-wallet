import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mochimo.wallet',
  appName: 'Mochimo Wallet',
  webDir: 'dist/web',
  server: {
    url: undefined,
    cleartext: true
  }
}

export default config
