import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ className, variant = 'default', size = 'md', loading, disabled, children, ...props }: ButtonProps) {
  const variants = {
    default: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    outline: 'border border-green-600 text-green-600 hover:bg-green-50',
    ghost: 'text-green-600 hover:bg-green-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' }
  return (
    <button
      className={cn('rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center', variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
          loading ? 'opacity-100' : 'hidden'
        )}
        aria-hidden="true"
      />
      {children}
    </button>
  )
}