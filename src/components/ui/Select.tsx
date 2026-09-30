import React, { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  compact?: boolean;
  placeholder?: string;
};

export default function Select({
  label,
  error,
  compact = false,
  placeholder,
  className,
  children,
  id,
  ...props
}: SelectProps) {
  const inputId = id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold uppercase tracking-widest text-gray-500"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={inputId}
          className={[
            'w-full appearance-none rounded-input border-[1.5px] bg-white px-3.5 pr-9 text-sm text-gray-900 outline-none transition-all',
            compact ? 'py-2' : 'py-2.5',
            error
              ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.15)]'
              : 'border-gray-200 focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(220,38,38,.15)]',
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {/* Chevron icon */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
