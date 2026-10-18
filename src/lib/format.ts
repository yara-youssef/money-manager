const make = (currency: string) => ({
  full: new Intl.NumberFormat(undefined, { style: 'currency', currency }),
  whole: new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }),
  compact: new Intl.NumberFormat(undefined, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }),
})

let fmt = make('EUR')

export function setCurrency(code: string) {
  try {
    fmt = make(code)
  } catch {
    // Unknown currency code: keep the previous formatter.
  }
}

export const money = (n: number) => fmt.full.format(n)
export const moneyShort = (n: number) => (Math.abs(n) >= 10000 ? fmt.compact.format(n) : fmt.whole.format(n))
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`
