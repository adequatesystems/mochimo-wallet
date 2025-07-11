import './polyfills'
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from '@/components/theme-provider';
import { MochimoWalletProvider } from 'mochimo-wallet';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ViewModeProvider } from '@/lib/contexts/ViewModeContext';
import { log } from '@/lib/utils/logging';


// Enable dev logging if localStorage.debug is set to true
if (import.meta.env && import.meta.env.MODE === 'development') {
    // Add keyboard shortcut to toggle debug logging
    window.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Alt + ArrowDown to toggle debug mode
        if ((e.ctrlKey || e.metaKey) && e.altKey  && e.key === 'ArrowDown') {

            const debugEnabled = localStorage.getItem('debug') === 'true'
            if (debugEnabled) {
                log.disableDebug()
                console.log('Debug logging disabled')
            } else {
                log.enableDebug()
                console.log('Debug logging enabled')
            }
        }
    })
}

window.Buffer = window.Buffer || Buffer
window.process = window.process || process

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ViewModeProvider>
      <ThemeProvider defaultTheme="dark">
        <ErrorBoundary>
          <MochimoWalletProvider>
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </MochimoWalletProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ViewModeProvider>
  </React.StrictMode>,
)

console.log('React app mounted successfully');
