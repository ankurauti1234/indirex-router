'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
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
      router.push('/')
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
          redirectTo: `${window.location.origin}/oauth?next=/`,
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
      <div className="w-full max-w-[400px] bg-card text-card-foreground border border-border rounded-md shadow-lg p-8 sm:p-10 transition-all">
        {/* Atlassian Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="size-10 bg-primary rounded flex items-center justify-center text-primary-foreground shadow-2xs mb-3">
            <Zap className="size-5 fill-primary-foreground text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Log in to continue
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            Indirex Router • Telemetry & Control
          </p>
        </div>

        {/* Error Flag Banner */}
        {error && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded text-xs font-medium flex items-start gap-2.5 mb-5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email Input */}
          <div className="flex flex-col">
            <label
              htmlFor="email"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 px-3 text-sm rounded border border-input bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all w-full font-normal"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline transition-colors"
              >
                Can&apos;t log in?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pl-3 pr-10 text-sm rounded border border-input bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all w-full font-normal"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              'Log in'
            )}
          </Button>

          {/* Atlassian Styled Divider */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Social SSO Button */}
          <div className="relative w-full">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="h-10 w-full bg-card hover:bg-muted/60 border border-input text-foreground font-semibold text-sm rounded shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              <svg
                className="size-4"
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 488 512"
              >
                <path
                  fill="#4285F4"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                />
              </svg>
              <span>Google</span>
            </button>

            {lastProvider === 'google' && (
              <span className="absolute -top-2.5 right-3 bg-chart-2/15 text-chart-2 border border-chart-2/30 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight shadow-2xs flex items-center gap-1 select-none">
                <span className="size-1.5 rounded-full bg-chart-2" />
                LAST USED
              </span>
            )}
          </div>

          {/* Footer Navigation Link */}
          <div className="mt-4 pt-4 border-t border-border text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/sign-up"
              className="text-primary font-semibold hover:underline transition-colors"
            >
              Sign up for an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
