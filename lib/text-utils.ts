/**
 * Text processing utilities for protocol content
 */

import { validateAndCorrectTitle, extractTitleFromRawText, isTitleCorrupted } from './title-validator'

/**
 * Extract clean title from verbose protocol header
 *
 * Converts:
 *   "Protocol terapeutic corespunzător poziţiei nr. 13, cod (A001E): DCI"
 * To:
 *   "DCI"
 *
 * Uses enhanced validation to detect and correct corrupted titles.
 *
 * @param rawTitle - Raw title extracted from PDF
 * @param content - Optional protocol content to extract title from if rawTitle is generic
 * @param code - Optional protocol code for validation
 * @returns Clean, concise protocol title
 */
export function extractCleanTitle(rawTitle: string, content?: string, code?: string): string {
  if (!rawTitle) return rawTitle

  // Remove quotes
  let cleaned = rawTitle.replace(/^[""\s]+|[""\s]+$/g, '')

  // Pattern 1: "Protocol terapeutic ... cod (): TITLE"
  // Extract everything after the last colon
  if (cleaned.toLowerCase().includes('protocol') && cleaned.toLowerCase().includes('terapeutic')) {
    const lastColonIndex = cleaned.lastIndexOf(':')
    if (lastColonIndex !== -1) {
      cleaned = cleaned.substring(lastColonIndex + 1).trim()
    }
  }

  // Remove common artifacts
  cleaned = cleaned
    .replace(/^DCI[:\s]+/i, '') // Remove standalone "DCI:" prefix
    .replace(/\s+NU\s*$/i, '') // Remove trailing "NU"
    .replace(/\s+C\d+-[A-Z]\d+(\.\d+)?\s*$/i, '') // Remove trailing codes like "C2-P6.3"
    .replace(/^Pagina:\s*\d+\s*/i, '') // Remove "Pagina: 171"
    .trim()

  // NEW: Use advanced validation if we have code and content
  if (code && content) {
    // Check if extracted title is corrupted
    if (isTitleCorrupted(cleaned) || cleaned.length < 5) {
      const corrected = validateAndCorrectTitle(code, cleaned, content)
      if (corrected) {
        return corrected
      }
    }
  }

  // If title is empty, too generic, or just "DCI", try to extract from content
  if ((!cleaned || cleaned.toUpperCase() === 'DCI' || cleaned.length < 3) && content) {
    const titleFromContent = extractTitleFromContent(content, code)
    if (titleFromContent && titleFromContent.length > 3) {
      return titleFromContent
    }
  }

  // If still empty or too short, return original
  if (!cleaned || cleaned.length < 2) {
    return rawTitle.trim()
  }

  return cleaned
}

/**
 * Extract title from protocol content
 * Looks for the first meaningful line (drug name, condition, etc.)
 *
 * @param content - Protocol content
 * @param code - Optional protocol code for enhanced extraction
 * @returns Extracted title or empty string
 */
function extractTitleFromContent(content: string, code?: string): string {
  if (!content) return ''

  // NEW: Use enhanced extraction if code is provided
  if (code) {
    const extracted = extractTitleFromRawText(code, content)
    if (extracted) return extracted
  }

  // Get first few lines
  const lines = content.split('\n').slice(0, 10)

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines, section headers, and protocol headers
    if (!trimmed || trimmed.length < 3) continue
    if (trimmed.toLowerCase().includes('protocol terapeutic')) continue
    if (trimmed.toLowerCase().includes('criterii')) continue
    if (trimmed.toLowerCase().includes('introducere')) continue
    if (/^[IVX]+\./.test(trimmed)) continue // Skip roman numeral sections
    if (/^\d+\./.test(trimmed)) continue // Skip numbered sections

    // Found a meaningful line - this is likely the drug/condition name
    // Clean it up
    return trimmed
      .replace(/^[""\s]+|[""\s]+$/g, '')
      .replace(/\s+NU\s*$/i, '')
      .substring(0, 200) // Limit length
      .trim()
  }

  return ''
}

/**
 * Remove redundant protocol header from text content
 *
 * Removes the common pattern: "Protocol terapeutic corespunzător poziției nr. X cod (CODE): TITLE"
 * This header is redundant as the title and code are stored separately in the database.
 *
 * @param text - Raw text content from protocol PDF
 * @returns Cleaned text without the redundant header
 */
export function removeRedundantHeader(text: string): string {
  if (!text) return text

  // Remove leading quotes that might wrap the entire content
  let cleaned = text.replace(/^[""\s]+/, '')

  // Pattern 1: Standard protocol header (case-insensitive, flexible spacing)
  // Matches: "Protocol terapeutic corespunzător poziției nr. X cod (CODE): TITLE"
  const protocolHeaderPattern = /^["\s]*protocol\s+terapeutic\s+corespunz[ăa]tor\s+pozi[țt]iei\s+nr\.\s*\d+[^:]*:\s*[^\n]+/i

  // Try to remove the header
  cleaned = cleaned.replace(protocolHeaderPattern, '')

  // Pattern 2: Alternative format with DCI
  // Matches: "Protocol terapeutic corespunzător poziţiei nr. 366 cod (J05AX28): DCI BULEVIRTIDUM"
  const dciPattern = /^["\s]*protocol\s+terapeutic[^:]+:\s*DCI\s+[^\n]+/i
  cleaned = cleaned.replace(dciPattern, '')

  // Clean up remaining artifacts
  cleaned = cleaned
    .replace(/^["\s]+/, '') // Remove leading quotes/whitespace
    .replace(/^\n+/, '') // Remove leading newlines
    .trim()

  return cleaned
}

/**
 * Remove redundant headers from HTML content
 *
 * @param html - HTML content
 * @returns Cleaned HTML without redundant headers
 */
export function removeRedundantHeaderFromHTML(html: string): string {
  if (!html) return html

  let cleaned = html

  // Pattern for HTML-wrapped headers (e.g., <p>Protocol terapeutic...</p>)
  const htmlHeaderPattern = /<[^>]*>\s*protocol\s+terapeutic\s+corespunz[ăa]tor[^<]*<\/[^>]*>/i
  cleaned = cleaned.replace(htmlHeaderPattern, '')

  // Remove leading empty tags
  cleaned = cleaned.replace(/^(\s|<br\s*\/?>|<p>\s*<\/p>)+/i, '')

  return cleaned.trim()
}

/**
 * Check if text has a redundant protocol header
 *
 * @param text - Text to check
 * @returns True if text starts with redundant header
 */
export function hasRedundantHeader(text: string): boolean {
  if (!text) return false

  const firstLine = text.split('\n')[0].toLowerCase().trim()
  return (
    firstLine.includes('protocol') &&
    firstLine.includes('terapeutic') &&
    firstLine.includes('cod')
  )
}
