import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CODES_TO_CHECK = ['NG01G', 'N030C', 'N025G', 'N06BX13', 'N002F', 'N015F', 'N016F', 'N02CD02'];

async function checkSpecificProtocols() {
  console.log('🔍 Checking specific protocols...\n');

  for (const code of CODES_TO_CHECK) {
    const protocol = await prisma.protocol.findUnique({
      where: { code },
      select: {
        code: true,
        title: true,
        dci: true,
        rawText: true,
        specialtyCode: true,
        storedPdfUrl: true
      }
    });

    if (!protocol) {
      console.log(`❌ ${code}: NOT FOUND IN DATABASE\n`);
      continue;
    }

    console.log(`${'='.repeat(80)}`);
    console.log(`Code: ${protocol.code}`);
    console.log(`Title: ${protocol.title}`);
    console.log(`DCI: ${protocol.dci || 'N/A'}`);
    console.log(`Specialty: ${protocol.specialtyCode || 'N/A'}`);
    console.log(`Content length: ${protocol.rawText?.length || 0} chars`);
    console.log(`Source PDF: ${protocol.storedPdfUrl}`);

    // Check for issues
    const issues: string[] = [];

    if (protocol.title.includes('()')) {
      issues.push('empty_code_in_title');
    }
    if (protocol.title.includes('ă tor') || protocol.title.includes('pozi ţ iei')) {
      issues.push('corrupted_unicode');
    }
    if (protocol.title.length < 10) {
      issues.push('title_too_short');
    }
    if (protocol.title.includes('Protocol terapeutic')) {
      issues.push('generic_title');
    }
    if (protocol.title.includes('Nota:')) {
      issues.push('note_as_title');
    }
    if (!protocol.rawText || protocol.rawText.length < 100) {
      issues.push('no_or_minimal_content');
    }

    if (issues.length > 0) {
      console.log(`⚠️  Issues: ${issues.join(', ')}`);
    } else {
      console.log(`✓ No obvious issues detected`);
    }

    console.log(`\nFirst 150 chars of content:`);
    console.log(protocol.rawText?.substring(0, 150) || 'NO CONTENT');
    console.log(`${'='.repeat(80)}\n`);
  }
}

checkSpecificProtocols()
  .finally(() => prisma.$disconnect());
