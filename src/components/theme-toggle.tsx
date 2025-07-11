import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Moon className="h-5 w-5 text-blue-200" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-500" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 