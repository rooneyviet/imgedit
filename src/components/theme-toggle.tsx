import { Moon, Sun } from "lucide-react"

import { Switch } from "@/components/ui/switch"

type ThemeToggleProps = {
  isDarkMode: boolean
  onCheckedChange: (checked: boolean) => void
}

export function ThemeToggle({ isDarkMode, onCheckedChange }: ThemeToggleProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Sun className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <Switch
        aria-label="Toggle dark mode"
        checked={isDarkMode}
        onCheckedChange={onCheckedChange}
      />
      <Moon className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </div>
  )
}
