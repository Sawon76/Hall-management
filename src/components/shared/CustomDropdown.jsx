import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = true,
  disabled = false,
}) {
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) {
      return options
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()
    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
  }, [options, searchable, searchTerm])

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchable) {
      searchInputRef.current?.focus()
    }
  }, [isOpen, searchable])

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  const handleKeyDown = (event) => {
    if (disabled) {
      return
    }

    if (!isOpen && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault()
      setIsOpen(true)
      return
    }

    if (!isOpen) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) =>
        current < filteredOptions.length - 1 ? current + 1 : filteredOptions.length - 1,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => (current > 0 ? current - 1 : 0))
      return
    }

    if (event.key === 'Enter' && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
      event.preventDefault()
      onChange?.(filteredOptions[highlightedIndex].value)
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm outline-none ring-primary transition focus:border-primary focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <span className={selectedOption ? 'text-slate-800' : 'text-slate-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {searchable && (
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setHighlightedIndex(0)
              }}
              placeholder="Search..."
              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          )}

          <ul className="max-h-52 overflow-y-auto" role="listbox">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No options found</li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value
                const isHighlighted = highlightedIndex === index

                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => {
                        onChange?.(option.value)
                        setIsOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                        isHighlighted ? 'bg-slate-100' : ''
                      } ${isSelected ? 'font-medium text-primary' : 'text-slate-700'}`}
                    >
                      {option.label}
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}