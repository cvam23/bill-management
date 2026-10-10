import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { fieldClass } from '../../styles/controls'

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string
  label: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { id, label, error, className = '', ...props },
  ref,
) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldClass} ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
})
