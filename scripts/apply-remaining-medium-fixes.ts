import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function applyRemainingFixes() {
  console.log('🔧 Applying remaining medium-confidence fixes with manual curation...\n')

  // Manual review decisions based on analysis
  const fixes = [
    { code: 'R03DX05', title: 'OMALIZUMABUM', reason: 'Corrupted title, DCI is correct' },
    { code: 'S01EE05', title: 'TAFLUPROSTUM', reason: 'Section header, DCI is correct' },
    { code: 'V001D', title: 'DEFEROXAMINUM', reason: 'Section header, DCI is correct' },
    { code: 'L04AC11', title: 'SILTUXIMABUM', reason: 'Section header, DCI is correct' },
    // Skip these - they need content re-extraction:
    // L040M, L041M, L04AX08, N026F, N032G - truncated/corrupted content
  ]

  let appliedCount = 0

  for (const fix of fixes) {
    try {
      const protocol = await prisma.protocol.findUnique({
        where: { code: fix.code },
        select: { title: true }
      })

      if (!protocol) {
        console.log(`⚠️  ${fix.code}: Not found`)
        continue
      }

      await prisma.protocol.update({
        where: { code: fix.code },
        data: { title: fix.title }
      })

      console.log(`✅ ${fix.code}:`)
      console.log(`   From: "${protocol.title}"`)
      console.log(`   To:   "${fix.title}"`)
      console.log(`   Reason: ${fix.reason}`)
      console.log('')

      appliedCount++
    } catch (error) {
      console.error(`❌ ${fix.code}: Failed - ${error}\n`)
    }
  }

  console.log(`\n📊 Applied: ${appliedCount} additional fixes`)
  console.log('✅ All reviewable medium-confidence fixes complete!')
  console.log('\nRemaining 5 protocols need content re-extraction from PDFs.\n')
}

applyRemainingFixes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
