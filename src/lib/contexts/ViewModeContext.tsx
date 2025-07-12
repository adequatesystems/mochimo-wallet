import { createContext, useContext, useEffect, useState } from 'react'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet");

type ViewMode = 'popup' | 'panel'

interface ViewModeContextType {
    viewMode: ViewMode
    toggleViewMode: () => void
    isExtension: boolean
}

const ViewModeContext = createContext<ViewModeContextType>({
    viewMode: 'popup',
    toggleViewMode: () => { },
    isExtension: false
})

// Safe chrome type for web build (only if not already declared)
declare global {
  interface Window {
    // chrome: any; // RIMOSSO: causa conflitto con @types/chrome
  }
}

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const [viewMode, setViewMode] = useState<ViewMode>('popup')
    const isExtension = typeof window.chrome !== 'undefined' && window.chrome.runtime !== undefined

    useEffect(() => {
        if (!isExtension) return; // Evita errori in web
        window.chrome.storage.local.get('viewMode', (result: any) => {
            if (result.viewMode) {
                setViewMode(result.viewMode)
            }
            if (result.viewMode === 'panel') {
                window.chrome.runtime.connect({ name: 'mochimo_side_panel' });
            }
        })
    }, [])

    const openPanelMode = async () => {
        if (!isExtension) return;
        try {
            logger.info('current view mode', viewMode)
            if (viewMode === 'popup') {
                const tabs = await window.chrome.tabs.query({ active: true, currentWindow: true })
                logger.info('Active tabs:', tabs)
                if (tabs[0]?.id) {
                    logger.info('Attempting to open side panel for tab:', tabs[0].id)
                    // Close popup immediately after sending message
                    window.chrome.runtime.sendMessage({
                        type: 'OPEN_SIDE_PANEL',
                        tabId: tabs[0].id
                    }).then((res: any) => {
                        logger.info('response', res)
                        window.close()
                    })
                }
            } else {
                window.close();
            }
        } catch (error) {
            logger.error('Failed to toggle view mode:', error)
            return false
        }
    }

    return (
        <ViewModeContext.Provider value={{ viewMode, toggleViewMode: openPanelMode, isExtension }}>
            {children}
        </ViewModeContext.Provider>
    )
}

export const useViewMode = () => useContext(ViewModeContext)