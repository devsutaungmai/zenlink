// Currency symbols mapping for common international currencies
export const CURRENCY_SYMBOLS: { [key: string]: string } = {
  'USD': '$',      // US Dollar
  'EUR': '€',      // Euro
  'GBP': '£',      // British Pound
  'CAD': 'C$',     // Canadian Dollar
  'AUD': 'A$',     // Australian Dollar
  'JPY': '¥',      // Japanese Yen
  'CHF': 'CHF',    // Swiss Franc
  'CNY': '¥',      // Chinese Yuan
  'INR': '₹',      // Indian Rupee
  'SGD': 'S$',     // Singapore Dollar
  'HKD': 'HK$',    // Hong Kong Dollar
  'NZD': 'NZ$',    // New Zealand Dollar
  'SEK': 'kr',     // Swedish Krona
  'NOK': 'kr',     // Norwegian Krone
  'DKK': 'kr',     // Danish Krone
  'PLN': 'zł',     // Polish Zloty
  'CZK': 'Kč',     // Czech Koruna
  'HUF': 'Ft',     // Hungarian Forint
  'RON': 'lei',    // Romanian Leu
  'BGN': 'лв',     // Bulgarian Lev
  'BRL': 'R$',     // Brazilian Real
  'MXN': '$',      // Mexican Peso
  'KRW': '₩',      // South Korean Won
  'THB': '฿',      // Thai Baht
  'MYR': 'RM',     // Malaysian Ringgit
  'PHP': '₱',      // Philippine Peso
  'IDR': 'Rp',     // Indonesian Rupiah
  'VND': '₫',      // Vietnamese Dong
  'TRY': '₺',      // Turkish Lira
  'RUB': '₽',      // Russian Ruble
  'ZAR': 'R',      // South African Rand
  'EGP': '£',      // Egyptian Pound
  'SAR': '﷼',      // Saudi Riyal
  'AED': 'د.إ',     // UAE Dirham
  'QAR': '﷼',      // Qatari Riyal
  'KWD': 'د.ك',     // Kuwaiti Dinar
  'BHD': '.د.ب',    // Bahraini Dinar
  'OMR': '﷼',      // Omani Rial
  'JOD': 'د.ا',     // Jordanian Dinar
  'LBP': '£',      // Lebanese Pound
  'ILS': '₪',      // Israeli Shekel
}

// Extended currency information with names
export const CURRENCY_INFO = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: '£' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
]

/**
 * Get currency symbol for a given currency code
 * @param currencyCode - ISO currency code (e.g., 'USD', 'EUR')
 * @param fallback - Fallback symbol if currency not found (default: '$')
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode?: string, fallback: string = '$'): string {
  if (!currencyCode) return fallback
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode
}

/**
 * Format amount with currency symbol
 * @param amount - Numeric amount
 * @param currencyCode - ISO currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number, 
  currencyCode?: string, 
  options: {
    showDecimals?: boolean
    position?: 'before' | 'after'
    fallback?: string
  } = {}
): string {
  const { 
    showDecimals = true, 
    position = 'before', 
    fallback = '$' 
  } = options
  
  const symbol = getCurrencySymbol(currencyCode, fallback)
  const formattedAmount = showDecimals 
    ? amount.toFixed(2) 
    : Math.round(amount).toString()
  
  return position === 'before' 
    ? `${symbol}${formattedAmount}`
    : `${formattedAmount}${symbol}`
}

/**
 * Get currency information by code
 * @param currencyCode - ISO currency code
 * @returns Currency information object or null if not found
 */
export function getCurrencyInfo(currencyCode?: string) {
  if (!currencyCode) return null
  return CURRENCY_INFO.find(info => info.code === currencyCode.toUpperCase()) || null
}

/**
 * Check if currency code is valid
 * @param currencyCode - ISO currency code to validate
 * @returns Boolean indicating if currency is supported
 */
export function isValidCurrency(currencyCode?: string): boolean {
  if (!currencyCode) return false
  return currencyCode.toUpperCase() in CURRENCY_SYMBOLS
}

/**
 * Get list of supported currency codes
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_SYMBOLS)
}
