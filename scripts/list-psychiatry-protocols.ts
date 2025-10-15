import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listPsychiatryProtocols() {
  const protocols = await prisma.protocol.findMany({
    where: {
      specialtyCode: { contains: 'Psihiatrie' }
    },
    select: {
      code: true,
      title: true,
      rawText: true
    },
    orderBy: { code: 'asc' }
  });

  console.log('\n✅ ALL PSYCHIATRY PROTOCOLS:\n');

  for (const p of protocols) {
    const hasIssue = p.rawText === null || p.rawText.length < 100;
    const status = hasIssue ? ' ⚠️' : ' ✓';
    console.log(`${p.code}: ${p.title} (${p.rawText?.length || 0} chars)${status}`);
  }

  console.log(`\nTotal: ${protocols.length} protocols`);
}

listPsychiatryProtocols()
  .finally(() => prisma.$disconnect());
