/**
 * Smart Protocol List Parser
 *
 * Intelligently parses protocol lists from PDFs by:
 * 1. Detecting if PDF is a list or individual protocol
 * 2. Using table extraction for tabular layouts
 * 3. Falling back to text parsing for non-tabular content
 * 4. Extracting complete protocol information
 */

import {
  extractTablesFromPDF,
  parseProtocolsFromTables,
  parseProtocolsFromText,
  mergeProtocols,
  ExtractedProtocol
} from './table-extractor'

export interface ParsedProtocol {
  code: string
  title: string
  dci?: string
  content: string
  additionalInfo?: string
  startPage?: number
  endPage?: number
  confidence: number
}

export interface ParserResult {
  protocols: ParsedProtocol[]
  method: 'table' | 'text' | 'hybrid'
  quality: number
  isProtocolList: boolean
}

/**
 * Parse protocols from a PDF file
 */
export async function parseProtocolList(
  pdfPath: string,
  rawText: string,
  pageCount: number,
  title: string
): Promise<ParserResult> {
  console.log(`   🔍 Analyzing PDF structure...`)

  // Determine if this is a protocol list
  const isProtocolList = detectProtocolList(title, pageCount, rawText)

  if (!isProtocolList) {
    console.log(`   ℹ️  PDF appears to be a single protocol, not a list`)
    return {
      protocols: [],
      method: 'text',
      quality: 0,
      isProtocolList: false
    }
  }

  console.log(`   📋 Detected protocol list - using advanced parsing...`)

  // Strategy 1: Try table extraction (best for tabular PDFs)
  let tableProtocols: ExtractedProtocol[] = []
  let tableExtractionSuccess = false

  try {
    console.log(`   🔬 Attempting table extraction...`)
    const tables = await extractTablesFromPDF(pdfPath)

    if (tables.length > 0) {
      console.log(`   ✓ Found ${tables.length} tables`)
      tableProtocols = parseProtocolsFromTables(tables)
      console.log(`   ✓ Extracted ${tableProtocols.length} protocols from tables`)
      tableExtractionSuccess = tableProtocols.length > 0
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (process.env.DEBUG) {
      console.warn(`   ⚠️  Table extraction failed: ${errorMsg}`)
    }
  }

  // Strategy 2: Text-based parsing (fallback)
  let textProtocols: ExtractedProtocol[] = []

  try {
    console.log(`   📝 Attempting text-based parsing...`)
    textProtocols = parseProtocolsFromText(rawText)
    console.log(`   ✓ Extracted ${textProtocols.length} protocols from text`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (process.env.DEBUG) {
      console.warn(`   ⚠️  Text parsing failed: ${errorMsg}`)
    }
  }

  // Merge results (table extraction takes precedence)
  const allProtocols = mergeProtocols([tableProtocols, textProtocols])

  if (allProtocols.length === 0) {
    console.log(`   ⚠️  No protocols found with either method`)
    return {
      protocols: [],
      method: 'text',
      quality: 0,
      isProtocolList: true
    }
  }

  // Convert to ParsedProtocol format
  const protocols: ParsedProtocol[] = allProtocols.map(p => ({
    code: p.code,
    title: p.title,
    dci: p.dci,
    content: buildProtocolContent(p),
    additionalInfo: p.additionalInfo,
    startPage: p.pageNumber || undefined,
    endPage: p.pageNumber || undefined,
    confidence: p.confidence
  }))

  // Calculate overall quality
  const avgConfidence = protocols.reduce((sum, p) => sum + p.confidence, 0) / protocols.length
  const quality = Math.round(avgConfidence)

  // Determine method used
  const method = tableExtractionSuccess && textProtocols.length === 0
    ? 'table'
    : !tableExtractionSuccess && textProtocols.length > 0
    ? 'text'
    : 'hybrid'

  console.log(`   ✅ Parsed ${protocols.length} protocols using ${method} method (quality: ${quality}%)`)

  return {
    protocols,
    method,
    quality,
    isProtocolList: true
  }
}

/**
 * Detect if PDF is a protocol list or individual protocol
 */
function detectProtocolList(title: string, pageCount: number, rawText: string): boolean {
  // Strategy 1: Check title for "list" keywords
  const listKeywords = ['lista', 'liste', 'protocoale terapeutice', 'catalog']
  const titleLower = title.toLowerCase()

  if (listKeywords.some(keyword => titleLower.includes(keyword))) {
    return true
  }

  // Strategy 2: Count unique protocol codes (flexible pattern for all code types)
  const protocolCodes = rawText.match(/\b[A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?\b/g) || []
  const uniqueCodes = new Set(protocolCodes)

  // If more than 5 unique protocol codes, likely a list
  if (uniqueCodes.size > 5) {
    return true
  }

  // Strategy 3: Check for tabular structure indicators
  const hasTableIndicators = detectTableStructure(rawText)
  if (hasTableIndicators && uniqueCodes.size > 2) {
    return true
  }

  // Strategy 4: Very long PDFs (>50 pages) with multiple codes are likely lists
  if (pageCount > 50 && uniqueCodes.size > 3) {
    return true
  }

  // Strategy 5: Check for "lista" in first few lines
  const firstLines = rawText.split('\n').slice(0, 20).join('\n').toLowerCase()
  if (firstLines.includes('lista') || firstLines.includes('protocoale')) {
    return true
  }

  return false
}

/**
 * Detect if text has table-like structure
 */
function detectTableStructure(text: string): boolean {
  const lines = text.split('\n')

  // Look for consistent patterns that indicate a table
  let tabularLines = 0
  let codePatternLines = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Check if line starts with a protocol code (flexible pattern for all types)
    if (/^[A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?\s/.test(trimmed)) {
      codePatternLines++
    }

    // Check for tab-separated or multi-column layout (multiple spaces)
    if (/\s{4,}/.test(trimmed)) {
      tabularLines++
    }
  }

  // If many lines follow code pattern, it's likely a table
  return codePatternLines > 10 || tabularLines > 20
}

/**
 * Build content string from extracted protocol
 * Just returns a placeholder - actual content is extracted by extractDetailedContent
 */
function buildProtocolContent(protocol: ExtractedProtocol): string {
  const parts: string[] = []

  parts.push(`Cod: ${protocol.code}`)
  parts.push(`Titlu: ${protocol.title}`)

  if (protocol.dci) {
    parts.push(`DCI: ${protocol.dci}`)
  }

  if (protocol.additionalInfo) {
    parts.push(`Informații adiționale: ${protocol.additionalInfo}`)
  }

  if (protocol.pageNumber) {
    parts.push(`Pagina: ${protocol.pageNumber}`)
  }

  return parts.join('\n')
}

/**
 * Extract detailed protocol content from full PDF text
 *
 * CNAS PDFs have two parts:
 * 1. Summary table with codes (beginning of PDF)
 * 2. Full protocol sections (later in PDF)
 *
 * This function finds the full protocol section for each code and extracts ALL content
 */
export function extractDetailedContent(
  protocols: ParsedProtocol[],
  fullText: string
): ParsedProtocol[] {
  const lines = fullText.split('\n')

  // Find all "Protocol terapeutic" sections with their codes
  const protocolSections: Array<{
    code: string
    startLine: number
    endLine: number
    content: string
  }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Look for protocol section headers like:
    // "Protocol terapeutic corespunzător poziţiei nr. 355 cod (J07BM03):"
    // or "Protocol terapeutic în ... cod (A123B)"
    const match = line.match(/Protocol\s+terapeutic.*?cod\s*\(([A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?)\)/i)

    if (match) {
      const code = match[1]
      const startLine = i

      // Find the end of this protocol section
      // It ends when we find the next "Protocol terapeutic" or reach a certain distance
      let endLine = lines.length

      for (let j = i + 1; j < lines.length; j++) {
        // Check if we've reached the next protocol section
        if (lines[j].trim().match(/Protocol\s+terapeutic.*?cod\s*\(/i)) {
          endLine = j - 1
          break
        }

        // Also check for page breaks or end markers
        if (lines[j].trim().match(/^-{3,}$/) ||
            lines[j].trim().match(/^={3,}$/) ||
            lines[j].trim().match(/^Sfârșit protocol/i)) {
          endLine = j
          break
        }
      }

      // If no explicit end found, use a reasonable window (e.g., next 500 lines)
      if (endLine === lines.length) {
        endLine = Math.min(i + 500, lines.length)
      }

      // Extract the full content
      const content = lines.slice(startLine, endLine).join('\n').trim()

      protocolSections.push({
        code,
        startLine,
        endLine,
        content
      })
    }
  }

  console.log(`   📝 Found ${protocolSections.length} full protocol sections in PDF`)

  // Match each protocol to its full section
  return protocols.map(protocol => {
    const section = protocolSections.find(s => s.code === protocol.code)

    if (section && section.content.length > 100) {
      // Found full protocol content - use it!
      console.log(`      ✓ Matched ${protocol.code} to full protocol (${section.content.length} chars)`)

      // IMPORTANT: Extract the actual DCI/title from the section header, not the table header fragment
      // Section content starts with: "Protocol terapeutic corespunzător poziţiei nr. XXX, cod (CODE): DCI"
      // Sometimes DCI is on the same line, sometimes on the next line
      const lines = section.content.split('\n')
      const firstLine = lines[0] || ''
      const secondLine = lines[1] || ''

      let extractedDci: string | undefined

      // Try to extract DCI from first line (format: "...cod (CODE): DCI SOMETHING")
      const sameLine = firstLine.match(/:\s*DCI[:\s]*(.+?)$/i)
      if (sameLine && sameLine[1].trim().length > 2) {
        extractedDci = sameLine[1].trim()
      }

      // If DCI not on first line or is just "DCI", try second line (DCI often appears alone on next line)
      if (!extractedDci || extractedDci.match(/^DCI\s*$/i)) {
        const secondLineTrimmed = secondLine.trim()
        // Check if second line is uppercase and looks like a DCI name
        if (secondLineTrimmed && secondLineTrimmed.length > 2 &&
            secondLineTrimmed.match(/^[A-Z][A-Z\s,]+$/)) {
          extractedDci = secondLineTrimmed
        }
      }

      // If still no DCI, try a broader search in first few lines
      if (!extractedDci) {
        const firstLines = lines.slice(0, 5).join('\n')
        const multiLineDciMatch = firstLines.match(/DCI[:\s]*\n?\s*([A-Z][A-Za-z\s,]+?)(?:\n|$)/i)
        extractedDci = multiLineDciMatch ? multiLineDciMatch[1].trim() : undefined
      }

      // Use the extracted DCI as the title if available and better than current title
      // Only replace title if current title looks corrupted
      let finalTitle = protocol.title
      let finalDci = protocol.dci

      if (extractedDci && extractedDci.length > 2) {
        // If current title is corrupted (contains "poziţiei", "corespunz", etc.), replace it with DCI
        if (protocol.title.match(/poziţiei|corespunz|ă tor pozi|Protocol terapeutic/i)) {
          finalTitle = extractedDci
          finalDci = extractedDci
        } else if (!protocol.dci && extractedDci) {
          // Otherwise just update DCI if it was missing
          finalDci = extractedDci
        }
      }

      return {
        ...protocol,
        title: finalTitle,
        dci: finalDci,
        content: section.content,
        startPage: protocol.startPage,
        endPage: protocol.endPage,
        confidence: Math.min(100, protocol.confidence + 20) // Boost confidence since we found full content
      }
    } else {
      // No full section found - try fallback: extract content between table entries
      const fallbackContent = extractFallbackContent(protocol.code, lines)

      if (fallbackContent && fallbackContent.length > protocol.content.length) {
        console.log(`      ⚠️  ${protocol.code}: Using fallback extraction (${fallbackContent.length} chars)`)
        return {
          ...protocol,
          content: fallbackContent,
          confidence: Math.max(40, protocol.confidence - 10) // Lower confidence for fallback
        }
      }

      console.log(`      ⚠️  ${protocol.code}: Only table data available (${protocol.content.length} chars)`)
      return protocol
    }
  })
}

/**
 * Fallback content extraction - tries to find content by protocol code references
 */
function extractFallbackContent(code: string, lines: string[]): string {
  const contentLines: string[] = []
  let foundCode = false
  let linesAfterCode = 0
  const MAX_LINES = 200

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Look for any reference to this code
    if (line.includes(code) && !foundCode) {
      foundCode = true
      contentLines.push(line)
      continue
    }

    if (foundCode) {
      linesAfterCode++

      // Stop if we hit another protocol code
      if (line.match(/\b[A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?\b/) && !line.includes(code)) {
        break
      }

      // Stop after MAX_LINES
      if (linesAfterCode > MAX_LINES) {
        break
      }

      contentLines.push(line)
    }
  }

  return contentLines.join('\n').trim()
}

/**
 * Validate and clean parsed protocols
 */
export function validateProtocols(protocols: ParsedProtocol[]): ParsedProtocol[] {
  return protocols.filter(protocol => {
    // Must have a valid code (flexible pattern for all code types)
    if (!protocol.code || !/^[A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?$/.test(protocol.code)) {
      return false
    }

    // Must have a title with at least some text
    if (!protocol.title || protocol.title.length < 3) {
      return false
    }

    // Title shouldn't be just the code repeated
    if (protocol.title === protocol.code) {
      return false
    }

    // Minimum confidence threshold (lowered from 30 to 25)
    if (protocol.confidence < 25) {
      return false
    }

    return true
  })
}

/**
 * Enhance protocols with additional metadata extraction
 */
export function enhanceProtocols(protocols: ParsedProtocol[]): ParsedProtocol[] {
  return protocols.map(protocol => {
    // Try to extract more detailed DCI if not already present
    if (!protocol.dci && protocol.content) {
      const dciMatch = protocol.content.match(/DCI[:\s]+([^,\n]+)/i)
      if (dciMatch) {
        protocol.dci = dciMatch[1].trim()
      }
    }

    // Clean up title
    protocol.title = protocol.title
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/^[\s\-–—:]+/, '') // Remove leading punctuation
      .replace(/[\s\-–—:]+$/, '') // Remove trailing punctuation
      .trim()

    return protocol
  })
}
