'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'

import { cn, getURL } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getURL('/update-password'),
      })
      if (error) throw error
      setSuccess(true)
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
            Can&apos;t log in?
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            We&apos;ll send a recovery link to your email
          </p>
        </div>

        {/* Success Flag Banner */}
        {success ? (
          <div className="flex flex-col gap-4">
            <div className="bg-chart-2/15 text-chart-2 border border-chart-2/30 p-4 rounded text-xs font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="size-5 shrink-0 text-chart-2 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-1">Check your inbox</p>
                <p className="leading-relaxed text-muted-foreground">
                  We&apos;ve sent password reset instructions to{' '}
                  <span className="font-semibold text-foreground">{email}</span> if an account exists.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="h-10 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded shadow-2xs transition-colors flex items-center justify-center gap-2 mt-2"
            >
              <ArrowLeft className="size-4" />
              Return to log in
            </Link>
          </div>
        ) : (
          <>
            {/* Error Flag Banner */}
            {error && (
              <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded text-xs font-medium flex items-start gap-2.5 mb-5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
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

              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Sending recovery link...</span>
                  </>
                ) : (
                  'Send recovery link'
                )}
              </Button>

              <div className="mt-4 pt-4 border-t border-border text-center text-xs text-muted-foreground">
                Remembered your password?{' '}
                <Link
                  href="/login"
                  className="text-primary font-semibold hover:underline transition-colors"
                >
                  Return to log in
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
