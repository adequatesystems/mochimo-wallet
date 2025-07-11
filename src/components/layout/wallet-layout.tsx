import { ReactNode } from 'react'
import { Menu, Maximize2, Minimize2, PanelRight, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useViewMode } from '@/lib/contexts/ViewModeContext'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface WalletLayoutProps {
  children: ReactNode
  showMenu?: boolean
  onMenuClick?: () => void
  sidebarOpen?: boolean
}

export function WalletLayout({ 
  children, 
  showMenu = false, 
  onMenuClick,
  sidebarOpen = false
}: WalletLayoutProps) {
  const { viewMode, toggleViewMode, isExtension } = useViewMode()
  
  return (
    <div className={cn(
      "flex flex-col bg-background min-h-screen min-w-full w-full h-screen",
      // Rimuovo la larghezza fissa da popup per permettere il full screen anche su mobile
      // viewMode === 'popup' ? 'w-[360px] h-[600px]' : 'w-screen h-screen'
    )}>
      {/* Fixed Header */}
      <div
        className="border-b border-border/50 shrink-0 bg-card/50"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {showMenu ? (
              <Button
                id="menu-button"
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className={cn(
                  "hover:bg-primary/10",
                  sidebarOpen && "bg-primary/10"
                )}
              >
                <Menu className="h-5 w-5 text-foreground/80" />
              </Button>
            ) : (
              <div className="w-8" />
            )}
            <div className="flex items-center gap-2">
              <Logo 
                size="sm" 
                className="text-primary"
              />
              <h1 className="text-lg font-semibold font-montserrat text-foreground/90">
                Mochimo Wallet
              </h1>
            </div>
          </div>
          <div className="flex items-center ">
            {isExtension && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleViewMode}
                    className="hover:bg-primary/10"
                  >
                    {viewMode === 'popup' ? (
                      <PanelRight className="h-4 w-4 text-foreground/80" />
                    ) : (
                      <PanelRightClose className="h-4 w-4 text-foreground/80" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{viewMode === 'popup' ? 'Expand to panel' : 'Collapse to popup'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-auto min-h-0">
        <div className="absolute inset-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}