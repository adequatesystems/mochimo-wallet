import { generateColorFromTag, getInitials } from "@/lib/utils/colors";
import { Avatar, AvatarFallback } from "./avatar";
import { useMemo } from "react";
import { cn } from "@/lib/utils";


interface AccountAvatarProps {
  name: string
  tag: string
  emoji?: string
  className?: string
  textClassName?: string
}

export function AccountAvatar({ name, tag, emoji, className, textClassName }: AccountAvatarProps) {
  const color = useMemo(() => generateColorFromTag(tag), [tag])
  
  return (
    <Avatar className={cn("relative", className)}>
      <AvatarFallback 
        style={{ backgroundColor: color }}
        className="text-primary-foreground"
      >
        {emoji ? (
          <span className="text-2xl">
            {emoji}
          </span>
        ) : (
          <span className={cn("text-sm", textClassName)}>
            {getInitials(name)}
          </span>
        )}
      </AvatarFallback>
    </Avatar>
  )
}       