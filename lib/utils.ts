import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date in Romanian locale
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * Format date in short format (e.g., "10 Ian 2025")
 */
export function formatDateShort(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ro-RO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Normalize Romanian text for search (handle diacritics)
 */
export function normalizeRomanianText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics for search
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!searchTerm) return text
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Extract section type from Romanian title
 */
export function getSectionType(title: string): string {
  const normalized = normalizeRomanianText(title)

  if (normalized.includes('indicati') || normalized.includes('indicație')) {
    return 'indicatie'
  }
  if (normalized.includes('criterii') && normalized.includes('includere')) {
    return 'criterii_includere'
  }
  if (normalized.includes('criterii') && normalized.includes('excludere')) {
    return 'criterii_excludere'
  }
  if (normalized.includes('tratament')) {
    return 'tratament'
  }
  if (normalized.includes('contraindicati')) {
    return 'contraindicatii'
  }
  if (normalized.includes('atentionari') || normalized.includes('precauti')) {
    return 'atentionari'
  }
  if (normalized.includes('monitorizare')) {
    return 'monitorizare'
  }
  if (normalized.includes('intrerupere')) {
    return 'criterii_intrerupere'
  }
  if (normalized.includes('prescriptor')) {
    return 'prescriptori'
  }

  return 'altele'
}

/**
 * Romanian specialty code to name mapping
 */
export const SPECIALTY_NAMES: Record<string, string> = {
  'oncologie': 'Oncologie',
  'reumatologie': 'Reumatologie',
  'cardiologie': 'Cardiologie',
  'neurologie': 'Neurologie',
  'endocrinologie': 'Endocrinologie',
  'pneumologie': 'Pneumologie',
  'gastroenterologie': 'Gastroenterologie',
  'hematologie': 'Hematologie',
  'nefrologie': 'Nefrologie',
  'psihiatrie': 'Psihiatrie',
  'dermatologie': 'Dermatologie',
  'oftalmologie': 'Oftalmologie',
  'ORL': 'Oto-Rino-Laringologie',
  'ortopedie': 'Ortopedie',
  'altele': 'Alte Specialități',
}

/**
 * Get readable specialty name
 */
export function getSpecialtyName(code: string): string {
  const normalized = normalizeRomanianText(code)
  return SPECIALTY_NAMES[normalized] || code
}

/**
 * Romanian months for date parsing
 */
export const ROMANIAN_MONTHS: Record<string, number> = {
  'ianuarie': 0,
  'februarie': 1,
  'martie': 2,
  'aprilie': 3,
  'mai': 4,
  'iunie': 5,
  'iulie': 6,
  'august': 7,
  'septembrie': 8,
  'octombrie': 9,
  'noiembrie': 10,
  'decembrie': 11,
}
