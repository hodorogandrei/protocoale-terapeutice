import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Fix {
  code: string
  proposedTitle: string
  reason: string
}

async function applySentenceFragmentFixes() {
  console.log('🔧 Applying manually curated sentence fragment title fixes...\n')
  console.log('='.repeat(80))

  // Manually curated HIGH confidence fixes (excluding problematic ones)
  const highConfidenceFixes: Fix[] = [
    // Clear sentence fragments with valid DCI
    { code: 'A005E', proposedTitle: 'PARICALCITOLUM', reason: 'Sentence fragment → DCI' },
    { code: 'A008E', proposedTitle: 'IMIGLUCERASUM', reason: 'Disease description → DCI' },
    { code: 'A016E', proposedTitle: 'INSULINUM ASPART', reason: 'Sentence fragment → DCI' },
    { code: 'A029E', proposedTitle: 'INSULINUM LISPRO', reason: 'Sentence fragment → DCI' },
    { code: 'A10BH02', proposedTitle: 'VILDAGLIPTINUM', reason: 'Sentence fragment → DCI' },
    { code: 'A10BJ05', proposedTitle: 'DULAGLUTIDUM', reason: 'Sentence fragment → DCI' },
    { code: 'A10BX10', proposedTitle: 'LIXISENATIDUM', reason: 'Sentence fragment → DCI' },
    { code: 'B014I', proposedTitle: 'SULODEXIDUM', reason: 'Sentence fragment → DCI' },
    { code: 'B01AC24', proposedTitle: 'TICAGRELOR', reason: 'Sentence fragment → DCI' },
    { code: 'B02BX06', proposedTitle: 'EMICIZUMAB', reason: 'Section header → DCI' },
    { code: 'B06AC01', proposedTitle: 'INHIBITOR DE ESTERAZĂ C1', reason: 'Duplicated text → clean DCI' },
    { code: 'C03XA01', proposedTitle: 'TOLVAPTAN', reason: 'Sentence fragment → DCI' },
    { code: 'D11AH05-A', proposedTitle: 'DUPILUMABUM', reason: 'Sentence fragment → DCI' },
    { code: 'H01AC03', proposedTitle: 'MECASERMIN', reason: 'Sentence fragment → DCI' },
    { code: 'J001G', proposedTitle: 'IMUNOGLOBULINA NORMALĂ', reason: 'Duplicated text → clean DCI' },
    { code: 'J06BB16', proposedTitle: 'PALIVIZUMABUM', reason: 'Sentence fragment → DCI' },
    { code: 'L003C', proposedTitle: 'FULVESTRANTUM', reason: 'Sentence fragment → DCI' },
    { code: 'L01EH03', proposedTitle: 'TUCATINIBUM', reason: 'Disease name → DCI' },
    { code: 'L01XC31', proposedTitle: 'AVELUMABUM', reason: 'Sentence fragment → DCI' },
    { code: 'L01XE12', proposedTitle: 'VANDETANIB', reason: 'Sentence fragment → DCI' },
    { code: 'L01XE13', proposedTitle: 'AFATINIBUM', reason: 'Protocol header → DCI' },
    { code: 'L01XE33', proposedTitle: 'PALBOCICLIBUM', reason: 'Sentence fragment → DCI' },
    { code: 'L01XX45', proposedTitle: 'CARFILZOMIBUM', reason: 'Corrupted title → DCI' },
    { code: 'L040C', proposedTitle: 'GOSERELINUM', reason: 'Mixed text → DCI' },
    { code: 'N016F', proposedTitle: 'CLOZAPINUM', reason: 'Category name → DCI' },
    { code: 'N028F', proposedTitle: 'PALIPERIDONUM', reason: 'Note text → DCI' },
    { code: 'N07XX12', proposedTitle: 'PATISIRANUM', reason: 'Disease name → DCI' },
    { code: 'R03AC13', proposedTitle: 'FORMOTEROLUM', reason: 'Sentence fragment → DCI (user example)' },
    { code: 'R03BB06', proposedTitle: 'GLICOPIRONIUM', reason: 'Sentence fragment → DCI (user example)' },
    { code: 'R07AX02', proposedTitle: 'IVACAFTORUM', reason: 'Sentence fragment → DCI' },
  ]

  // EXCLUDED from HIGH confidence (problematic):
  // A010N: Current title "COMPLEX DE HIDROXID FER (III) SUCROZĂ" is better than truncated DCI
  // L01XE50: DCI mismatch (ONIVYDE vs ABEMACICLIBUM in code)
  // M05BX04: PROLIA is brand name, not DCI

  // Safe MEDIUM confidence fixes (drug name cleanup - just removing extra text)
  const mediumConfidenceFixes: Fix[] = [
    { code: 'A10BJ01', proposedTitle: 'EXENATIDUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'A10BJ02', proposedTitle: 'LIRAGLUTIDUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'A10BK03', proposedTitle: 'EMPAGLIFLOZINUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'A10BX09', proposedTitle: 'DAPAGLIFLOZINUM', reason: 'Drug name + extra text → clean drug name' },
    { code: 'B06AC05', proposedTitle: 'LANADELUMABUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'J05AX18', proposedTitle: 'LETERMOVIRUM', reason: 'Drug name + extra text → clean drug name' },
    { code: 'J05AX28', proposedTitle: 'BULEVIRTIDUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'L01XE18', proposedTitle: 'RUXOLITINIBUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'L01XE31', proposedTitle: 'NINTEDANIBUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'L01XE44', proposedTitle: 'LORLATINIBUM', reason: 'Drug name + extra text → clean drug name' },
    { code: 'L01XX46', proposedTitle: 'OLAPARIBUM', reason: 'Duplicated drug name + extra text → clean drug name' },
    { code: 'L02BB05', proposedTitle: 'APALUTAMIDUM', reason: 'Drug name + extra text → clean drug name' },
    { code: 'L04AA25-HPN', proposedTitle: 'ECULIZUMABUM', reason: 'Extracted from content' },
  ]

  const allFixes = [...highConfidenceFixes, ...mediumConfidenceFixes]

  console.log(`📊 SUMMARY`)
  console.log(`   High confidence fixes: ${highConfidenceFixes.length}`)
  console.log(`   Medium confidence fixes (safe): ${mediumConfidenceFixes.length}`)
  console.log(`   Total fixes to apply: ${allFixes.length}`)
  console.log('='.repeat(80))

  let successCount = 0
  let errorCount = 0

  for (const fix of allFixes) {
    try {
      const protocol = await prisma.protocol.findUnique({
        where: { code: fix.code },
        select: { title: true }
      })

      if (!protocol) {
        console.log(`\n⚠️  ${fix.code}: Not found in database`)
        errorCount++
        continue
      }

      await prisma.protocol.update({
        where: { code: fix.code },
        data: { title: fix.proposedTitle }
      })

      console.log(`\n✅ ${fix.code}`)
      console.log(`   From: "${protocol.title.substring(0, 70)}${protocol.title.length > 70 ? '...' : ''}"`)
      console.log(`   To:   "${fix.proposedTitle}"`)
      console.log(`   ${fix.reason}`)

      successCount++
    } catch (error) {
      console.error(`\n❌ ${fix.code}: Failed - ${error}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 RESULTS')
  console.log('='.repeat(80))
  console.log(`\n✅ Successfully applied: ${successCount} fixes`)
  console.log(`❌ Failed: ${errorCount} fixes`)
  console.log(`\n📈 Success rate: ${((successCount / allFixes.length) * 100).toFixed(1)}%`)

  console.log('\n' + '='.repeat(80))
  console.log('✅ SENTENCE FRAGMENT FIXES COMPLETE')
  console.log('='.repeat(80))
  console.log('\nNext steps:')
  console.log('1. Run verify-fixes.ts to check data quality improvements')
  console.log('2. Review remaining LOW confidence protocols manually')
  console.log('3. Consider additional MEDIUM confidence fixes with manual review\n')
}

applySentenceFragmentFixes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
