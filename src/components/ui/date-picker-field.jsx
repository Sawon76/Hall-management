import { format, isAfter, isBefore, startOfDay } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '../../lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'

export default function DatePickerField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  isDateDisabled,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  const disabledMatcher = (date) => {
    const targetDate = startOfDay(date)

    if (minDate && isBefore(targetDate, startOfDay(minDate))) {
      return true
    }

    if (maxDate && isAfter(targetDate, startOfDay(maxDate))) {
      return true
    }

    return Boolean(isDateDisabled?.(targetDate))
  }

  return (
    <div ref={containerRef} className="relative flex-1 space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        className={cn(
          'w-full justify-between rounded-xl border-slate-300 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50',
          !value && 'text-slate-400',
        )}
      >
        <span>{value ? format(new Date(value), 'dd MMM yyyy') : 'Select date'}</span>
        <CalendarDays className="h-4 w-4" />
      </Button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            defaultMonth={value ? new Date(value) : minDate || new Date()}
            onSelect={(date) => {
              if (!date || disabledMatcher(date)) {
                return
              }

              onChange?.(format(date, 'yyyy-MM-dd'))
              setOpen(false)
            }}
            disabled={disabledMatcher}
            className="rounded-lg border border-border p-2"
          />
        </div>
      )}
    </div>
  )
}