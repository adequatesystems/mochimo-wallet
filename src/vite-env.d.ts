/// <reference types="vite/client" />
/// <reference types="chrome"/>

interface Window {
  chrome: typeof chrome
}

declare module '*.svg' {
    const content: string
    export default content
}
