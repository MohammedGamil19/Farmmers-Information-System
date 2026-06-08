import * as React from 'react'
import { cn } from '@/lib/utils'
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input ref={ref} className={cn('block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50', error && 'border-red-500', className)} {...props} />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
))
Input.displayName = 'Input'