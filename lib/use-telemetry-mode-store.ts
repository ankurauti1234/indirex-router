import { create } from "zustand"

export type TelemetryMode = "sdk" | "router" | "wearable"

interface TelemetryModeState {
  mode: TelemetryMode
  setMode: (mode: TelemetryMode) => void
  toggleMode: () => void
}

const STORAGE_KEY = "indirex_telemetry_mode"

export const useTelemetryModeStore = create<TelemetryModeState>((set) => {
  // Read initial value from localStorage if available in browser
  const getInitialMode = (): TelemetryMode => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === "router" || saved === "sdk" || saved === "wearable") return saved
      } catch {
        // Fallback
      }
    }
    return "sdk"
  }

  return {
    mode: getInitialMode(),
    setMode: (mode) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, mode)
        } catch {
          // ignore
        }
      }
      set({ mode })
    },
    toggleMode: () => {
      set((state) => {
        const order: TelemetryMode[] = ["sdk", "router", "wearable"]
        const idx = order.indexOf(state.mode)
        const next = order[(idx + 1) % order.length]
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, next)
          } catch {
            // ignore
          }
        }
        return { mode: next }
      })
    },
  }
})

