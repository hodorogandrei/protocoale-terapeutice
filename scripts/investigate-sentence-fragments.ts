import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateSentenceFragments() {
  console.log('🔍 Investigating sentence fragment titles...\n')

  // First, check the specific examples
  const examples = ['R03AC13', 'R03BB06']

  console.log('='.repeat(80))
  console.log('📋 SPECIFIC EXAMPLES')
  console.log('='.repeat(80))

  for (const code of examples) {
    const protocol = await prisma.protocol.findUnique({
      where: { code },
      select: {
        code: true,
        title: true,
        dci: true,
        rawText: true,
        storedPdfUrl: true,
        officialPdfUrl: true
      }
    })

    if (protocol) {
      console.log(`\n${code}:`)
      console.log(`  Title: "${protocol.title}"`)
      console.log(`  DCI: "${protocol.dci || 'none'}"`)
      console.log(`  Content length: ${protocol.rawText?.length || 0} chars`)
      console.log(`  PDF: ${protocol.storedPdfUrl || protocol.officialPdfUrl || 'none'}`)
      console.log(`  Content preview:`)
      console.log(`  ${protocol.rawText?.substring(0, 300) || 'none'}...`)
    } else {
      console.log(`\n${code}: Not found`)
    }
  }

  // Now find all protocols with sentence fragment patterns
  console.log('\n\n' + '='.repeat(80))
  console.log('🔎 FINDING ALL SENTENCE FRAGMENT TITLES')
  console.log('='.repeat(80))

  const allProtocols = await prisma.protocol.findMany({
    select: {
      code: true,
      title: true,
      dci: true,
      rawText: true
    },
    orderBy: { code: 'asc' }
  })

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

  const sentenceFragments: Array<{code: string; title: string; pattern: string; dci: string | null; contentLength: number}> = []

  for (const protocol of allProtocols) {
    for (const pattern of sentenceFragmentPatterns) {
      if (pattern.test(protocol.title)) {
        sentenceFragments.push({
          code: protocol.code,
          title: protocol.title,
          pattern: pattern.toString(),
          dci: protocol.dci,
          contentLength: protocol.rawText?.length || 0
        })
        break  // Only count once per protocol
      }
    }
  }

  console.log(`\nFound ${sentenceFragments.length} protocols with sentence fragment titles\n`)

  // Group by pattern for analysis
  const byPattern = new Map<string, typeof sentenceFragments>()
  sentenceFragments.forEach(f => {
    if (!byPattern.has(f.pattern)) {
      byPattern.set(f.pattern, [])
    }
    byPattern.get(f.pattern)!.push(f)
  })

  console.log('GROUPED BY PATTERN:\n')
  Array.from(byPattern.entries()).forEach(([pattern, items]) => {
    console.log(`${pattern}: ${items.length} protocols`)
    items.slice(0, 5).forEach(item => {
      console.log(`  ${item.code}: "${item.title.substring(0, 80)}${item.title.length > 80 ? '...' : ''}"`)
    })
    if (items.length > 5) {
      console.log(`  ... and ${items.length - 5} more`)
    }
    console.log('')
  })

  // Show protocols with good DCI fields
  console.log('='.repeat(80))
  console.log('💡 PROTOCOLS WITH USABLE DCI FIELDS')
  console.log('='.repeat(80))

  const withGoodDCI = sentenceFragments.filter(f =>
    f.dci &&
    f.dci.length > 5 &&
    f.dci.length < 100 &&
    !f.dci.includes('Informații') &&
    !f.dci.includes('Pagina') &&
    /^[A-Z]/.test(f.dci)
  )

  console.log(`\n${withGoodDCI.length} protocols have usable DCI fields:\n`)
  withGoodDCI.slice(0, 20).forEach(f => {
    console.log(`${f.code}:`)
    console.log(`  Current: "${f.title.substring(0, 60)}${f.title.length > 60 ? '...' : ''}"`)
    console.log(`  DCI: "${f.dci}"`)
    console.log('')
  })

  if (withGoodDCI.length > 20) {
    console.log(`... and ${withGoodDCI.length - 20} more\n`)
  }

  console.log('='.repeat(80))
  console.log('✅ INVESTIGATION COMPLETE')
  console.log('='.repeat(80))
}

investigateSentenceFragments()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
