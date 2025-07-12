import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AtSign as At, X } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AccountAvatar } from "../ui/account-avatar"
import { cn } from "@/lib/utils"
import { TagUtils } from "mochimo-wots"

interface AddressOption {
  value: string
  label: string
  tag: string
  emoji?: string
  description?: string
}

interface AddressInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur'> {
  value: string
  onChange: (value: string) => void
  onBlur?: (value: string) => void
  options?: AddressOption[]
  error?: boolean
  onErrorChange?: (error: boolean) => void
  placeholder?: string
  className?: string
}

export function AddressInput({
  value,
  onChange,
  onBlur,
  options = [],
  error,
  onErrorChange,
  placeholder = "Enter address",
  className,
  ...props
}: AddressInputProps) {
  const [open, setOpen] = React.useState(false)
  const selectedOption = options.find(opt => opt.value === value)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const validateAddress = (value: string) => {
    const trimmedValue = value.trim()
    
    if (!trimmedValue) return null
    
    if (trimmedValue.length !== 30) {
      return 'Tag must be exactly 30 characters'
    }

    if (!TagUtils.validateBase58Tag(trimmedValue)) {
      return 'Invalid tag format'
    }

    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim()
    
    if (trimmedValue !== e.target.value) {
      onChange(trimmedValue)
    }

    const error = validateAddress(trimmedValue)
    onErrorChange?.(!!error)
    onBlur?.(trimmedValue)
  }

  const handleOptionSelect = (option: AddressOption) => {
    onChange(option.value)
    onErrorChange?.(false)
    setOpen(false)
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative flex items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost"
              size="sm"
              className="absolute left-0 h-full px-3 hover:bg-transparent z-20"
            >
              <At className="h-4 w-4 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-full p-0 mt-1 z-50" 
            align="start"
            side="bottom"
            style={{ 
              width: containerRef.current?.offsetWidth || 'auto',
              pointerEvents: 'auto', // Fix the issue with the popover not being clickable on some systems
              position: 'fixed'  // Try forcing fixed positioning
            }}
          >
            <div className="max-h-[300px] overflow-y-auto py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
                >
                  <AccountAvatar
                    name={option.label}
                    tag={option.tag}
                    emoji={option.emoji}
                    className="h-6 w-6"
                    textClassName="text-xs"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm">
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {option.value}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {selectedOption ? (
          <div className="flex items-center w-full pl-10 pr-3 h-10 border rounded-md bg-muted/50">
            <AccountAvatar
              name={selectedOption.label}
              tag={selectedOption.tag}
              emoji={selectedOption.emoji}
              className="h-6 w-6 mr-2"
              textClassName="text-xs"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium text-sm">
                {selectedOption.label}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {selectedOption.value.slice(0, 8)}...{selectedOption.value.slice(-8)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-background/80"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Input
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={cn(
              "pl-10",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            {...props}
          />
        )}
      </div>
    </div>
  )
} 