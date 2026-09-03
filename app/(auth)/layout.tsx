import Link from 'next/link'
import { Zap, ShieldCheck } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col justify-between items-center overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Atlassian Signature Decorative SVG Background Graphics (Left & Right) using globals.css CSS Variables */}
      <div
        className="pointer-events-none absolute left-0 bottom-0 z-0 hidden lg:block w-[380px] h-[520px] opacity-90 transition-opacity"
        aria-hidden="true"
      >
        <svg
          width="380"
          height="520"
          viewBox="0 0 380 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50 480C40 450 120 490 200 420C280 350 260 250 340 180C400 130 450 140 480 100"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeDasharray="6 6"
            strokeOpacity="0.25"
          />
          <path
            d="M-80 540C20 510 100 550 180 470C260 390 230 310 320 230"
            stroke="var(--chart-2)"
            strokeWidth="2"
            strokeOpacity="0.2"
          />
          {/* Floating UI Nodes */}
          <rect
            x="40"
            y="320"
            width="120"
            height="70"
            rx="8"
            fill="var(--card)"
            fillOpacity="0.95"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />
          <circle cx="65" cy="345" r="10" fill="var(--primary)" fillOpacity="0.2" />
          <path d="M61 345L64 348L70 342" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
          <rect x="85" y="340" width="55" height="6" rx="3" fill="var(--primary)" fillOpacity="0.4" />
          <rect x="85" y="352" width="35" height="6" rx="3" fill="var(--muted-foreground)" fillOpacity="0.3" />

          <rect
            x="180"
            y="210"
            width="140"
            height="80"
            rx="8"
            fill="var(--card)"
            fillOpacity="0.95"
            stroke="var(--chart-2)"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <circle cx="210" cy="240" r="12" fill="var(--chart-2)" fillOpacity="0.2" />
          <path d="M206 240H214M210 236V244" stroke="var(--chart-2)" strokeWidth="2" strokeLinecap="round" />
          <rect x="230" y="234" width="70" height="7" rx="3.5" fill="var(--primary)" fillOpacity="0.7" />
          <rect x="230" y="248" width="45" height="6" rx="3" fill="var(--muted-foreground)" fillOpacity="0.3" />
        </svg>
      </div>

      <div
        className="pointer-events-none absolute right-0 top-0 z-0 hidden lg:block w-[380px] h-[520px] opacity-90 transition-opacity"
        aria-hidden="true"
      >
        <svg
          width="380"
          height="520"
          viewBox="0 0 380 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M450 40C360 80 300 20 200 110C100 200 130 300 40 380"
            stroke="var(--chart-4)"
            strokeWidth="3"
            strokeDasharray="6 6"
            strokeOpacity="0.25"
          />
          <path
            d="M480 -20C380 30 320 -20 220 80C120 180 140 270 60 340"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeOpacity="0.2"
          />
          {/* Floating UI Nodes */}
          <rect
            x="200"
            y="120"
            width="130"
            height="75"
            rx="8"
            fill="var(--card)"
            fillOpacity="0.95"
            stroke="var(--chart-4)"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <circle cx="230" cy="150" r="10" fill="var(--chart-4)" fillOpacity="0.2" />
          <rect x="250" y="144" width="60" height="6" rx="3" fill="var(--chart-4)" fillOpacity="0.6" />
          <rect x="250" y="156" width="40" height="6" rx="3" fill="var(--muted-foreground)" fillOpacity="0.3" />

          <rect
            x="60"
            y="260"
            width="125"
            height="70"
            rx="8"
            fill="var(--card)"
            fillOpacity="0.95"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />
          <circle cx="85" cy="288" r="9" fill="var(--primary)" fillOpacity="0.2" />
          <rect x="102" y="283" width="65" height="6" rx="3" fill="var(--primary)" fillOpacity="0.6" />
          <rect x="102" y="294" width="45" height="6" rx="3" fill="var(--muted-foreground)" fillOpacity="0.3" />
        </svg>
      </div>

      {/* Main Centered Content Container */}
      <main className="relative z-10 w-full max-w-[440px] px-4 py-8 sm:py-12 my-auto flex flex-col items-center">
        {children}
      </main>

      {/* Atlassian Signature Footer */}
      <footer className="relative z-10 w-full py-6 px-4 flex flex-col items-center gap-3 text-center border-t border-border bg-card/60 backdrop-blur-xs">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="flex size-4 items-center justify-center rounded bg-primary text-primary-foreground">
              <Zap className="size-2.5 fill-primary-foreground text-primary-foreground" />
            </span>
            <span>Indirex Router</span>
          </div>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-chart-2 animate-pulse" />
            <span>All systems operational</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link
            href="/privacy"
            className="hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <span>•</span>
          <Link
            href="/terms"
            className="hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
          <span>•</span>
          <Link
            href="/help"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <ShieldCheck className="size-3 text-primary" />
            Security & Trust
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground/80 tracking-tight">
          Powered by Atlassian Design System • One account for Indirex Apps & Services
        </p>
      </footer>
    </div>
  )
}
