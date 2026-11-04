'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

import { cn, getURL } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLastProvider(localStorage.getItem('last_login_provider'))
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_login_provider', 'password')
      }
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_login_provider', 'google')
    }
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getURL('/oauth?next=/dashboard'),
        },
      })
      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('w-full flex justify-center', className)} {...props}>
      <div className="w-full max-w-[380px] bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 sm:p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="size-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground shadow-2xs mb-3">
            <Zap className="size-4.5 fill-current text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Sign in to Indirex
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Telemetry & Control Management System
          </p>
        </div>

        {/* Error Flag Banner */}
        {error && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-2.5 rounded-md text-xs font-medium flex items-start gap-2 mb-4">
            <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
          {/* Email Input */}
          <div className="flex flex-col">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-foreground mb-1 block"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all w-full"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-foreground block"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 pl-3 pr-9 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="h-9 w-full mt-1 font-semibold text-xs rounded-md shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Or
            </span>
          </div>

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="h-9 w-full bg-background hover:bg-muted/50 border border-input text-foreground font-medium text-xs rounded-md shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <svg
              className="size-3.5"
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 488 512"
            >
              <path
                fill="#4285F4"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Footer Link */}
          <div className="mt-3 pt-3 border-t border-border text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/sign-up"
              className="text-primary font-medium hover:underline"
            >
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
