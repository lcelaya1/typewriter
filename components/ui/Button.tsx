'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none',
          size === 'sm' && 'text-xs px-2.5 py-1.5 gap-1.5',
          size === 'md' && 'text-sm px-3 py-2 gap-2',
          variant === 'primary' && 'bg-[#111111] text-white hover:bg-[#333333]',
          variant === 'secondary' && 'bg-white text-[#111111] border border-[#E5E5E5] hover:bg-[#F5F5F5]',
          variant === 'ghost' && 'bg-transparent text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#111111]',
          variant === 'danger' && 'bg-white text-[#EF4444] border border-[#E5E5E5] hover:bg-red-50',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
