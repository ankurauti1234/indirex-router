import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export default function Page() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[400px] bg-card text-card-foreground border border-border rounded-md shadow-lg p-8 sm:p-10 text-center transition-all">
        {/* Success Icon */}
        <div className="size-12 bg-chart-2/15 border border-chart-2/30 rounded-full flex items-center justify-center mx-auto mb-4 text-chart-2">
          <CheckCircle2 className="size-6 text-chart-2" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
          Thank you for signing up!
        </h1>

        <p className="text-xs text-muted-foreground leading-relaxed mb-6 font-normal">
          We&apos;ve sent a confirmation link to your email address. Please check your inbox and verify your email before signing in.
        </p>

        <Link
          href="/login"
          className="h-10 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded shadow-2xs transition-colors flex items-center justify-center gap-2"
        >
          <span>Go to log in</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
