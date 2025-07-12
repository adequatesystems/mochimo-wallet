import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const truncateMiddle = (text: string, startChars = 8, endChars = 8) => {
  if (text.length <= startChars + endChars) return text

  return `${text.slice(0, startChars)}...${text.slice(-endChars)}`
}