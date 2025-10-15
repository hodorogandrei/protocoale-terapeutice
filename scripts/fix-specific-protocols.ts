/**
 * Fix Specific Protocols with Title/Content Issues
 *
 * Manually fixes protocols that have corrupted titles or incorrect extraction
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProtocolFix {
  code: string;
  title: string;
  dci?: string;
  reason: string;
}

const FIXES: ProtocolFix[] = [
  {
    code: 'NG01G',
    title: 'TERAPIA MEDICAMENTOASĂ CRONICĂ A EPILEPSIEI',
    dci: undefined,
    reason: 'Title had "):" prefix from table parsing error'
  },
  {
    code: 'N030C',
    title: 'DUREREA CRONICĂ DIN CANCER',
    dci: undefined,
    reason: 'Had generic "Protocol terapeutic..." title instead of actual protocol name'
  },
  {
    code: 'N025G',
    title: 'DUREREA NEUROPATĂ',
    dci: undefined,
    reason: 'Title had "):" prefix from table parsing error'
  },
  {
    code: 'N06BX13',
    title: 'IDEBENONUM',
    dci: 'IDEBENONUM',
    reason: 'Title was cut off/incomplete, showing indication text instead of DCI name'
  },
  {
    code: 'N002F',
    title: 'MILNACIPRANUM',
    dci: 'MILNACIPRANUM',
    reason: 'Title was subtitle "Forme farmaceutice cu administrare orală" instead of DCI'
  },
  {
    code: 'N02CD02',
    title: 'GALCANEZUMABUM',
    dci: 'GALCANEZUMABUM',
    reason: 'Title contaminated with table data and notes from list PDF'
  }
];

async function fixSpecificProtocols() {
  console.log('🔧 Fixing specific protocols with title/content issues...\n');

  let fixed = 0;
  let skipped = 0;

  for (const fix of FIXES) {
    try {
      const existing = await prisma.protocol.findUnique({
        where: { code: fix.code },
        select: { code: true, title: true, dci: true }
      });

      if (!existing) {
        console.log(`❌ ${fix.code}: Not found in database`);
        skipped++;
        continue;
      }

      console.log(`\n📝 ${fix.code}:`);
      console.log(`   Old title: ${existing.title}`);
      console.log(`   New title: ${fix.title}`);
      console.log(`   Reason: ${fix.reason}`);

      const updateData: any = {
        title: fix.title,
        updatedAt: new Date()
      };

      if (fix.dci !== undefined) {
        updateData.dci = fix.dci;
        console.log(`   DCI: ${fix.dci}`);
      }

      await prisma.protocol.update({
        where: { code: fix.code },
        data: updateData
      });

      console.log(`   ✓ Updated`);
      fixed++;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`   ✗ Error updating ${fix.code}: ${errorMsg}`);
      skipped++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 Summary: ${fixed} fixed, ${skipped} skipped`);

  // Check N015F separately - it's a special case
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 Checking N015F (table header mess)...\n');

  const n015f = await prisma.protocol.findUnique({
    where: { code: 'N015F' },
    select: { code: true, title: true, rawText: true, storedPdfUrl: true }
  });

  if (n015f) {
    console.log(`Current title length: ${n015f.title.length} chars`);
    console.log(`Content length: ${n015f.rawText?.length || 0} chars`);
    console.log(`Source: ${n015f.storedPdfUrl}`);

    if (n015f.title.includes('COD PROTOCOL')) {
      console.log(`\n⚠️  N015F appears to be extracted from a table of contents/list PDF`);
      console.log(`   This is not an actual protocol - it's table metadata`);
      console.log(`   Recommendation: Delete this entry or mark as invalid`);
    }
  } else {
    console.log('❌ N015F not found in database');
  }

  // Check N016F - user mentioned it but it looks OK
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 Checking N016F...\n');

  const n016f = await prisma.protocol.findUnique({
    where: { code: 'N016F' },
    select: { code: true, title: true, dci: true, rawText: true }
  });

  if (n016f) {
    console.log(`Title: ${n016f.title}`);
    console.log(`DCI: ${n016f.dci || 'N/A'}`);
    console.log(`Content: ${n016f.rawText?.length || 0} chars`);

    if (n016f.title === 'Antipsihotice de generaţia a 2-a' && n016f.dci === 'CLOZAPINUM') {
      console.log(`✓ N016F looks correct - title is the class, DCI is CLOZAPINUM`);
    } else {
      console.log(`⚠️  N016F may need review`);
    }
  }
}

fixSpecificProtocols()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
