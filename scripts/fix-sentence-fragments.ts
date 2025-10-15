import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Patterns that indicate sentence fragments
const sentenceFragmentPatterns = [
  /^[a-z]/,  // Starts with lowercase
  /^\d+[^\d]/,  // Starts with number followed by non-digit
  /^[IVX]+\./,  // Starts with Roman numeral (section number)
  /^-\s/,  // Starts with dash (list item)
  /^•/,  // Starts with bullet
  /^[A-Z][a-z]+.*\s(cu|de|la|în|pentru|care|este|sunt|sau|și|si)/i,  // Romanian sentence patterns
  /^(Pacient|Patient|Criterii|Indicat|Defini|Protocol|Tratament)/i,  // Section header starts
  /\bleucem|cancer|diabet|scleroz|insuficient|hiper|hipo/i,  // Medical condition fragments (lowercase)
]

interface FixProposal {
  code: string
  currentTitle: string
  proposedTitle: string
  dci: string | null
  contentLength: number
  strategy: 'DCI' | 'CONTENT_EXTRACTION' | 'MANUAL_REVIEW' | 'SKIP'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
}

function isSentenceFragment(title: string): boolean {
  // Skip if title is already a valid ALL CAPS drug name (even with Romanian prepositions)
  // Examples: "COMPLEX DE HIDROXID FER", "INHIBITOR DE PROTEAZA"
  if (/^[A-Z][A-Z\s\-\(\)]+$/.test(title) && title.length < 100) {
    // Check if it's mostly uppercase (drug name pattern)
    const uppercaseRatio = (title.match(/[A-Z]/g) || []).length / title.replace(/\s/g, '').length
    if (uppercaseRatio > 0.7) {
      return false // This is already a proper drug name
    }
  }

  return sentenceFragmentPatterns.some(pattern => pattern.test(title))
}

function isDCIValid(dci: string | null, currentTitle: string = ''): boolean {
  if (!dci) return false

  // Basic validation
  if (dci.length < 5 || dci.length > 100) return false
  if (!/^[A-Z]/.test(dci)) return false

  // Reject obvious metadata
  if (dci.includes('Informații') ||
      dci.includes('Pagina') ||
      dci.includes('Protocol') ||
      dci.includes('CNAS') ||
      dci.includes('Ordin') ||
      dci.includes('DCI ')) {  // Reject if "DCI " appears in the field itself
    return false
  }

  // Reject sentence fragments in DCI field (but allow "DE" in drug names like "INHIBITOR DE")
  if (/\s(cu|la|în|pentru|care|este|sunt|sau|și|si)\s/i.test(dci)) {
    return false
  }

  // Reject if DCI appears to be a truncated version of the current title
  // Example: title "INHIBITOR DE PROTEAZA" but DCI is just "INHIBITOR"
  if (currentTitle && currentTitle.startsWith(dci + ' ') && dci.split(' ').length === 1) {
    return false // DCI is just first word of a multi-word title
  }

  // Reject generic terms
  const genericTerms = ['COMBINAȚII', 'COMBINATII']
  if (genericTerms.includes(dci.toUpperCase())) {
    return false
  }

  // Check if it looks like a drug name (ends with common suffixes or is all caps)
  const drugSuffixes = ['UM', 'IN', 'AN', 'OL', 'ID', 'AT', 'AB', 'IL', 'MAB', 'LIPOSOMAL']
  const endsWithDrugSuffix = drugSuffixes.some(suffix => dci.endsWith(suffix))
  const isAllCaps = dci === dci.toUpperCase() && dci.length > 5

  return endsWithDrugSuffix || isAllCaps
}

function extractTitleFromContent(content: string, code: string): string | null {
  if (!content || content.length < 50) return null

  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Strategy 1: Look for DCI: pattern
  for (const line of lines.slice(0, 20)) {
    const dciMatch = line.match(/DCI\s*:\s*([A-Z][A-Z\s,+\-()]+)/i)
    if (dciMatch && dciMatch[1].length < 80) {
      const title = dciMatch[1].trim()
      if (isDCIValid(title)) {
        return title
      }
    }
  }

  // Strategy 2: Look for protocol header with code
  const codePattern = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const line of lines.slice(0, 30)) {
    const headerMatch = line.match(new RegExp(`cod.*?${codePattern}.*?DCI[:\\s]+([A-Z][^.]+)`, 'i'))
    if (headerMatch && headerMatch[1].length < 80) {
      const title = headerMatch[1].trim()
      if (isDCIValid(title)) {
        return title
      }
    }
  }

  // Strategy 3: Look for drug name pattern (multiple uppercase words ending with UM)
  for (const line of lines.slice(0, 20)) {
    const drugMatch = line.match(/\b([A-Z]{3,}(?:UM|IN|AN|OL|AB|IL)(?:\s*[+]\s*[A-Z]{3,}(?:UM|IN|AN|OL|AB|IL))?)\b/)
    if (drugMatch && drugMatch[1].length < 80) {
      const title = drugMatch[1].trim()
      if (isDCIValid(title)) {
        return title
      }
    }
  }

  return null
}

