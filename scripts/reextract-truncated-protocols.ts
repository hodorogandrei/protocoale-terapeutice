import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import pdf from 'pdf-parse'
import { extractTitleFromRawText } from '../lib/title-validator'

const prisma = new PrismaClient()

interface FixPlan {
  actions: Array<{
    code: string
    currentTitle: string
    action: string
    reasoning: string
  }>
}

async function extractPdfText(pdfPath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(pdfPath)
    const data = await pdf(dataBuffer)
    return data.text
  } catch (error) {
    console.error(`Failed to extract PDF: ${error}`)
    return ''
  }
}

async function reextractTruncatedProtocols() {
  console.log('📖 Loading truncated protocols list...\n')

  const fixPlanPath = path.join(process.cwd(), 'data', 'fix-plan.json')
  const fixPlan: FixPlan = JSON.parse(fs.readFileSync(fixPlanPath, 'utf-8'))

  const truncatedProtocols = fixPlan.actions.filter(f => f.action === 'EXTRACT_FROM_PDF')

  console.log('='.repeat(80))
  console.log('📄 RE-EXTRACTING TRUNCATED PROTOCOLS')
  console.log('='.repeat(80))
  console.log(`\nFound ${truncatedProtocols.length} truncated protocols\n`)

  let successCount = 0
  let failedCount = 0
  let skippedCount = 0

  for (const item of truncatedProtocols) {
    console.log(`\n🔍 Processing ${item.code}...`)

    try {
      // Get protocol from database
      const protocol = await prisma.protocol.findUnique({
        where: { code: item.code },
        select: {
          code: true,
          title: true,
          rawText: true,
          storedPdfUrl: true,
          officialPdfUrl: true,
          officialPdfPage: true
        }
      })

      if (!protocol) {
        console.log(`   ⚠️  Not found in database`)
        skippedCount++
        continue
      }

      // Determine PDF path
      let pdfPath: string | null = null

      if (protocol.storedPdfUrl) {
        // Individual PDF
        const filename = path.basename(protocol.storedPdfUrl)
        pdfPath = path.join(process.cwd(), 'data', 'pdfs', 'individual', filename)

        if (!fs.existsSync(pdfPath)) {
          console.log(`   ⚠️  Individual PDF not found: ${pdfPath}`)
          pdfPath = null
        }
      }

      if (!pdfPath && protocol.officialPdfUrl) {
        // Official PDF
        const filename = path.basename(protocol.officialPdfUrl)
        pdfPath = path.join(process.cwd(), 'data', 'pdfs', filename)

        if (!fs.existsSync(pdfPath)) {
          console.log(`   ⚠️  Official PDF not found: ${pdfPath}`)
          pdfPath = null
        }
      }

      if (!pdfPath) {
        console.log(`   ❌ No PDF available for re-extraction`)
        failedCount++
        continue
      }

      // Extract text from PDF
      console.log(`   📄 Extracting from: ${path.basename(pdfPath)}`)
      const extractedText = await extractPdfText(pdfPath)

      if (!extractedText || extractedText.length < 100) {
        console.log(`   ❌ Extraction failed or too short (${extractedText.length} chars)`)
        failedCount++
        continue
      }

      // Try to extract better title
      const newTitle = extractTitleFromRawText(extractedText, protocol.code)

      // Update database
      const updateData: any = {
        rawText: extractedText,
        htmlContent: `<div class="protocol-content"><pre>${extractedText}</pre></div>`
      }

      if (newTitle && newTitle !== protocol.title && newTitle.length > 10) {
        updateData.title = newTitle
        console.log(`   📝 Title: "${protocol.title}" → "${newTitle}"`)
      }

      await prisma.protocol.update({
        where: { code: protocol.code },
        data: updateData
      })

      console.log(`   ✅ Successfully re-extracted (${extractedText.length} chars)`)
      successCount++

    } catch (error) {
      console.error(`   ❌ Error: ${error}`)
      failedCount++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 RE-EXTRACTION SUMMARY')
  console.log('='.repeat(80))
  console.log(`\n✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failedCount}`)
  console.log(`⏭️  Skipped: ${skippedCount}`)
  console.log(`\nTotal processed: ${successCount + failedCount + skippedCount}/${truncatedProtocols.length}`)
  console.log('\n' + '='.repeat(80))
}

reextractTruncatedProtocols()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
