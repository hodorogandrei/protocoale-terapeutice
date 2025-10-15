import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface TitleIssue {
  code: string
  title: string
  issueType: string[]
  contentLength: number
  rawTextPreview: string
  statusInfo: {
    status: string
    statusReason: string | null
  }
}

function analyzeTitleIssues(protocol: any): string[] {
  const issues: string[] = []
  const title = protocol.title || ''

  // Issue 1: Very short titles (< 25 chars)
  if (title.length < 25) {
    issues.push('VERY_SHORT')
  }

  // Issue 2: Starts with lowercase or punctuation
  if (/^[a-z\(\),\.\-\d]/.test(title)) {
    issues.push('BAD_START')
  }

  // Issue 3: Contains multiple protocol codes (table row artifact)
  const codePattern = /[A-Z]\d+[A-Z]+/g
  const codes = title.match(codePattern) || []
  if (codes.length > 2) {
    issues.push('MULTI_CODE')
  }

  // Issue 4: Looks like a table header or section
  const headerPatterns = [
    /^COD\s+PROTOCOL/i,
    /^PROTOCOL/i,
    /^DCI/i,
    /^CAPITOLUL/i,
    /^SECȚIUNEA/i,
    /^ANEXA/i,
    /^INDICAȚII/i,
    /^CRITERII/i,
    /^LISTA/i
  ]
  if (headerPatterns.some(pattern => pattern.test(title))) {
    issues.push('HEADER_LIKE')
  }

  // Issue 5: Contains ").*DCI" pattern (DCI fragment)
  if (/\).*DCI/i.test(title)) {
    issues.push('DCI_FRAGMENT')
  }

  // Issue 6: All uppercase and very short (likely acronym or code)
  if (title === title.toUpperCase() && title.length < 15) {
    issues.push('ACRONYM_LIKE')
  }

  // Issue 7: Contains excessive whitespace or special chars
  if (/\s{3,}/.test(title) || /[^\w\s\(\),\.\-\/\:]/g.test(title.replace(/[ăâîșțĂÂÎȘȚ]/g, ''))) {
    issues.push('FORMATTING')
  }

  // Issue 8: Numeric prefix that's not a section number
  if (/^\d+[^\d]/.test(title) && !/^\d+\.\s/.test(title)) {
    issues.push('NUMERIC_PREFIX')
  }

  // Issue 9: Ends abruptly (possible truncation)
  if (title.length > 20 && /[a-z]$/.test(title) && !title.endsWith('.')) {
    issues.push('POSSIBLE_TRUNCATION')
  }

  return issues
}

function analyzeContentQuality(protocol: any): {
  isEmpty: boolean
  isTruncated: boolean
  isVeryShort: boolean
  quality: string
} {
  const rawText = protocol.rawText || ''
  const htmlContent = protocol.htmlContent || ''

  const isEmpty = rawText.length < 50
  const isVeryShort = rawText.length < 200
  const isTruncated = rawText.length < 500 && !rawText.includes('Criterii') && !rawText.includes('Indicație')

  let quality = 'GOOD'
  if (isEmpty) quality = 'EMPTY'
  else if (isTruncated) quality = 'TRUNCATED'
  else if (isVeryShort) quality = 'VERY_SHORT'

  return { isEmpty, isTruncated, isVeryShort, quality }
}

