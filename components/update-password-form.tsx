'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Zap, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
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
            Choose a new password
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            Please enter your new password below
          </p>
        </div>

        {/* Error Flag Banner */}
        {error && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded text-xs font-medium flex items-start gap-2.5 mb-5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
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

          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Saving new password...</span>
              </>
            ) : (
              'Save new password'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
