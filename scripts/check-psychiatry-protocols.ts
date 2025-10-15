import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPsychiatryProtocols() {
  const protocols = await prisma.protocol.findMany({
    where: {
      specialtyCode: { contains: 'Psihiatrie' }
    },
    select: {
      code: true,
      title: true,
      rawText: true,
      htmlContent: true
    },
    orderBy: { code: 'asc' }
  });

  console.log('Total psychiatry protocols:', protocols.length);
  console.log('\nProtocols with issues:\n');

  let issueCount = 0;

  for (const p of protocols) {
    const issues: string[] = [];

    if (p.title.includes('()')) {
      issues.push('empty_code_in_title');
    }
    if (p.title.includes('ă tor') || p.title.includes('pozi ţ iei')) {
      issues.push('corrupted_unicode');
    }
    if (p.title.length < 10) {
      issues.push('title_too_short');
    }
    if (p.rawText === null || p.rawText === undefined) {
      issues.push('no_content');
    } else if (p.rawText.length < 500) {
      issues.push('very_short_content');
    }

    if (issues.length > 0) {
      issueCount++;
      console.log(`${p.code}: ${issues.join(', ')}`);
      console.log(`  Title: ${p.title.substring(0, 100)}`);
      console.log(`  Content length: ${p.rawText?.length || 0}`);
      console.log('');
    }
  }

  console.log(`\nTotal protocols with issues: ${issueCount}/${protocols.length}`);
}

checkPsychiatryProtocols()
  .finally(() => prisma.$disconnect());
