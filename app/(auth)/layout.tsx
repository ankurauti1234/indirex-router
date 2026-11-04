import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between items-center px-4 py-8 select-none">
      {/* Clean Header */}
      <header className="w-full max-w-sm flex items-center justify-center pt-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm shadow-xs">
            <Zap className="size-4.5 fill-current" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight">Indirex</span>
        </Link>
      </header>

      {/* Main Center Form */}
      <main className="w-full flex items-center justify-center my-auto py-6">
        {children}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full max-w-sm text-center text-xs text-muted-foreground pb-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-center gap-3">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Systems operational</span>
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70">
          © {new Date().getFullYear()} Indirex Telemetry Platform
        </p>
      </footer>
    </div>
  )
}
