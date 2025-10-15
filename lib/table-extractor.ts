/**
 * Advanced Table Extraction for Protocol PDFs
 *
 * Extracts structured data from tabular PDFs using text positioning.
 * Handles multi-column layouts, detects table boundaries, and parses protocol entries.
 */

import { PDFExtract, PDFExtractPage, PDFExtractText } from 'pdf.js-extract'

export interface TableCell {
  text: string
  x: number
  y: number
  width: number
  height: number
  columnIndex: number
  rowIndex: number
}

export interface TableRow {
  rowIndex: number
  cells: TableCell[]
  y: number
  height: number
}

export interface Table {
  rows: TableRow[]
  columns: Column[]
  pageNumber: number
}

export interface Column {
  index: number
  x: number
  width: number
  alignment: 'left' | 'center' | 'right'
}

export interface ExtractedProtocol {
  code: string
  title: string
  dci?: string
  additionalInfo?: string
  pageNumber: number
  confidence: number // 0-100
}

/**
 * Extract tables from PDF using positioned text
 */
export async function extractTablesFromPDF(pdfPath: string): Promise<Table[]> {
  const pdfExtract = new PDFExtract()

  // Suppress PDF.js TrueType font warnings
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    const message = String(args[0])
    // Filter out TT (TrueType) undefined function warnings
    if (!message.includes('TT: undefined function')) {
      originalWarn(...args)
    }
  }

  try {
    const data = await pdfExtract.extract(pdfPath, {})

    const tables: Table[] = []

    for (const page of data.pages) {
      const pageTables = extractTablesFromPage(page)
      tables.push(...pageTables)
    }

    return tables
  } finally {
    // Restore original console.warn
    console.warn = originalWarn
  }
}

/**
 * Extract tables from a single page
 */
function extractTablesFromPage(page: PDFExtractPage): Table[] {
  if (!page.content || page.content.length === 0) {
    return []
  }

  // Filter out noise (very small text, page numbers, etc.)
  const textItems = page.content.filter(item => {
    return item.height > 5 && item.str.trim().length > 0
  })

  if (textItems.length === 0) {
    return []
  }

  // Detect columns by analyzing x-positions
  const columns = detectColumns(textItems)

  if (columns.length === 0) {
    return []
  }

  // Group text items into rows
  const rows = groupIntoRows(textItems, columns)

  // Detect table boundaries (continuous rows form a table)
  const tables = detectTableBoundaries(rows, columns, page.pageInfo.num)

  return tables
}

/**
 * Detect columns in the page by analyzing x-coordinate clusters
 */
function detectColumns(textItems: PDFExtractText[]): Column[] {
  // Collect all x-positions
  const xPositions = textItems.map(item => item.x)

  // Cluster x-positions to find column boundaries (increased tolerance)
  const clusters = clusterPositions(xPositions, 40) // 40px tolerance for same column (increased from 30)

  // Filter out very small clusters (likely noise)
  const significantClusters = clusters.filter(c => c.count >= 3)

  if (significantClusters.length === 0) {
    // If no significant clusters, create a single column
    return [{
      index: 0,
      x: Math.min(...xPositions),
      width: Math.max(...xPositions) - Math.min(...xPositions),
      alignment: 'left'
    }]
  }

  // Create columns from clusters
  const columns: Column[] = significantClusters.map((cluster, index) => {
    const xValues = textItems
      .filter(item => Math.abs(item.x - cluster.center) < 40)
      .map(item => item.x)

    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)

    return {
      index,
      x: minX,
      width: Math.max(maxX - minX, 50), // Ensure minimum column width
      alignment: 'left' // Can be improved by analyzing text alignment
    }
  })

  // Sort columns by x-position
  return columns.sort((a, b) => a.x - b.x)
}

/**
 * Cluster positions (x or y coordinates) into groups
 */
