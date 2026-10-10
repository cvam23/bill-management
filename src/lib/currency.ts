export function parseRupeesToPaise(value: string): number | null {
  const trimmedValue = value.trim()

  if (!/^\d+(\.\d{1,2})?$/.test(trimmedValue)) {
    return null
  }

  const [rupees, fraction = ''] = trimmedValue.split('.')
  const paise = fraction.length === 1 ? Number(fraction) * 10 : Number(fraction || 0)

  return Number(rupees) * 100 + paise
}

export function paiseToRupeeString(paise: number): string {
  return `${Math.trunc(paise / 100)}.${String(Math.abs(paise % 100)).padStart(2, '0')}`
}

export function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paise / 100)
}

export function lineAmountPaise(quantity: number, unitPricePaise: number): number {
  return quantity * unitPricePaise
}

export function sumPaise(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0)
}
