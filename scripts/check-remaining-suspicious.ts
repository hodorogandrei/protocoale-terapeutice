import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRemainingSuspicious() {
  const protocols = await prisma.protocol.findMany({
    orderBy: { code: 'asc' },
    select: {
      code: true,
      title: true,
      status: true,
    }
  });

  const suspicious = protocols.filter(p => {
    // Very short titles
    if (p.title.length < 25) return true;

    // Starts with lowercase or punctuation
    if (p.title.match(/^[a-z,\(\)]/)) return true;

    // Multiple protocol codes in title (table row)
    if (p.title.match(/^A\d+[A-Z]\s+A\d+[A-Z]/)) return true;

    // Starts with digit but not a numbered list
    if (p.title.match(/^\d/) && !p.title.match(/^\d+\./)) return true;

    return false;
  });

  console.log(`Remaining suspicious entries: ${suspicious.length}\n`);

  suspicious.slice(0, 40).forEach(p => {
    const titlePreview = p.title.length > 70 ? p.title.substring(0, 67) + '...' : p.title;
    console.log(`  ${p.code.padEnd(15)} [${p.status}]: ${titlePreview}`);
  });

  if (suspicious.length > 40) {
    console.log(`  ... and ${suspicious.length - 40} more`);
  }
}

checkRemainingSuspicious()
  .finally(() => prisma.$disconnect());
