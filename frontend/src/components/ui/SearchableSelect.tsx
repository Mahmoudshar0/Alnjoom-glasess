import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function SearchableSelect({
  label,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  }, []);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm text-left
          transition-colors bg-white
          ${open ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200 hover:border-slate-300'}
          ${error ? 'border-red-300 ring-2 ring-red-500/10' : ''}
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`truncate flex-1 ${!selected ? 'text-slate-400' : 'text-slate-900'}`}>
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selected.label}</span>
              {selected.sublabel && (
                <span className="text-slate-400 text-xs">{selected.sublabel}</span>
              )}
            </span>
          ) : placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              onClick={clear}
              className="p-0.5 rounded text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => select(opt.value)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 text-sm text-left
                    hover:bg-sky-50 transition-colors cursor-pointer
                    ${opt.value === value ? 'bg-sky-50 text-sky-700' : 'text-slate-800'}
                  `}
                >
                  <span className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-xs text-slate-400 truncate">{opt.sublabel}</span>
                    )}
                  </span>
                  {opt.value === value && (
                    <Check size={14} className="text-sky-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
