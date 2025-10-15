import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface FixPlan {
  actions: Array<{
    code: string
    currentTitle: string
    issue: string[]
    contentLength: number
    action: string
    reasoning: string
  }>
}

async function investigateComplexCases() {
  console.log('🔍 Investigating complex cases...\n')

  const fixPlanPath = path.join(process.cwd(), 'data', 'fix-plan.json')
  const fixPlan: FixPlan = JSON.parse(fs.readFileSync(fixPlanPath, 'utf-8'))

  const complexCases = fixPlan.actions.filter(f => f.action === 'NEEDS_MANUAL_REVIEW')

  console.log('='.repeat(80))
  console.log('🔎 COMPLEX CASES INVESTIGATION')
  console.log('='.repeat(80))
  console.log(`\nFound ${complexCases.length} complex cases\n`)

  const decisions: Array<{ code: string; action: string; newTitle?: string; reason: string }> = []

  for (const item of complexCases) {
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`📋 ${item.code}: "${item.currentTitle}"`)
    console.log(`Issues: ${item.issue.join(', ')}`)
    console.log(`Content: ${item.contentLength} chars`)
    console.log(`Reasoning: ${item.reasoning}`)

    // Fetch full protocol data
    const protocol = await prisma.protocol.findUnique({
      where: { code: item.code },
      select: {
        code: true,
        title: true,
        dci: true,
        rawText: true,
        status: true,
        statusReason: true,
        storedPdfUrl: true,
        officialPdfUrl: true
      }
    })

    if (!protocol) {
      console.log(`⚠️  Not found in database`)
      continue
    }

    console.log(`DCI: "${protocol.dci || 'none'}"`)
    console.log(`Status: ${protocol.status}`)
    console.log(`PDF: ${protocol.storedPdfUrl || protocol.officialPdfUrl || 'none'}`)
    console.log(`Content preview: ${protocol.rawText?.substring(0, 200) || 'none'}...`)

    // Make decision based on analysis
    let decision: string = 'SKIP'
    let newTitle: string | undefined
    let reason: string = 'No specific action needed'

    if (item.code === 'B009I') {
      // This looks like a table row with multiple protocols mixed together
      decision = 'MARK_AS_VARIANT'
      reason = 'Multi-protocol table row artifact. Should be split or marked as invalid.'
      decisions.push({ code: item.code, action: decision, reason })
    }
    else if (item.code === 'B06AC04') {
      // Another table row artifact
      decision = 'MARK_AS_VARIANT'
      reason = 'Multi-protocol table row artifact. Content shows it\'s about CONESTAT ALFA.'
      newTitle = 'CONESTAT ALFA'
      decisions.push({ code: item.code, action: decision, newTitle, reason })
    }
    else if (item.code === 'L01EK03') {
      // Another table row artifact
      decision = 'MARK_AS_VARIANT'
      reason = 'Multi-protocol table row artifact. Appears to be about PONATINIBUM based on content.'
      newTitle = 'PONATINIBUM'
      decisions.push({ code: item.code, action: decision, newTitle, reason })
    }
    else if (item.code === 'N017F') {
      // This has short title but decent content
      decision = 'FIX_TITLE'
      newTitle = 'SERTINDOLUM'
      reason = 'Title is just DCI name (valid), content is good (440 chars). Keep as is or just ensure title is clean.'
      decisions.push({ code: item.code, action: decision, newTitle, reason })
    }

    console.log(`\n💡 Decision: ${decision}`)
    console.log(`   ${reason}`)
    if (newTitle) console.log(`   New title: "${newTitle}"`)
  }

  // Apply decisions
  console.log(`\n\n${'='.repeat(80)}`)
  console.log('🔧 APPLYING DECISIONS')
  console.log('='.repeat(80))

  for (const decision of decisions) {
    try {
      const updateData: any = {}

      if (decision.newTitle) {
        updateData.title = decision.newTitle
      }

      if (decision.action === 'MARK_AS_VARIANT') {
        updateData.status = 'variant'
        updateData.statusReason = decision.reason
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.protocol.update({
          where: { code: decision.code },
          data: updateData
        })

        console.log(`\n✅ ${decision.code}:`)
        console.log(`   Action: ${decision.action}`)
        if (decision.newTitle) console.log(`   Title: "${decision.newTitle}"`)
        console.log(`   Reason: ${decision.reason}`)
      }
    } catch (error) {
      console.error(`\n❌ ${decision.code}: Failed - ${error}`)
    }
  }

  console.log(`\n\n${'='.repeat(80)}`)
  console.log('✅ COMPLEX CASES INVESTIGATION COMPLETE')
  console.log('='.repeat(80))
  console.log(`\nProcessed ${complexCases.length} complex cases`)
  console.log(`Applied ${decisions.length} decisions`)
  console.log('\n' + '='.repeat(80))
}

investigateComplexCases()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
