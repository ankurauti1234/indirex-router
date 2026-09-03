import * as React from "react"

interface PageContainerProps {
  title: string
  description: React.ReactNode
  placeholderText?: string
  children?: React.ReactNode
}

export function PageContainer({
  title,
  description,
  placeholderText,
  children,
}: PageContainerProps) {
  return (
    <div className="flex flex-1 flex-col gap-5 p-6 font-sans min-w-0 max-w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
          {title}
        </h1>
        <p className="text-xs text-muted-foreground font-sans leading-relaxed">
          {description}
        </p>
      </div>
      {children ? (
        children
      ) : (
        <div className="border border-dashed border-border rounded h-96 flex items-center justify-center text-muted-foreground text-xs font-mono p-4 text-center bg-card">
          {placeholderText}
        </div>
      )}
    </div>
  )
}
