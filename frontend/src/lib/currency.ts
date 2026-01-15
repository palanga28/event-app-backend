// Configuration des devises supportées
export type Currency = 'CDF' | 'USD'

export const CURRENCIES: Record<Currency, { symbol: string; name: string; locale: string }> = {
  CDF: { symbol: 'FC', name: 'Franc Congolais', locale: 'fr-CD' },
  USD: { symbol: '$', name: 'Dollar US', locale: 'en-US' },
}

// Devise par défaut de l'application
export const DEFAULT_CURRENCY: Currency = 'CDF'

/**
 * Formate un montant avec la devise
 * @param amount - Montant à formater
 * @param currency - Devise (CDF ou USD)
 * @param showSymbol - Afficher le symbole (défaut: true)
 * @returns Montant formaté (ex: "25 000 FC" ou "$25.00")
 */
export function formatPrice(amount: number | string, currency: Currency = DEFAULT_CURRENCY, showSymbol = true): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) return '0'
  
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.CDF
  
  if (currency === 'USD') {
    const formatted = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return showSymbol ? `$${formatted}` : formatted
  }
  
  // CDF - pas de décimales, séparateur d'espace
  const formatted = Math.round(numAmount).toLocaleString('fr-FR')
  return showSymbol ? `${formatted} FC` : formatted
}

/**
 * Formate un montant avec le code devise complet
 * @param amount - Montant à formater
 * @param currency - Devise (CDF ou USD)
 * @returns Montant formaté avec code (ex: "25 000 CDF" ou "25.00 USD")
 */
export function formatPriceWithCode(amount: number | string, currency: Currency = DEFAULT_CURRENCY): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) return `0 ${currency}`
  
  if (currency === 'USD') {
    return `${numAmount.toFixed(2)} USD`
  }
  
  return `${Math.round(numAmount).toLocaleString('fr-FR')} CDF`
}
