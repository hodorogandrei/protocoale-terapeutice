import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface FixPlan {
  summary: {
    totalIssues: number
    fixTitle: number
    removeEmpty: number
    extractFromPdf: number
    needsManualReview: number
  }
  actions: Array<{
    code: string
    currentTitle: string
    issue: string[]
    contentLength: number
    action: string
    proposedTitle?: string
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    reasoning: string
  }>
  actionGroups: any
}

async function applyTitleFixes() {
  console.log('📖 Loading fix plan...\n')

  const fixPlanPath = path.join(process.cwd(), 'data', 'fix-plan.json')
  const fixPlan: FixPlan = JSON.parse(fs.readFileSync(fixPlanPath, 'utf-8'))

  const highConfFixes = fixPlan.actions.filter(
    f => f.action === 'FIX_TITLE' && f.confidence === 'HIGH' && f.proposedTitle
  )

  const mediumConfFixes = fixPlan.actions.filter(
    f => f.action === 'FIX_TITLE' && f.confidence === 'MEDIUM' && f.proposedTitle
  )

  console.log('='.repeat(80))
  console.log('🔧 APPLYING HIGH CONFIDENCE FIXES')
  console.log('='.repeat(80))
  console.log(`\nApplying ${highConfFixes.length} high-confidence title fixes...\n`)

  let appliedCount = 0
  let skippedCount = 0

  for (const fix of highConfFixes) {
    // Skip if proposed title is the same as current (no real change)
    if (fix.proposedTitle === fix.currentTitle) {
      console.log(`⏭️  ${fix.code}: Skipping (no change needed)`)
      skippedCount++
      continue
    }

    try {
      await prisma.protocol.update({
        where: { code: fix.code },
        data: { title: fix.proposedTitle }
      })

      console.log(`✅ ${fix.code}:`)
      console.log(`   From: "${fix.currentTitle}"`)
      console.log(`   To:   "${fix.proposedTitle}"`)

      appliedCount++
    } catch (error) {
      console.error(`❌ ${fix.code}: Failed to update - ${error}`)
    }
  }

  console.log(`\n📊 High confidence fixes: ${appliedCount} applied, ${skippedCount} skipped\n`)

  // Medium confidence fixes - with preview
  console.log('='.repeat(80))
  console.log('🔧 MEDIUM CONFIDENCE FIXES (PREVIEW)')
  console.log('='.repeat(80))
  console.log(`\n${mediumConfFixes.length} medium-confidence fixes identified.`)
  console.log('These require manual review before applying.\n')

  mediumConfFixes.slice(0, 20).forEach((fix, idx) => {
    console.log(`${idx + 1}. ${fix.code}:`)
    console.log(`   Current: "${fix.currentTitle}"`)
    console.log(`   Proposed: "${fix.proposedTitle}"`)
    console.log(`   Reasoning: ${fix.reasoning}`)
    console.log('')
  })

  if (mediumConfFixes.length > 20) {
    console.log(`... and ${mediumConfFixes.length - 20} more\n`)
  }

  console.log('ℹ️  To apply medium confidence fixes, review data/fix-plan.json')
  console.log('   and manually run updates or modify this script.\n')

  // Summary
  console.log('='.repeat(80))
  console.log('✅ FIX APPLICATION COMPLETE')
  console.log('='.repeat(80))
  console.log(`\n📊 Summary:`)
  console.log(`   High confidence applied: ${appliedCount}`)
  console.log(`   High confidence skipped: ${skippedCount}`)
  console.log(`   Medium confidence pending: ${mediumConfFixes.length}`)
  console.log(`   Truncated protocols needing re-extraction: ${fixPlan.summary.extractFromPdf}`)
  console.log(`   Protocols needing manual review: ${fixPlan.summary.needsManualReview}`)
  console.log('\n='.repeat(80))
}

applyTitleFixes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