function clusterPositions(positions: number[], tolerance: number): Array<{ center: number, count: number }> {
  if (positions.length === 0) return []

  const sorted = [...positions].sort((a, b) => a - b)
  const clusters: Array<{ center: number, count: number }> = []

  let currentCluster = { sum: sorted[0], count: 1, values: [sorted[0]] }

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= tolerance) {
      // Add to current cluster
      currentCluster.sum += sorted[i]
      currentCluster.count++
      currentCluster.values.push(sorted[i])
    } else {
      // Start new cluster
      clusters.push({
        center: currentCluster.sum / currentCluster.count,
        count: currentCluster.count
      })
      currentCluster = { sum: sorted[i], count: 1, values: [sorted[i]] }
    }
  }

  // Add final cluster
  clusters.push({
    center: currentCluster.sum / currentCluster.count,
    count: currentCluster.count
  })

  // Filter out clusters with very few items (likely noise)
  return clusters.filter(c => c.count >= 2)
}

/**
 * Group text items into rows based on y-position
 */
function groupIntoRows(textItems: PDFExtractText[], columns: Column[]): TableRow[] {
  if (textItems.length === 0) {
    return []
  }

  // Sort by y-position
  const sorted = [...textItems].sort((a, b) => a.y - b.y)

  // Group into rows (items with similar y-coordinates)
  const rowGroups: PDFExtractText[][] = []
  let currentRow: PDFExtractText[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const yDiff = Math.abs(sorted[i].y - sorted[i - 1].y)

    if (yDiff <= 8) { // Same row (8px tolerance, increased from 5px)
      currentRow.push(sorted[i])
    } else {
      if (currentRow.length > 0) {
        rowGroups.push(currentRow)
      }
      currentRow = [sorted[i]]
    }
  }
  if (currentRow.length > 0) {
    rowGroups.push(currentRow)
  }

  // Convert row groups to TableRow objects
  const rows: TableRow[] = rowGroups.map((group, rowIndex) => {
    const y = Math.min(...group.map(item => item.y))
    const height = Math.max(...group.map(item => item.height))

    // Assign each text item to a column
    const cells: TableCell[] = []

    for (const column of columns) {
      // Find text items that belong to this column (more flexible matching)
      const columnItems = group.filter(item => {
        return item.x >= column.x - 30 && item.x <= column.x + column.width + 30
      })

      if (columnItems.length > 0) {
        // Merge text from this column, preserving spaces
        const text = columnItems
          .sort((a, b) => a.x - b.x)
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim()

        cells.push({
          text,
          x: column.x,
          y,
          width: column.width,
          height,
          columnIndex: column.index,
          rowIndex
        })
      } else {
        // Empty cell
        cells.push({
          text: '',
          x: column.x,
          y,
          width: column.width,
          height,
          columnIndex: column.index,
          rowIndex
        })
      }
    }

    return {
      rowIndex,
      cells,
      y,
      height
    }
  })

  return rows
}

/**
 * Detect table boundaries from rows
 */
function detectTableBoundaries(rows: TableRow[], columns: Column[], pageNumber: number): Table[] {
  if (rows.length === 0) {
    return []
  }

  // For now, treat the entire page as one table
  // Can be improved to detect multiple tables by looking for gaps in y-positions
  return [{
    rows,
    columns,
    pageNumber
  }]
}

/**
 * Parse protocols from extracted tables
 */
export function parseProtocolsFromTables(tables: Table[]): ExtractedProtocol[] {
  const protocols: ExtractedProtocol[] = []

  for (const table of tables) {
    for (const row of table.rows) {
      const protocol = parseProtocolRow(row, table.pageNumber)
      if (protocol) {
        protocols.push(protocol)
      }
    }
  }

  return protocols
}

/**
 * Parse a single row to extract protocol information
 */
