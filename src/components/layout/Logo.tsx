type LogoProps = {
  className?: string
  tone?: 'plate' | 'ink'
}

export function Logo({ className = 'h-10 w-10', tone = 'plate' }: LogoProps) {
  const plate = tone === 'ink' ? 'currentColor' : '#C2412D'

  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={`shrink-0 ${className}`}>
      <title>Sewing machine mark</title>
      <rect width="40" height="40" rx="5" fill={plate} />
      <path fill="#fff" d="M5.5 30.2h29v3c0 .5-.4.9-.9.9H6.4c-.5 0-.9-.4-.9-.9v-3z" />
      <path fill="#fff" d="M7.5 26.2V11.2H33.2v9.4h-5.4V15.6H13V26.2H7.5z" />
      <circle cx="11" cy="13.4" r="3.5" fill={plate} />
      <circle cx="11" cy="13.4" r="3.5" fill="none" stroke="#fff" strokeWidth="1.45" />
      <circle cx="11" cy="13.4" r="1.05" fill="#fff" />
      <rect x="26.55" y="20.6" width="2.15" height="9" rx="0.3" fill="#fff" />
    </svg>
  )
}
