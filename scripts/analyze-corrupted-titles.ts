import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCorruptedTitles() {
  const protocols = await prisma.protocol.findMany({
    orderBy: { code: 'asc' },
    select: {
      code: true,
      title: true,
      rawText: true,
    }
  });

  const suspicious = protocols.filter(p => {
    if (p.title.length < 25) return true;
    if (p.title.match(/^[a-z,\(\)]/)) return true;
    if (p.title.match(/^A\d+[A-Z]\s+A\d+[A-Z]/)) return true;
    if (p.title.match(/^\d/) && !p.title.match(/^\d+\./)) return true;
    return false;
  });

  console.log(`Found ${suspicious.length} protocols with corrupted titles\n`);

  const analysis = suspicious.slice(0, 50).map(p => {
    const lines = (p.rawText || '').split('\n').filter(l => l.trim());
    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    const thirdLine = lines[2] || '';

    // Try to find the actual title in the raw text
    let potentialTitle = '';

    // Look for patterns like "Protocol terapeutic ... cod (CODE): TITLE"
    const protocolMatch = p.rawText?.match(/Protocol\s+terapeutic.*?cod\s+\([^)]*\):\s*([^\n]+)/i);
    if (protocolMatch) {
      potentialTitle = protocolMatch[1].trim();
    }

    // Look for drug names in uppercase (ending with UM)
    if (!potentialTitle) {
      const drugMatch = p.rawText?.match(/\b([A-Z][A-Z]+UM)\b/);
      if (drugMatch) {
        potentialTitle = drugMatch[1];
      }
    }

    // Look for section headers that might be titles
    if (!potentialTitle && firstLine.length < 100 && firstLine.length > 10) {
      potentialTitle = firstLine;
    }

    return {
      code: p.code,
      currentTitle: p.title,
      potentialTitle: potentialTitle || firstLine.substring(0, 100),
      firstLine: firstLine.substring(0, 100),
      secondLine: secondLine.substring(0, 100),
      thirdLine: thirdLine.substring(0, 100)
    };
  });

  console.log('Sample of corrupted protocols:\n');
  analysis.forEach(a => {
    console.log(`Code: ${a.code}`);
    console.log(`  Current: ${a.currentTitle}`);
    console.log(`  Potential: ${a.potentialTitle}`);
    console.log(`  First line: ${a.firstLine}`);
    console.log();
  });

  // Identify patterns
  const patterns = {
    startsLowercase: suspicious.filter(p => p.title.match(/^[a-z]/)).length,
    startsWithPunct: suspicious.filter(p => p.title.match(/^[,\(\)\-•]/)).length,
    tooShort: suspicious.filter(p => p.title.length < 15).length,
    tableRow: suspicious.filter(p => p.title.match(/^[A-Z]\d+[A-Z]\s+[A-Z]\d+[A-Z]/)).length,
    drugNameOnly: suspicious.filter(p => p.title.match(/^[A-Z]+UM$/)).length,
    fragmentOnly: suspicious.filter(p => p.title.length < 50 && !p.title.match(/Protocol|terapeutic/i)).length
  };

  console.log('\nPattern analysis:');
  console.log(JSON.stringify(patterns, null, 2));
}

analyzeCorruptedTitles()
  .finally(() => prisma.$disconnect());