function parseProtocolRow(row: TableRow, pageNumber: number): ExtractedProtocol | null {
  // Get all text from the row
  const rowText = row.cells.map(cell => cell.text).join(' ').trim()

  // Skip empty rows
  if (!rowText || rowText.length < 3) {
    return null
  }

  // Look for protocol code patterns:
  // - ATC codes: J07BM03 (Letter + digits + letters + digits)
  // - Simple codes: A001E, B002C (Letter + digits + letter)
  // - Complex codes: CI01I-HTP, L044L
  // More flexible regex to catch all variations
  const codeMatch = rowText.match(/\b([A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?)\b/)

  if (!codeMatch) {
    return null // Not a protocol row
  }

  const code = codeMatch[1]

  // Extract title - text after the code
  let title = rowText.replace(code, '').trim()

  // Remove common prefixes/suffixes
  title = title.replace(/^[\s\-–—:]+/, '').replace(/[\s\-–—:]+$/, '').trim()

  // If title is empty or too short, try using all cells
  if (!title || title.length < 3) {
    // Try to find title in other cells (exclude cells that are just codes)
    const nonCodeCells = row.cells.filter(cell =>
      cell.text && !cell.text.match(/^[A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?$/)
    )
    if (nonCodeCells.length > 0) {
      title = nonCodeCells.map(c => c.text).join(' ').trim()
    }
  }

  // Skip if still no valid title
  if (!title || title.length < 3) {
    return null
  }

  // Extract DCI (active substance) if present
  // Usually in parentheses or after "DCI:"
  const dciMatch = title.match(/\(([^)]+)\)|DCI[:\s]+([^,\n]+)/i)
  const dci = dciMatch ? (dciMatch[1] || dciMatch[2]).trim() : undefined

  // Remove DCI from title if extracted
  if (dci && title.includes(dci)) {
    title = title.replace(dci, '').replace(/[()]/g, '').trim()
  }

  // Calculate confidence based on:
  // 1. Valid code format
  // 2. Title length (not too short, not too long)
  // 3. Title contains letters (not just numbers/symbols)
  let confidence = 70 // Base confidence

  if (/^[A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?$/.test(code)) confidence += 10 // Valid code format
  if (title.length > 5 && title.length < 300) confidence += 10 // Reasonable length (more lenient)
  if (/[a-zA-ZăâîșțĂÂÎȘȚ]{3,}/.test(title)) confidence += 10 // Contains actual words (including Romanian chars)

  return {
    code,
    title,
    dci,
    additionalInfo: row.cells.length > 2 ? row.cells.slice(2).map(c => c.text).join(' ').trim() : undefined,
    pageNumber,
    confidence
  }
}

/**
 * Parse protocols from raw text (fallback method)
 */
export function parseProtocolsFromText(text: string): ExtractedProtocol[] {
  const protocols: ExtractedProtocol[] = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Look for protocol code at start of line (flexible pattern for all code types)
    const match = line.match(/^([A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?)\s+(.+)/)

    if (match) {
      const [, code, titlePart] = match

      // Collect title from this line and potentially next lines
      let title = titlePart.trim()

      // Check if title continues on next lines
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const nextLine = lines[j].trim()

        // If next line doesn't start with a protocol code and isn't empty, it might be continuation
        if (nextLine && !nextLine.match(/^[A-Z]{1,2}\d{2,4}[A-Z]{0,3}(?:\d{2})?(?:-[A-Z]+)?\s/)) {
          title += ' ' + nextLine
        } else {
          break
        }
      }

      // Skip if title is too short
      if (!title || title.length < 3) {
        continue
      }

      // Extract DCI if present
      const dciMatch = title.match(/\(([^)]+)\)|DCI[:\s]+([^,\n]+)/i)
      const dci = dciMatch ? (dciMatch[1] || dciMatch[2]).trim() : undefined

      // Clean up title
      if (dci) {
        title = title.replace(dci, '').replace(/[()]/g, '').trim()
      }

      protocols.push({
        code,
        title,
        dci,
        pageNumber: 0, // Unknown from raw text
        confidence: 60 // Lower confidence than table extraction
      })
    }
  }

  return protocols
}

/**
 * Merge and deduplicate protocols from multiple extraction methods
 */
export function mergeProtocols(protocolLists: ExtractedProtocol[][]): ExtractedProtocol[] {
  const protocolMap = new Map<string, ExtractedProtocol>()

  for (const list of protocolLists) {
    for (const protocol of list) {
      const existing = protocolMap.get(protocol.code)

      if (!existing || protocol.confidence > existing.confidence) {
        // Keep the higher confidence version
        protocolMap.set(protocol.code, protocol)
      }
    }
  }

  return Array.from(protocolMap.values()).sort((a, b) => a.code.localeCompare(b.code))
}
