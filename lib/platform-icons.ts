export interface PlatformMappingItem {
  id: string
  name: string
  key: string
  iconUrl: string
  fileName?: string
}

export const SUPABASE_STORAGE_URL_PREFIX =
  "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/"

export const MAPPINGS_JSON_PUBLIC_URL =
  "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/mappings.json"

export const INITIAL_PLATFORMS: PlatformMappingItem[] = [
  {
    id: "plat-amazon",
    name: "Amazon Prime Video",
    key: "amazon-prime",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}amazon-prime.jpeg`,
    fileName: "amazon-prime.jpeg",
  },
  {
    id: "plat-jio",
    name: "JioHotstar",
    key: "jio-hotstar",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}jio-hotstar.jpeg`,
    fileName: "jio-hotstar.jpeg",
  },
  {
    id: "plat-netflix",
    name: "Netflix",
    key: "netflix",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}netflix.jpeg`,
    fileName: "netflix.jpeg",
  },
  {
    id: "plat-youtube",
    name: "YouTube",
    key: "youtube",
    iconUrl: `${SUPABASE_STORAGE_URL_PREFIX}youtube.jpeg`,
    fileName: "youtube.jpeg",
  },
]

const STORAGE_KEY = "indirex_platform_mappings"

let cachedMappings: PlatformMappingItem[] | null = null

export function getCustomPlatformMappings(): PlatformMappingItem[] {
  if (cachedMappings && cachedMappings.length > 0) {
    return cachedMappings
  }

  if (typeof window === "undefined") return INITIAL_PLATFORMS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let list: PlatformMappingItem[] = raw ? JSON.parse(raw) : []

    let updated = false
    INITIAL_PLATFORMS.forEach((initItem) => {
      if (!list.some((item) => item.key.toLowerCase() === initItem.key.toLowerCase() || item.id === initItem.id)) {
        list.push(initItem)
        updated = true
      }
    })

    if (updated || !raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    }
    cachedMappings = list
    return list
  } catch (e) {
    return INITIAL_PLATFORMS
  }
}

export async function fetchPlatformMappings(): Promise<PlatformMappingItem[]> {
  try {
    const res = await fetch("/api/platform-mappings", { method: "GET" })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.mappings))
        }
        return data.mappings
      }
    }
  } catch (err) {
    // Fallback to public JSON URL
    try {
      const res = await fetch(MAPPINGS_JSON_PUBLIC_URL, { cache: "no-store" })
      if (res.ok) {
        const mappings = await res.json()
        if (Array.isArray(mappings)) {
          cachedMappings = mappings
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
          }
          return mappings
        }
      }
    } catch (e) {
      // ignore fallback error
    }
  }

  return getCustomPlatformMappings()
}

export async function savePlatformMappingApi(mapping: Omit<PlatformMappingItem, "id">): Promise<PlatformMappingItem[]> {
  const current = getCustomPlatformMappings()
  const newItem: PlatformMappingItem = {
    ...mapping,
    id: `plat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  }
  const updated = [...current, newItem]
  cachedMappings = updated

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  try {
    const res = await fetch("/api/platform-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", mapping: newItem }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.mappings))
        }
        return data.mappings
      }
    }
  } catch (err) {
    console.error("Failed to sync platform mapping with Supabase DB:", err)
  }

  return updated
}

export async function updatePlatformMappingApi(id: string, mapping: Partial<PlatformMappingItem>): Promise<PlatformMappingItem[]> {
  const current = getCustomPlatformMappings()
  const updated = current.map((item) => (item.id === id ? { ...item, ...mapping } : item))
  cachedMappings = updated

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  try {
    const res = await fetch("/api/platform-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, mapping }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.mappings))
        }
        return data.mappings
      }
    }
  } catch (err) {
    console.error("Failed to update platform mapping in Supabase DB:", err)
  }

  return updated
}

export async function deletePlatformMappingApi(id: string): Promise<PlatformMappingItem[]> {
  const current = getCustomPlatformMappings()
  const updated = current.filter((item) => item.id !== id)
  cachedMappings = updated

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  try {
    const res = await fetch("/api/platform-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        cachedMappings = data.mappings
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.mappings))
        }
        return data.mappings
      }
    }
  } catch (err) {
    console.error("Failed to delete platform mapping in Supabase DB:", err)
  }

  return updated
}

// Keep synchronous legacy aliases for backward compatibility
export const saveCustomPlatformMapping = savePlatformMappingApi
export const updatePlatformMapping = updatePlatformMappingApi
export const deletePlatformMapping = deletePlatformMappingApi

export function findPlatformIconUrl(platformName: string): string | null {
  if (!platformName) return null
  const p = platformName.toLowerCase().trim()
  const all = getCustomPlatformMappings()

  for (const item of all) {
    const itemKey = item.key.toLowerCase().trim()
    const itemName = item.name.toLowerCase().trim()
    if (p === itemKey || p === itemName) {
      return item.iconUrl
    }
  }

  for (const item of all) {
    const itemKey = item.key.toLowerCase().trim()
    if (p.includes(itemKey) || itemKey.includes(p)) {
      return item.iconUrl
    }
  }

  if (p.includes("youtube")) return `${SUPABASE_STORAGE_URL_PREFIX}youtube.jpeg`
  if (p.includes("prime") || p.includes("amazon")) return `${SUPABASE_STORAGE_URL_PREFIX}amazon-prime.jpeg`
  if (p.includes("jio") || p.includes("hotstar")) return `${SUPABASE_STORAGE_URL_PREFIX}jio-hotstar.jpeg`
  if (p.includes("netflix")) return `${SUPABASE_STORAGE_URL_PREFIX}netflix.jpeg`

  return null
}
