import * as React from 'react'
import { cn } from '@/lib/utils'
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea ref={ref} rows={3} className={cn('block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500', error && 'border-red-500', className)} {...props} />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'