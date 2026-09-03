"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { timezones } from "@/lib/timezones"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  HelpCircle,
  Bell,
  LogOut,
  Zap,
} from "lucide-react"

export interface SiteHeaderProps {
  user?: {
    name: string
    email: string
    avatar: string
  }
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { selectedTimezone, setSelectedTimezone, getLocalTimezone } = useTimezoneStore()
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const themeOptions = [
    { name: "System", value: "system" },
    { name: "Dark", value: "dark" },
    { name: "Light", value: "light" }
  ]

  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "AA"

  return (
    <header className="sticky top-0 z-50 flex h-12 w-full shrink-0 items-center border-b border-border bg-card text-card-foreground px-3 select-none transition-colors">
      <div className="flex w-full items-center justify-between gap-4">
        
        {/* Left Section: Mobile Trigger, Logo & App Name */}
        <div className="flex items-center gap-2">
          {/* Mobile Sidebar Trigger */}
          <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent" />

          {/* Logo & Title */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground shrink-0 shadow-2xs font-bold text-xs">
              <Zap className="size-3.5 fill-current" />
            </div>
            <span className="font-bold text-sm text-foreground tracking-tight">Indirex Router</span>
          </Link>
        </div>

        {/* Center Section: Search Bar */}
        <div className="flex-1 max-w-xl mx-2 hidden sm:block">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-8 pl-9 pr-12 text-xs bg-muted/60 border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <kbd className="pointer-events-none absolute right-2 top-1.5 hidden select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground font-medium sm:flex">
              <span>Ctrl</span>K
            </kbd>
          </div>
        </div>

        {/* Right Section: Notifications, Help, Profile */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Notification Bell with Badge */}
          <button
            type="button"
            className="relative p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="size-4" />
            <span className="absolute top-1 right-1 flex size-2 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              1
            </span>
          </button>

          {/* Help Icon */}
          <button
            type="button"
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer hidden sm:flex"
            title="Help"
          >
            <HelpCircle className="size-4" />
          </button>

          {/* User Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<button className="outline-hidden focus:outline-hidden cursor-pointer ml-1" />}>
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold ring-2 ring-transparent hover:ring-primary/50 transition-all">
                {userInitials}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 mt-1.5">
              {/* User Identity Details */}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="flex flex-col space-y-0.5 text-left">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-none">
                      {user?.email || "email@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Theme Settings Selector */}
              <div className="px-3 py-1 text-[11px] text-muted-foreground/80 font-normal select-none">
                Theme
              </div>
              <div className="space-y-0.5">
                {themeOptions.map((option) => {
                  const isActive = mounted && theme === option.value
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className="cursor-pointer pl-8 py-1.5 text-xs text-foreground flex items-center relative rounded-md"
                    >
                      {isActive && (
                        <span className="absolute left-3.5 size-1.5 rounded-full bg-foreground" />
                      )}
                      <span>{option.name}</span>
                    </DropdownMenuItem>
                  )
                })}
              </div>

              <DropdownMenuSeparator />

              {/* Timezone Switcher Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer py-1.5 px-3 flex items-center justify-between rounded-md w-full text-left focus:bg-accent/50 outline-hidden">
                  <div className="flex flex-col">
                    <span className="text-xs text-foreground font-normal">Timezone</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{selectedTimezone}</span>
                  </div>
                </DropdownMenuSubTrigger>
                
                <DropdownMenuSubContent align="start" className="w-80 max-h-[350px] overflow-y-auto p-1.5 bg-popover rounded-lg shadow-lg ring-1 ring-foreground/10 border border-border">
                  {/* Search box */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border mb-1">
                    <Search className="size-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Search timezone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Escape") {
                          e.stopPropagation()
                        }
                      }}
                      className="w-full bg-transparent text-xs text-foreground outline-hidden border-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>

                  {/* Auto detect option */}
                  {(!search || "auto detect".includes(search.toLowerCase())) && (
                    <DropdownMenuItem
                      onClick={() => setSelectedTimezone(`Auto (${getLocalTimezone()})`)}
                      className="cursor-pointer py-1.5 px-2.5 flex items-center justify-between text-xs text-foreground rounded-md focus:bg-accent/50"
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Auto detect</span>
                        <span className="text-[10px] text-muted-foreground">{getLocalTimezone()}</span>
                      </div>
                      {selectedTimezone.startsWith("Auto") && (
                        <span className="text-xs text-foreground font-semibold">✓</span>
                      )}
                    </DropdownMenuItem>
                  )}

                  {/* Standard options */}
                  {timezones
                    .filter((tz) => tz.label.toLowerCase().includes(search.toLowerCase()))
                    .map((tz) => {
                      const isActive = selectedTimezone === tz.label
                      return (
                        <DropdownMenuItem
                          key={tz.value}
                          onClick={() => setSelectedTimezone(tz.label)}
                          className="cursor-pointer py-1.5 px-2.5 flex items-center justify-between text-xs text-foreground rounded-md focus:bg-accent/50"
                        >
                          <span>{tz.label}</span>
                          {isActive && <span className="text-xs text-foreground font-semibold">✓</span>}
                        </DropdownMenuItem>
                      )
                    })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Logout button */}
              <DropdownMenuItem
                className="cursor-pointer py-1.5 px-3 text-xs text-foreground focus:bg-accent/50 focus:text-foreground rounded-md gap-2.5"
                onClick={handleLogout}
              >
                <LogOut className="size-3.5 text-muted-foreground" />
                <span>Log out</span>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  )
}
