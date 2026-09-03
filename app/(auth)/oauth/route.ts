import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    next = '/'
  }

  // Determine external host for Vercel vs localhost
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const baseUrl = (!isLocalEnv && forwardedHost)
    ? `${forwardedProto}://${forwardedHost}`
    : origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && !user.email.endsWith('@inditronics.com')) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${baseUrl}/error?error=Only @inditronics.com email addresses are allowed.`)
      }

      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  // return the user to an error page if code is missing or exchange failed
  return NextResponse.redirect(`${baseUrl}/error?error=Authentication failed. Please try logging in again.`)
}
