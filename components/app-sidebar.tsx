"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Activity,
  History,
  GitFork,
  SlidersHorizontal,
  Router,
  Home,
  Terminal,
  Blocks,
  FileBarChart,
  Database,
} from "lucide-react"

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const sidebarGroups = [
    {
      label: "MONITOR & ANALYSIS",
      items: [
        { title: "Dashboard", icon: Home, url: "/dashboard" },
        { title: "Events Explorer", icon: Database, url: "/events" },
        { title: "Sessions", icon: Activity, url: "/sessions" },
        { title: "Activity Timeline", icon: History, url: "/activity" },
        { title: "Reports", icon: FileBarChart, url: "/reports" },
      ],
    },
    {
      label: "SYSTEM LOGIC",
      items: [
        { title: "Event Mapping", icon: GitFork, url: "/event-mapping" },
        { title: "Rules", icon: SlidersHorizontal, url: "/rules" },
      ],
    },
    {
      label: "INFRASTRUCTURE",
      items: [
        { title: "Devices", icon: Router, url: "/devices" },
        { title: "Households", icon: Home, url: "/households" },
        { title: "Diagnostics & Logs", icon: Terminal, url: "/logs" },
      ],
    },
    {
      label: "CONNECTIONS",
      items: [
        { title: "Integrations", icon: Blocks, url: "/integrations" },
      ],
    },
  ]

  return (
    <Sidebar
      collapsible="offcanvas"
      className="top-12! h-[calc(100vh-3rem)]! border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200"
      {...props}
    >
      <SidebarContent className="py-3 px-2 gap-4 text-xs overflow-y-auto select-none">
        {sidebarGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0 space-y-1">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 h-5">
                {group.label}
              </SidebarGroupLabel>
            )}

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url === "/dashboard" && pathname === "/")

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        className={`relative w-full h-8.5 justify-start gap-3 rounded-md pl-3 pr-2.5 text-[13px] transition-colors font-medium ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }`}
                        render={<Link href={item.url} />}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-accent-foreground" />
                        )}
                        <item.icon
                          className={`size-4 shrink-0 transition-colors ${
                            isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground"
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
