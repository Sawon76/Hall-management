export default function LoadingSpinner({ variant = 'inline', label = 'Loading...' }) {
  const wrapperClass =
    variant === 'full-page'
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm'
      : 'flex items-center justify-center p-8'

  return (
    <div className={wrapperClass} role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
    </div>
  )
}