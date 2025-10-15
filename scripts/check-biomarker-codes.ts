import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBiomarkerCodes() {
  const biomarkerCodes = [
    'CD19', 'CD20', 'CD26', 'CD46', 'CD55', 'CD56', 'CD117', 'CD157',
    'IL17', 'IL17RA', 'IL23',
    'CA125', 'P450', 'PC20', 'AP50',
    'B12', 'B19', 'B27', 'E420'
  ];

  const results = await Promise.all(
    biomarkerCodes.map(code =>
      prisma.protocol.findUnique({
        where: { code },
        select: {
          code: true,
          title: true,
          rawText: true,
          status: true
        }
      })
    )
  );

  const found = results.filter(p => p !== null);
  console.log(`Found ${found.length} biomarker-like codes:\n`);

  found.forEach(p => {
    if (p) {
      console.log(`${p.code} [${p.status}]: ${p.title.substring(0, 60)}`);
      console.log(`  Content length: ${p.rawText?.length || 0} chars`);
      console.log(`  First 150 chars: ${p.rawText?.substring(0, 150)}`);
      console.log();
    }
  });

  // Determine which should be removed
  const toRemove = found.filter(p => {
    if (!p) return false;
    const contentLength = p.rawText?.length || 0;

    // Remove if very short content (likely fragment)
    if (contentLength < 500) return true;

    // Check if content is just a fragment
    const firstLine = p.rawText?.split('\n')[0] || '';
    if (firstLine.length < 50) return true;

    return false;
  });

  console.log(`\nBiomarker codes to remove: ${toRemove.length}`);
  toRemove.forEach(p => {
    if (p) console.log(`  - ${p.code}: ${p.title.substring(0, 50)}`);
  });
}

checkBiomarkerCodes()
  .finally(() => prisma.$disconnect());
