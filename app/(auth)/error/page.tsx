import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[400px] bg-card text-card-foreground border border-border rounded-md shadow-lg p-8 sm:p-10 text-center transition-all">
        {/* Warning Icon */}
        <div className="size-12 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4 text-destructive">
          <AlertTriangle className="size-6 text-destructive" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
          Something went wrong
        </h1>

        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-xs text-destructive mb-6 text-left font-medium">
          {params?.error ? (
            <p>Authentication Error: {params.error}</p>
          ) : (
            <p>An unexpected authentication error occurred. Please try logging in again.</p>
          )}
        </div>

        <Link
          href="/login"
          className="h-10 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded shadow-2xs transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="size-4" />
          <span>Return to log in</span>
        </Link>
      </div>
    </div>
  )
}