async function generateFixProposals(): Promise<FixProposal[]> {
  console.log('🔍 Analyzing protocols with sentence fragment titles...\n')

  const allProtocols = await prisma.protocol.findMany({
    select: {
      code: true,
      title: true,
      dci: true,
      rawText: true
    },
    orderBy: { code: 'asc' }
  })

  const proposals: FixProposal[] = []

  for (const protocol of allProtocols) {
    if (!isSentenceFragment(protocol.title)) continue

    let proposedTitle = protocol.title
    let strategy: 'DCI' | 'CONTENT_EXTRACTION' | 'MANUAL_REVIEW' = 'MANUAL_REVIEW'
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
    let reasoning = ''

    // Strategy 1: Use DCI field if valid
    if (isDCIValid(protocol.dci, protocol.title)) {
      proposedTitle = protocol.dci!
      strategy = 'DCI'
      confidence = 'HIGH'
      reasoning = 'DCI field contains valid drug name'
    }
    // Strategy 2: Extract from content
    else {
      const extractedTitle = extractTitleFromContent(protocol.rawText || '', protocol.code)
      if (extractedTitle) {
        proposedTitle = extractedTitle
        strategy = 'CONTENT_EXTRACTION'
        confidence = 'MEDIUM'
        reasoning = 'Extracted valid drug name from content'
      } else {
        strategy = 'MANUAL_REVIEW'
        confidence = 'LOW'
        reasoning = 'No valid DCI or extractable title found. Manual review needed.'
      }
    }

    // Additional validation: skip if proposed title is same as current or too similar
    if (proposedTitle === protocol.title ||
        proposedTitle.length > 150 ||
        proposedTitle.includes('...')) {
      strategy = 'MANUAL_REVIEW'
      confidence = 'LOW'
      reasoning = 'Proposed title invalid or unchanged'
    }

    proposals.push({
      code: protocol.code,
      currentTitle: protocol.title,
      proposedTitle,
      dci: protocol.dci,
      contentLength: protocol.rawText?.length || 0,
      strategy,
      confidence,
      reasoning
    })
  }

  return proposals
}

async function main() {
  console.log('🔧 SENTENCE FRAGMENT TITLE FIX GENERATOR\n')
  console.log('='.repeat(80))

  const proposals = await generateFixProposals()

  // Group by confidence
  const highConfidence = proposals.filter(p => p.confidence === 'HIGH')
  const mediumConfidence = proposals.filter(p => p.confidence === 'MEDIUM')
  const lowConfidence = proposals.filter(p => p.confidence === 'LOW')

  console.log('\n📊 FIX PROPOSAL SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nTotal sentence fragments found: ${proposals.length}`)
  console.log(`  ✅ HIGH confidence fixes: ${highConfidence.length}`)
  console.log(`  ⚠️  MEDIUM confidence fixes: ${mediumConfidence.length}`)
  console.log(`  ❓ LOW confidence (manual review): ${lowConfidence.length}`)

  // Save proposals to file
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const outputPath = path.join(dataDir, 'sentence-fragment-fixes.json')
  fs.writeFileSync(outputPath, JSON.stringify({
    generated: new Date().toISOString(),
    summary: {
      total: proposals.length,
      high: highConfidence.length,
      medium: mediumConfidence.length,
      low: lowConfidence.length
    },
    proposals: {
      highConfidence,
      mediumConfidence,
      lowConfidence
    }
  }, null, 2))

  console.log(`\n💾 Saved fix proposals to: ${outputPath}`)

  // Display HIGH confidence fixes
  console.log('\n\n' + '='.repeat(80))
  console.log('✅ HIGH CONFIDENCE FIXES (Ready to Apply)')
  console.log('='.repeat(80))

  if (highConfidence.length === 0) {
    console.log('\nNo high confidence fixes found.')
  } else {
    highConfidence.forEach((fix, idx) => {
      console.log(`\n${idx + 1}. ${fix.code}`)
      console.log(`   Current:  "${fix.currentTitle.substring(0, 80)}${fix.currentTitle.length > 80 ? '...' : ''}"`)
      console.log(`   Proposed: "${fix.proposedTitle}"`)
      console.log(`   Reason:   ${fix.reasoning}`)
    })
  }

  // Display MEDIUM confidence fixes
  console.log('\n\n' + '='.repeat(80))
  console.log('⚠️  MEDIUM CONFIDENCE FIXES (Review Recommended)')
  console.log('='.repeat(80))

  if (mediumConfidence.length === 0) {
    console.log('\nNo medium confidence fixes found.')
  } else {
    mediumConfidence.slice(0, 15).forEach((fix, idx) => {
      console.log(`\n${idx + 1}. ${fix.code}`)
      console.log(`   Current:  "${fix.currentTitle.substring(0, 80)}${fix.currentTitle.length > 80 ? '...' : ''}"`)
      console.log(`   Proposed: "${fix.proposedTitle}"`)
      console.log(`   Reason:   ${fix.reasoning}`)
    })

    if (mediumConfidence.length > 15) {
      console.log(`\n... and ${mediumConfidence.length - 15} more medium confidence fixes`)
    }
  }

  // Display LOW confidence count
  console.log('\n\n' + '='.repeat(80))
  console.log('❓ LOW CONFIDENCE (Manual Review Required)')
  console.log('='.repeat(80))
  console.log(`\n${lowConfidence.length} protocols require manual review.`)
  console.log('See full details in data/sentence-fragment-fixes.json')

  console.log('\n\n' + '='.repeat(80))
  console.log('✅ ANALYSIS COMPLETE')
  console.log('='.repeat(80))
  console.log('\nNext steps:')
  console.log('1. Review proposals in data/sentence-fragment-fixes.json')
  console.log('2. Run apply-sentence-fragment-fixes.ts to apply HIGH confidence fixes')
  console.log('3. Manually review and curate MEDIUM confidence fixes')
  console.log('4. Investigate LOW confidence protocols individually\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
