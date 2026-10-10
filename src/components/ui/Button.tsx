import type { ButtonHTMLAttributes } from 'react'
import { focusRing, iconButtonClass } from '../../styles/controls'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'reset'
  icon?: boolean
}

const variants = {
  primary: 'bg-thread-ink text-white hover:bg-thread border border-thread-ink hover:border-thread',
  secondary: 'bg-white text-ink hover:bg-bench border border-line',
  danger: 'bg-danger text-white hover:bg-red-950 border border-danger',
  reset: 'border border-edit bg-edit text-white motion-safe:transition-colors hover:border-edit-ink hover:bg-edit-ink',
}

export function Button({
  type = 'button',
  variant = 'secondary',
  icon = false,
  className = '',
  ...props
}: ButtonProps) {
  const shape = icon
    ? iconButtonClass
    : `inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${focusRing} ${variants[variant]}`

  return (
    <button
      type={type}
      className={`${shape} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
