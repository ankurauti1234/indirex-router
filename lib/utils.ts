import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getURL(path: string = '') {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  // In browser, window.location.origin is always the actual deployed URL
  if (typeof window !== 'undefined' && window.location.origin) {
    url = window.location.origin
  }

  // Make sure to include http/https protocol
  url = url.includes('http') ? url : `https://${url}`
  // Trim trailing slash
  url = url.replace(/\/$/, '')

  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''

  return `${url}${cleanPath}`
}
