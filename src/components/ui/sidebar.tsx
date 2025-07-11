import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './button'
import { Plus, Settings, Edit2 } from 'lucide-react'
import { Avatar, AvatarFallback } from './avatar'
import { generateColorFromTag, getInitials } from '@/lib/utils/colors'
import { Account } from 'mochimo-wallet'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './tooltip'
import { AccountAvatar } from './account-avatar'

interface SidebarProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  selectedAccount: string | null
  onSelectAccount: (account: Account) => void
  onCreateAccount: () => void
  onManageAccounts: () => void
  onOpenSettings: () => void
}

export function Sidebar({
  isOpen,
  onOpenChange,
  accounts,
  selectedAccount,
  onSelectAccount,
  onCreateAccount,
  onManageAccounts,
  onOpenSettings
}: SidebarProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const menuButton = document.getElementById('menu-button')
      if (isOpen && 
          sidebar && 
          !sidebar.contains(event.target as Node) && 
          menuButton && 
          !menuButton.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onOpenChange])

  return (
    <AnimatePresence>
      {isOpen && (
        <TooltipProvider>
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/5 dark:bg-black/20 z-10"
              onClick={() => onOpenChange(false)}
            />

            {/* Sidebar */}
            <motion.div
              id="sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="absolute inset-y-0 left-0 w-24 bg-background border-r z-20 flex flex-col"
            >
              {/* Accounts List - Scrollable */}
              <div className="flex-1 min-h-0 py-2">
                <div className="h-full overflow-y-auto px-1.5 space-y-1 scrollbar-thin scrollbar-thumb-secondary">
                  {accounts.map((account) => {
                    const accountName = account.name 


                    return (
                      <Tooltip key={account.index} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              "w-full flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors",
                              selectedAccount === account.tag
                                ? "bg-primary/10 ring-1 ring-primary/20"
                                : "hover:bg-secondary/50"
                            )}
                            onClick={() => {
                              onSelectAccount(account)
                              onOpenChange(false)
                            }}
                          >
                            <AccountAvatar name={accountName} tag={account.tag} emoji={account.avatar} className="h-12 w-12" />
                            <span className="text-[10px] font-medium truncate w-full text-center">
                              {accountName}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {accountName}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>

              {/* Bottom Actions - Vertical */}
              <div className="p-1.5 border-t flex flex-col gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-full max-w-[88px] mx-auto justify-center"
                      onClick={onCreateAccount}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    New Account
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-full max-w-[88px] mx-auto justify-center"
                      onClick={onManageAccounts}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Manage Accounts
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-full max-w-[88px] mx-auto justify-center"
                      onClick={onOpenSettings}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Settings
                  </TooltipContent>
                </Tooltip>
              </div>
            </motion.div>
          </>
        </TooltipProvider>
      )}
    </AnimatePresence>
  )
} 