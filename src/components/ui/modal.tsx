'use client'
import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}