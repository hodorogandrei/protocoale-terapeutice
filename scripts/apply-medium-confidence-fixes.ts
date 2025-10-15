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
    proposedTitle?: string
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    reasoning: string
  }>
}

async function applyMediumConfidenceFixes() {
  console.log('📖 Loading fix plan...\n')

  const fixPlanPath = path.join(process.cwd(), 'data', 'fix-plan.json')
  const fixPlan: FixPlan = JSON.parse(fs.readFileSync(fixPlanPath, 'utf-8'))

  const mediumConfFixes = fixPlan.actions.filter(
    f => f.action === 'FIX_TITLE' && f.confidence === 'MEDIUM' && f.proposedTitle
  )

  console.log('='.repeat(80))
  console.log('🔧 REVIEWING MEDIUM CONFIDENCE FIXES')
  console.log('='.repeat(80))
  console.log(`\nFound ${mediumConfFixes.length} medium-confidence fixes\n`)

  // Curated list of fixes that are clearly correct based on DCI field
  const goodFixes = [
    { code: 'A10BD08', proposedTitle: 'VILDAGLIPTIN+METFORMIN', reason: 'DCI field is correct combination' },
    { code: 'IL17', proposedTitle: 'SECUKINUMAB, IXEKIZUMAB', reason: 'DCI field has proper drug names' },
    { code: 'L002C', proposedTitle: 'ACIDUM IBANDRONICUM', reason: 'DCI field completes truncated title' },
    { code: 'L005C', proposedTitle: 'ACIDUM PAMIDRONICUM', reason: 'DCI field is correct, current is category name' },
    { code: 'L006C', proposedTitle: 'ACIDUM ZOLEDRONICUM', reason: 'DCI field is correct, current is wrong drug' },
    { code: 'L01BC08', proposedTitle: 'DECITABINUM', reason: 'DCI field is correct, current is indication fragment' },
    { code: 'L01XC12', proposedTitle: 'BRENTUXIMAB', reason: 'DCI field is correct, current is corrupted' },
    { code: 'L01XE06', proposedTitle: 'DASATINIBUM', reason: 'DCI field is correct, current is protocol header' },
    { code: 'L01XE08', proposedTitle: 'NILOTINIBUM', reason: 'DCI field is correct, current is section header' },
    { code: 'L01XE16', proposedTitle: 'CRIZOTINIBUM', reason: 'DCI field is correct, current is protocol header' },
    { code: 'L01XE28', proposedTitle: 'CERITINIBUM', reason: 'DCI field is correct, current is indication' },
    { code: 'L01XE42', proposedTitle: 'RIBOCICLIBUM', reason: 'DCI field is correct, current is corrupted' },
    { code: 'L020F', proposedTitle: 'BUPROPIONUM', reason: 'DCI field is correct, current is drug class' },
  ]

  // Skip these - they have problematic proposed titles
  const skipCodes = [
    'J06BA01', // Proposed title is a sentence fragment
    'J07BC01', // Proposed title adds "DCI" prefix unnecessarily
    'L01BC07', // Proposed title is "Pagina: 624"
    'L01CX01', // Proposed title is metadata
    'L01XC16', // Proposed title is "Doze și mod de administrare"
    'L02BB04', // Proposed title is metadata
    'L032C', // Proposed title is metadata
  ]

  console.log('✅ APPLYING CURATED GOOD FIXES:\n')

  let appliedCount = 0
  let skippedCount = 0

  for (const fix of goodFixes) {
    const mediumFix = mediumConfFixes.find(f => f.code === fix.code)
    if (!mediumFix) {
      console.log(`⚠️  ${fix.code}: Not found in medium confidence list`)
      continue
    }

    try {
      await prisma.protocol.update({
        where: { code: fix.code },
        data: { title: fix.proposedTitle }
      })

      console.log(`✅ ${fix.code}:`)
      console.log(`   From: "${mediumFix.currentTitle}"`)
      console.log(`   To:   "${fix.proposedTitle}"`)
      console.log(`   Reason: ${fix.reason}`)
      console.log('')

      appliedCount++
    } catch (error) {
      console.error(`❌ ${fix.code}: Failed - ${error}\n`)
    }
  }

  console.log(`\n📊 Applied: ${appliedCount}, Skipped problematic: ${skipCodes.length}`)

  // Show remaining medium-confidence fixes
  const remaining = mediumConfFixes.filter(f =>
    !goodFixes.some(g => g.code === f.code) &&
    !skipCodes.includes(f.code)
  )

  if (remaining.length > 0) {
    console.log(`\n⚠️  REMAINING ${remaining.length} FIXES NEED MANUAL REVIEW:\n`)
    remaining.forEach(f => {
      console.log(`${f.code}: "${f.currentTitle}" → "${f.proposedTitle}"`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ MEDIUM CONFIDENCE FIXES COMPLETE')
  console.log('='.repeat(80))
}

applyMediumConfidenceFixes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
