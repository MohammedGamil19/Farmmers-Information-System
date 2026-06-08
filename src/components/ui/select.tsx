import * as React from 'react'
import { cn } from '@/lib/utils'
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, options, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select ref={ref} className={cn('block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white', error && 'border-red-500', className)} {...props}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
))
Select.displayName = 'Select'