async function analyzeAllProtocols() {
  console.log('🔍 Fetching all protocols from database...\n')

  const protocols = await prisma.protocol.findMany({
    select: {
      code: true,
      title: true,
      rawText: true,
      htmlContent: true,
      status: true,
      statusReason: true,
      dci: true,
      cnasUrl: true,
      officialPdfUrl: true,
      storedPdfUrl: true
    },
    orderBy: { code: 'asc' }
  })

  console.log(`📊 Total protocols in database: ${protocols.length}\n`)

  const issuesFound: TitleIssue[] = []
  const contentIssues: any[] = []

  for (const protocol of protocols) {
    const titleIssues = analyzeTitleIssues(protocol)
    const contentQuality = analyzeContentQuality(protocol)

    if (titleIssues.length > 0 || contentQuality.quality !== 'GOOD') {
      const issue: TitleIssue = {
        code: protocol.code,
        title: protocol.title,
        issueType: titleIssues,
        contentLength: protocol.rawText?.length || 0,
        rawTextPreview: (protocol.rawText || '').substring(0, 150),
        statusInfo: {
          status: protocol.status,
          statusReason: protocol.statusReason
        }
      }

      if (titleIssues.length > 0) {
        issuesFound.push(issue)
      }

      if (contentQuality.quality !== 'GOOD') {
        contentIssues.push({
          ...issue,
          contentQuality: contentQuality.quality,
          hasPdf: !!(protocol.storedPdfUrl || protocol.officialPdfUrl)
        })
      }
    }
  }

  // Group issues by type
  const issuesByType: Record<string, TitleIssue[]> = {}
  issuesFound.forEach(issue => {
    issue.issueType.forEach(type => {
      if (!issuesByType[type]) issuesByType[type] = []
      issuesByType[type].push(issue)
    })
  })

  // Print summary
  console.log('=' .repeat(80))
  console.log('📋 TITLE ISSUES SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nTotal protocols with title issues: ${issuesFound.length}`)
  console.log('\nIssues by type:')
  Object.entries(issuesByType).forEach(([type, issues]) => {
    console.log(`  ${type}: ${issues.length} protocols`)
  })

  // Print detailed issues
  console.log('\n' + '='.repeat(80))
  console.log('🔍 DETAILED TITLE ISSUES')
  console.log('='.repeat(80))

  Object.entries(issuesByType).forEach(([type, issues]) => {
    console.log(`\n\n--- ${type} (${issues.length} protocols) ---\n`)
    issues.slice(0, 20).forEach(issue => {
      console.log(`Code: ${issue.code}`)
      console.log(`Title: "${issue.title}"`)
      console.log(`Content Length: ${issue.contentLength} chars`)
      console.log(`Status: ${issue.statusInfo.status}`)
      if (issue.statusInfo.statusReason) {
        console.log(`Status Reason: ${issue.statusInfo.statusReason}`)
      }
      console.log(`Preview: ${issue.rawTextPreview.substring(0, 100)}...`)
      console.log('---\n')
    })
    if (issues.length > 20) {
      console.log(`... and ${issues.length - 20} more\n`)
    }
  })

  // Print content quality issues
  console.log('\n' + '='.repeat(80))
  console.log('📄 CONTENT QUALITY ISSUES')
  console.log('='.repeat(80))
  console.log(`\nTotal protocols with content issues: ${contentIssues.length}\n`)

  const emptyProtocols = contentIssues.filter(p => p.contentQuality === 'EMPTY')
  const truncatedProtocols = contentIssues.filter(p => p.contentQuality === 'TRUNCATED')
  const veryShortProtocols = contentIssues.filter(p => p.contentQuality === 'VERY_SHORT')

  console.log(`EMPTY (< 50 chars): ${emptyProtocols.length}`)
  console.log(`TRUNCATED (< 500 chars, no key sections): ${truncatedProtocols.length}`)
  console.log(`VERY_SHORT (< 200 chars): ${veryShortProtocols.length}`)

  console.log('\n--- EMPTY PROTOCOLS ---\n')
  emptyProtocols.forEach(p => {
    console.log(`${p.code}: "${p.title}" (${p.contentLength} chars, PDF: ${p.hasPdf ? 'YES' : 'NO'})`)
  })

  console.log('\n--- TRUNCATED PROTOCOLS ---\n')
  truncatedProtocols.slice(0, 30).forEach(p => {
    console.log(`${p.code}: "${p.title}" (${p.contentLength} chars, PDF: ${p.hasPdf ? 'YES' : 'NO'})`)
    console.log(`  Preview: ${p.rawTextPreview}`)
    console.log('')
  })

  // Export to JSON for further analysis
  const exportData = {
    totalProtocols: protocols.length,
    protocolsWithTitleIssues: issuesFound.length,
    protocolsWithContentIssues: contentIssues.length,
    issuesByType,
    emptyProtocols,
    truncatedProtocols,
    veryShortProtocols,
    allIssues: issuesFound
  }

  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  fs.writeFileSync(
    path.join(dataDir, 'protocol-issues-analysis.json'),
    JSON.stringify(exportData, null, 2),
    'utf-8'
  )

  console.log('\n' + '='.repeat(80))
  console.log('✅ Analysis complete!')
  console.log('📁 Detailed report saved to: data/protocol-issues-analysis.json')
  console.log('='.repeat(80))
}

analyzeAllProtocols()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
