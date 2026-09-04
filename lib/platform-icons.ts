export interface PlatformMappingItem {
  id: string
  name: string
  key: string
  iconUrl: string
  fileName?: string
}

export const SUPABASE_STORAGE_URL_PREFIX =
  "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/"

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

export function getCustomPlatformMappings(): PlatformMappingItem[] {
  if (typeof window === "undefined") return INITIAL_PLATFORMS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let list: PlatformMappingItem[] = raw ? JSON.parse(raw) : []
    
    // Ensure initial bucket platforms exist in mapping list
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
    return list
  } catch (e) {
    return INITIAL_PLATFORMS
  }
}

export function saveCustomPlatformMapping(mapping: Omit<PlatformMappingItem, "id">): PlatformMappingItem {
  const current = getCustomPlatformMappings()
  const newItem: PlatformMappingItem = {
    ...mapping,
    id: `plat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  }
  const updated = [...current, newItem]
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }
  return newItem
}

export function updatePlatformMapping(id: string, mapping: Partial<PlatformMappingItem>): PlatformMappingItem[] {
  const current = getCustomPlatformMappings()
  const updated = current.map((item) => {
    if (item.id === id) {
      return { ...item, ...mapping }
    }
    return item
  })
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }
  return updated
}

export function deletePlatformMapping(id: string): PlatformMappingItem[] {
  const current = getCustomPlatformMappings()
  const updated = current.filter((item) => item.id !== id)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }
  return updated
}

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
