import { useEffect, useState } from 'react'

// Returns the safe area top inset in px (if available), otherwise 0
export function useSafeAreaTop() {
  const [safeAreaTop, setSafeAreaTop] = useState(0)

  useEffect(() => {
    // Try to read CSS env variable
    if (typeof window !== 'undefined') {
      const div = document.createElement('div')
      div.style.cssText = 'padding-top: env(safe-area-inset-top); position: absolute; visibility: hidden;'
      document.body.appendChild(div)
      const computed = window.getComputedStyle(div).paddingTop
      document.body.removeChild(div)
      // Parse px value
      const px = parseInt(computed, 10)
      setSafeAreaTop(isNaN(px) ? 0 : px)
    }
  }, [])

  return safeAreaTop
}
