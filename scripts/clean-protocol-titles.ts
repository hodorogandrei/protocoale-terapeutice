/**
 * Clean verbose protocol titles in database
 *
 * Many protocols have titles like:
 * "Protocol terapeutic corespunzător poziţiei nr. 13, cod (): DCI"
 *
 * This should be cleaned to just: "DCI"
 */

import { PrismaClient } from '@prisma/client';
import { extractCleanTitle } from '../lib/text-utils';

const prisma = new PrismaClient();

async function cleanProtocolTitles() {
  console.log('🧹 Starting protocol title cleanup...\n');

  // Get all protocols with their content
  const protocols = await prisma.protocol.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      rawText: true,
    },
  });

  console.log(`Found ${protocols.length} protocols to analyze\n`);

  let cleaned = 0;
  let skipped = 0;
  const examples: Array<{ code: string; before: string; after: string }> = [];

  for (const protocol of protocols) {
    const cleanTitle = extractCleanTitle(protocol.title, protocol.rawText);

    // Only update if title actually changed
    if (cleanTitle !== protocol.title && cleanTitle.length > 0) {
      await prisma.protocol.update({
        where: { id: protocol.id },
        data: { title: cleanTitle },
      });

      cleaned++;

      // Store first 5 examples
      if (examples.length < 5) {
        examples.push({
          code: protocol.code,
          before: protocol.title.substring(0, 80),
          after: cleanTitle.substring(0, 80),
        });
      }

      if (cleaned % 50 === 0) {
        console.log(`Progress: ${cleaned} titles cleaned`);
      }
    } else {
      skipped++;
    }
  }

  console.log('\n✅ Title cleanup complete!\n');
  console.log('Statistics:');
  console.log(`  Total protocols analyzed: ${protocols.length}`);
  console.log(`  Titles cleaned: ${cleaned}`);
  console.log(`  Skipped (already clean): ${skipped}`);

  if (examples.length > 0) {
    console.log('\n📋 Examples of cleaned titles:');
    examples.forEach((ex) => {
      console.log(`\n  ${ex.code}:`);
      console.log(`    Before: ${ex.before}${ex.before.length >= 80 ? '...' : ''}`);
      console.log(`    After:  ${ex.after}${ex.after.length >= 80 ? '...' : ''}`);
    });
  }
}

// Execute
cleanProtocolTitles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
