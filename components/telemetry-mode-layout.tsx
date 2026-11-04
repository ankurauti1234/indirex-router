"use client"

import * as React from "react"
import { useTelemetryModeStore, TelemetryMode } from "@/lib/use-telemetry-mode-store"
import { RefreshCw, Watch, Radio, Database } from "lucide-react"
import { cn } from "@/lib/utils"

interface TelemetryModeLayoutProps {
  children: React.ReactNode
}

export function TelemetryModeLayout({ children }: TelemetryModeLayoutProps) {
  const { mode, isSwitching, targetMode } = useTelemetryModeStore()

  const displayMode: TelemetryMode = targetMode || mode

  return (
    <div className="relative flex flex-1 flex-col min-w-0 min-h-0 w-full">
      {/* 
        Keying by mode guarantees all child pages cleanly unmount and remount fresh,
        completely purging previous telemetry rows, filter caches, and stale data.
      */}
      <div
        key={mode}
        className={cn(
          "flex flex-1 flex-col min-w-0 w-full transition-opacity duration-150",
          isSwitching && "opacity-60"
        )}
      >
        {children}
      </div>

      {/* Minimal, sleek top loading indicator matching GitHub / Atlassian design */}
      {isSwitching && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card/95 border border-border shadow-md backdrop-blur-xs text-xs font-medium text-foreground">
            {displayMode === "wearable" ? (
              <Watch className="size-3.5 text-emerald-500 animate-pulse" />
            ) : displayMode === "router" ? (
              <Radio className="size-3.5 text-sky-500 animate-pulse" />
            ) : (
              <Database className="size-3.5 text-primary animate-pulse" />
            )}
            <span>
              {displayMode === "wearable"
                ? "Wearable Mode"
                : displayMode === "router"
                ? "Router Mode"
                : "SDK Mode"}
            </span>
            <RefreshCw className="size-3 animate-spin text-muted-foreground ml-0.5" />
          </div>
        </div>
      )}
    </div>
  )
}
