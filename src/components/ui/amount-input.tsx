import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AmountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onMax?: () => void
  onAmountBlur?: (value: string) => void
  className?: string
  error?: boolean
}

export function AmountInput({ 
  onMax, 
  onAmountBlur,
  className,
  error,
  ...props 
}: AmountInputProps) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onAmountBlur?.(e.target.value)
    props.onBlur?.(e)
  }

  return (
    <div className="relative">
      <Input
        {...props}
        className={cn(
          "pl-8 pr-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        onBlur={handleBlur}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 font-medium hover:bg-primary hover:text-primary-foreground"
        onClick={onMax}
      >
        MAX
      </Button>
    </div>
  )
} 