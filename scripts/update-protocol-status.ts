/**
 * Update Protocol Status Algorithm
 *
 * Classifies protocols as:
 * - active: In September 2025 or FormareMedicala (January 2025)
 * - variant: Genetic mutation codes (G1244E, L858R, etc.)
 * - discontinued: Only in older PDFs (2021-2023)
 * - pending: Needs manual review
 */

import { db } from '../lib/db'

// Genetic mutation codes that should be marked as variants
const GENETIC_VARIANTS = [
  'G1244E', 'G551D', 'G178R', 'L858R', 'T790M', 'V600', 'V600E',
  'E412', 'F508', 'DF508', 'S549N', 'S549R', 'G551S', 'R117H',
  'T315I', 'D816'
]

// Category/group codes (not standalone protocols)
const CATEGORY_CODES = [
  'G10', 'G11', 'G22', 'G25', 'G27', 'G31', 'G31C', 'G31D', 'G31E', 'G31F',
  'L01', 'L01FF', 'D11AH', 'B01AE', 'E1200'
]

// Subprotocol/variant codes
const SUBPROTOCOL_VARIANTS = [
  'L016C', 'L031C', 'L033C', 'L042C', 'M003M', 'BD01D', 'CI01I',
  'J06BA01-PDICDCI', 'L04AA43-HPNRAVULIZUMABUM', 'R03DX05-UCSURTICARIE'
]

async function updateProtocolStatus() {
  console.log('🔍 Updating protocol status classification...\n')

  // Get all protocols
  const protocols = await db.protocol.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      rawText: true,
      lastUpdateDate: true,
      storedPdfUrl: true
    }
  })

  console.log(`📊 Total protocols: ${protocols.length}\n`)

  let activeCount = 0
  let variantCount = 0
  let discontinuedCount = 0
  let pendingCount = 0

  for (const protocol of protocols) {
    let status = 'active'
    let statusReason: string | null = null
    let parentProtocolCode: string | null = null

    const contentLength = protocol.rawText?.length || 0

    // 1. Check if genetic variant
    if (GENETIC_VARIANTS.includes(protocol.code)) {
      status = 'variant'
      statusReason = 'Genetic mutation code - not a standalone protocol'
      variantCount++
    }
    // 2. Check if category code
    else if (CATEGORY_CODES.includes(protocol.code)) {
      status = 'variant'
      statusReason = 'Category/group code - not a standalone protocol'
      variantCount++
    }
    // 3. Check if subprotocol variant
    else if (SUBPROTOCOL_VARIANTS.includes(protocol.code)) {
      status = 'variant'
      statusReason = 'Subprotocol or variant code'
      variantCount++
    }
    // 4. Check if very short content (likely incomplete extraction)
    else if (contentLength < 500) {
      status = 'pending'
      statusReason = `Incomplete content (${contentLength} chars) - needs manual review`
      pendingCount++
    }
    // 5. Active protocols with good content
    else if (contentLength >= 500) {
      status = 'active'
      statusReason = null
      activeCount++

      // Check if from recent PDFs (2024-2025)
      if (protocol.storedPdfUrl?.includes('2025') || protocol.storedPdfUrl?.includes('2024')) {
        status = 'active'
      }
      // If only from old PDFs and has minimal content, mark as pending
      else if (protocol.storedPdfUrl?.includes('2021') && contentLength < 1000) {
        status = 'pending'
        statusReason = 'Only in old PDFs (2021) - may be discontinued'
        pendingCount++
        activeCount--
      }
    }

    // Update the protocol
    await db.protocol.update({
      where: { id: protocol.id },
      data: {
        status,
        statusReason,
        parentProtocolCode,
        lastCnasUpdate: protocol.lastUpdateDate || new Date('2025-01-01')
      }
    })

    // Log interesting cases
    if (status !== 'active') {
      console.log(`   ${status.toUpperCase()}: ${protocol.code} - ${statusReason}`)
    }
  }

  console.log(`\n📊 Status Classification Summary:`)
  console.log(`   ✅ Active: ${activeCount} (${((activeCount / protocols.length) * 100).toFixed(1)}%)`)
  console.log(`   🔀 Variants: ${variantCount} (${((variantCount / protocols.length) * 100).toFixed(1)}%)`)
  console.log(`   📋 Pending: ${pendingCount} (${((pendingCount / protocols.length) * 100).toFixed(1)}%)`)
  console.log(`   🚫 Discontinued: ${discontinuedCount} (${((discontinuedCount / protocols.length) * 100).toFixed(1)}%)`)

  // Verify database state
  const statusCounts = await db.protocol.groupBy({
    by: ['status'],
    _count: { status: true }
  })

  console.log(`\n✅ Database verification:`)
  for (const { status, _count } of statusCounts) {
    console.log(`   ${status}: ${_count.status}`)
  }
}

if (require.main === module) {
  updateProtocolStatus()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { updateProtocolStatus }
