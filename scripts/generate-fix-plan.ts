import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { extractTitleFromRawText, isTitleCorrupted, KNOWN_PROTOCOL_TITLES } from '../lib/title-validator'

const prisma = new PrismaClient()

interface FixAction {
  code: string
  currentTitle: string
  issue: string[]
  contentLength: number
  action: 'FIX_TITLE' | 'REMOVE_EMPTY' | 'NEEDS_MANUAL_REVIEW' | 'EXTRACT_FROM_PDF'
  proposedTitle?: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
}

async function generateFixPlan() {
  console.log('🔍 Loading analysis data...\n')

  // Load protocols from database
  const protocols = await prisma.protocol.findMany({
    select: {
      code: true,
      title: true,
      rawText: true,
      dci: true,
      status: true,
      statusReason: true,
      storedPdfUrl: true,
      officialPdfUrl: true
    },
    orderBy: { code: 'asc' }
  })

  console.log(`📊 Total protocols: ${protocols.length}\n`)

  const fixActions: FixAction[] = []

  for (const protocol of protocols) {
    const issues: string[] = []
    const rawText = protocol.rawText || ''
    const currentTitle = protocol.title
    const contentLength = rawText.length

    // Check for title issues
    const titleCorrupted = isTitleCorrupted(currentTitle)
    const isTooShort = currentTitle.length < 25
    const isJustDCI = currentTitle === currentTitle.toUpperCase() && currentTitle.length < 20
    const isTableRowArtifact = /[A-Z]\d+[A-Z]+.*[A-Z]\d+[A-Z]+/.test(currentTitle) && currentTitle.split(/[A-Z]\d+[A-Z]+/).length > 3

    if (titleCorrupted) issues.push('CORRUPTED_TITLE')
    if (isTooShort) issues.push('TOO_SHORT')
    if (isJustDCI) issues.push('JUST_DCI')
    if (isTableRowArtifact) issues.push('TABLE_ARTIFACT')

    // Check for content issues
    const isEmpty = contentLength < 50
    const isTruncated = contentLength < 500 && !rawText.includes('Criterii') && !rawText.includes('Indicație')
    const isVeryShort = contentLength < 200

    if (isEmpty) issues.push('EMPTY_CONTENT')
    else if (isTruncated) issues.push('TRUNCATED_CONTENT')
    else if (isVeryShort) issues.push('VERY_SHORT_CONTENT')

    // If there are issues, determine fix action
    if (issues.length > 0) {
      let action: FixAction['action']
      let proposedTitle: string | undefined
      let confidence: FixAction['confidence'] = 'LOW'
      let reasoning = ''

      // Action: REMOVE if empty
      if (isEmpty) {
        action = 'REMOVE_EMPTY'
        reasoning = `Content is empty (${contentLength} chars). Not repairable.`
        confidence = 'HIGH'
      }
      // Action: EXTRACT_FROM_PDF if truncated but has PDF
      else if (isTruncated && (protocol.storedPdfUrl || protocol.officialPdfUrl)) {
        action = 'EXTRACT_FROM_PDF'
        reasoning = `Content truncated (${contentLength} chars). Individual PDF available at ${protocol.storedPdfUrl || protocol.officialPdfUrl}. Need to re-extract.`
        confidence = 'MEDIUM'
      }
      // Action: FIX_TITLE if title issue but content is good
      else if ((titleCorrupted || isTooShort || isJustDCI) && contentLength > 500) {
        // Try to extract title from known list
        const knownTitle = KNOWN_PROTOCOL_TITLES[protocol.code]

        if (knownTitle) {
          proposedTitle = knownTitle
          confidence = 'HIGH'
          reasoning = `Found in known protocols list: "${knownTitle}"`
        } else {
          // Try to extract from content
          const extractedTitle = extractTitleFromRawText(rawText, protocol.code)
          if (extractedTitle && extractedTitle !== currentTitle && extractedTitle.length > 20) {
            proposedTitle = extractedTitle
            confidence = 'MEDIUM'
            reasoning = `Extracted from content: "${extractedTitle}"`
          } else {
            // Try using DCI
            if (protocol.dci && protocol.dci !== currentTitle && protocol.dci.length > 10) {
              proposedTitle = protocol.dci
              confidence = 'MEDIUM'
              reasoning = `Using DCI field: "${protocol.dci}"`
            } else {
              reasoning = `Could not extract better title. Current: "${currentTitle}". DCI: "${protocol.dci || 'none'}"`
              confidence = 'LOW'
            }
          }
        }

        action = 'FIX_TITLE'
      }
      // Action: NEEDS_MANUAL_REVIEW for complex cases
      else {
        action = 'NEEDS_MANUAL_REVIEW'
        reasoning = `Complex case: ${issues.join(', ')}. Content: ${contentLength} chars. Needs manual review.`
        confidence = 'LOW'
      }

      fixActions.push({
        code: protocol.code,
        currentTitle,
        issue: issues,
        contentLength,
        action,
        proposedTitle,
        confidence,
        reasoning
      })
    }
  }

  // Group by action
  const actionGroups = {
    FIX_TITLE: fixActions.filter(f => f.action === 'FIX_TITLE'),
    REMOVE_EMPTY: fixActions.filter(f => f.action === 'REMOVE_EMPTY'),
    EXTRACT_FROM_PDF: fixActions.filter(f => f.action === 'EXTRACT_FROM_PDF'),
    NEEDS_MANUAL_REVIEW: fixActions.filter(f => f.action === 'NEEDS_MANUAL_REVIEW')
  }

  // Print summary
  console.log('='.repeat(80))
  console.log('📋 FIX PLAN SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nTotal protocols with issues: ${fixActions.length}\n`)
  console.log(`FIX_TITLE: ${actionGroups.FIX_TITLE.length} protocols`)
  console.log(`REMOVE_EMPTY: ${actionGroups.REMOVE_EMPTY.length} protocols`)
  console.log(`EXTRACT_FROM_PDF: ${actionGroups.EXTRACT_FROM_PDF.length} protocols`)
  console.log(`NEEDS_MANUAL_REVIEW: ${actionGroups.NEEDS_MANUAL_REVIEW.length} protocols`)

  // Confidence breakdown for FIX_TITLE
  const fixTitleHighConf = actionGroups.FIX_TITLE.filter(f => f.confidence === 'HIGH')
  const fixTitleMedConf = actionGroups.FIX_TITLE.filter(f => f.confidence === 'MEDIUM')
  const fixTitleLowConf = actionGroups.FIX_TITLE.filter(f => f.confidence === 'LOW')

  console.log(`\nFIX_TITLE Confidence Breakdown:`)
  console.log(`  HIGH: ${fixTitleHighConf.length}`)
  console.log(`  MEDIUM: ${fixTitleMedConf.length}`)
  console.log(`  LOW: ${fixTitleLowConf.length}`)

  // Print detailed actions
  console.log('\n' + '='.repeat(80))
  console.log('🔧 FIX_TITLE ACTIONS (HIGH CONFIDENCE)')
  console.log('='.repeat(80))
  fixTitleHighConf.slice(0, 30).forEach(fix => {
    console.log(`\n${fix.code}:`)
    console.log(`  Current: "${fix.currentTitle}"`)
    console.log(`  Proposed: "${fix.proposedTitle}"`)
    console.log(`  Reasoning: ${fix.reasoning}`)
    console.log(`  Issues: ${fix.issue.join(', ')}`)
  })
  if (fixTitleHighConf.length > 30) {
    console.log(`\n... and ${fixTitleHighConf.length - 30} more`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('🔧 FIX_TITLE ACTIONS (MEDIUM CONFIDENCE)')
  console.log('='.repeat(80))
  fixTitleMedConf.slice(0, 20).forEach(fix => {
    console.log(`\n${fix.code}:`)
    console.log(`  Current: "${fix.currentTitle}"`)
    console.log(`  Proposed: "${fix.proposedTitle || 'none'}"`)
    console.log(`  Reasoning: ${fix.reasoning}`)
  })
  if (fixTitleMedConf.length > 20) {
    console.log(`\n... and ${fixTitleMedConf.length - 20} more`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('🗑️  REMOVE_EMPTY ACTIONS')
  console.log('='.repeat(80))
  actionGroups.REMOVE_EMPTY.forEach(fix => {
    console.log(`${fix.code}: "${fix.currentTitle}" (${fix.contentLength} chars)`)
  })

  console.log('\n' + '='.repeat(80))
  console.log('📄 EXTRACT_FROM_PDF ACTIONS')
  console.log('='.repeat(80))
  actionGroups.EXTRACT_FROM_PDF.slice(0, 30).forEach(fix => {
    console.log(`\n${fix.code}: "${fix.currentTitle}"`)
    console.log(`  ${fix.reasoning}`)
  })
  if (actionGroups.EXTRACT_FROM_PDF.length > 30) {
    console.log(`\n... and ${actionGroups.EXTRACT_FROM_PDF.length - 30} more`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('⚠️  NEEDS_MANUAL_REVIEW')
  console.log('='.repeat(80))
  actionGroups.NEEDS_MANUAL_REVIEW.slice(0, 20).forEach(fix => {
    console.log(`\n${fix.code}: "${fix.currentTitle}"`)
    console.log(`  ${fix.reasoning}`)
  })
  if (actionGroups.NEEDS_MANUAL_REVIEW.length > 20) {
    console.log(`\n... and ${actionGroups.NEEDS_MANUAL_REVIEW.length - 20} more`)
  }

  // Export to JSON
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  fs.writeFileSync(
    path.join(dataDir, 'fix-plan.json'),
    JSON.stringify({
      summary: {
        totalIssues: fixActions.length,
        fixTitle: actionGroups.FIX_TITLE.length,
        removeEmpty: actionGroups.REMOVE_EMPTY.length,
        extractFromPdf: actionGroups.EXTRACT_FROM_PDF.length,
        needsManualReview: actionGroups.NEEDS_MANUAL_REVIEW.length
      },
      actions: fixActions,
      actionGroups
    }, null, 2),
    'utf-8'
  )

  console.log('\n' + '='.repeat(80))
  console.log('✅ Fix plan generated!')
  console.log('📁 Saved to: data/fix-plan.json')
  console.log('='.repeat(80))
}

generateFixPlan()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
