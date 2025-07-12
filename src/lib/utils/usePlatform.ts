import { useEffect, useState } from 'react'

type Platform = 'web' | 'android' | 'ios' | 'unknown'

// Helper to detect platform (iOS, Android, or web)
export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const detectPlatform = async () => {
      if (typeof window !== 'undefined') {
        // Try to detect Capacitor runtime
        if ('Capacitor' in window) {
          try {
            // @ts-ignore - Capacitor global object
            const info = await window.Capacitor.getPlatform()
            setPlatform(info.toLowerCase() as Platform)
          } catch (e) {
            // Fallback detection through user agent
            const ua = navigator.userAgent.toLowerCase()
            if (/iphone|ipad|ipod/.test(ua)) {
              setPlatform('ios')
            } else if (/android/.test(ua)) {
              setPlatform('android')
            } else {
              setPlatform('web')
            }
          }
        } else {
          // Fallback detection through user agent
          const ua = navigator.userAgent.toLowerCase()
          if (/iphone|ipad|ipod/.test(ua)) {
            setPlatform('ios')
          } else if (/android/.test(ua)) {
            setPlatform('android')
          } else {
            setPlatform('web')
          }
        }

        // Try to get safe area insets
        const div = document.createElement('div')
        div.style.cssText = `
          position: absolute; 
          visibility: hidden;
          padding-top: env(safe-area-inset-top); 
          padding-right: env(safe-area-inset-right);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
        `
        document.body.appendChild(div)
        const computed = window.getComputedStyle(div)
        
        setSafeAreaInsets({
          top: parseInt(computed.paddingTop, 10) || 0,
          right: parseInt(computed.paddingRight, 10) || 0,
          bottom: parseInt(computed.paddingBottom, 10) || 0,
          left: parseInt(computed.paddingLeft, 10) || 0
        })
        
        document.body.removeChild(div)
        setIsReady(true)
      }
    }

    detectPlatform()
  }, [])

  const isMobile = platform === 'ios' || platform === 'android'

  return {
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android', 
    isWeb: platform === 'web',
    isMobile,
    safeAreaInsets,
    isReady
  }
}
