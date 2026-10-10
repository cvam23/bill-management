import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

const variants = {
  primary: 'bg-teal-800 text-white hover:bg-teal-900 border border-teal-800',
  secondary: 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300',
  danger: 'bg-red-700 text-white hover:bg-red-800 border border-red-700',
}

export function Button({
  type = 'button',
  variant = 'secondary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
