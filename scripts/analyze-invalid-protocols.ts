import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface InvalidProtocol {
  code: string;
  title: string;
  status: string;
  issues: string[];
}

async function analyzeInvalidProtocols() {
  console.log('🔍 Analyzing database for invalid protocol entries...\n');

  const protocols = await prisma.protocol.findMany({
    orderBy: { code: 'asc' },
    select: {
      code: true,
      title: true,
      status: true,
    }
  });

  const invalid: InvalidProtocol[] = [];

  protocols.forEach(p => {
    const issues: string[] = [];

    // Fragment patterns
    if (p.title.match(/^\).*DCI/i)) {
      issues.push('DCI_FRAGMENT');
    }

    if (p.title.match(/^Indica.*ii$/i)) {
      issues.push('SECTION_HEADER');
    }

    if (p.title.match(/^[:\-\•]\s/)) {
      issues.push('STARTS_WITH_PUNCT');
    }

    // Table fragments
    if (p.title.includes('COD PROTOCOL') && p.title.length > 100) {
      issues.push('TABLE_FRAGMENT');
    }

    // Empty code references
    if (p.title.match(/Protocol\s+terapeutic.*cod\s+\(\s*\)/i)) {
      issues.push('EMPTY_CODE_REF');
    }

    // Protocol list entries (multiple protocols in one entry)
    if (p.title.match(/^[A-Z0-9]+[A-Z]\s+[A-Z0-9]+[A-Z]/)) {
      issues.push('PROTOCOL_LIST');
    }

    // Too short without being a drug name
    if (p.title.length < 15 && !p.title.match(/^[A-Z][a-z]+um$/)) {
      issues.push('TOO_SHORT');
    }

    // Starts with lowercase or special chars (corruption)
    if (p.title.match(/^[a-z\(\),]/)) {
      issues.push('CORRUPT_START');
    }

    // Contains multiple protocol codes (table row)
    if ((p.title.match(/[A-Z]\d{3}[A-Z]/g) || []).length > 2) {
      issues.push('MULTI_PROTOCOL');
    }

    if (issues.length > 0) {
      invalid.push({
        code: p.code,
        title: p.title.substring(0, 120),
        status: p.status,
        issues
      });
    }
  });

  console.log(`📊 Analysis complete: Found ${invalid.length} potentially invalid protocols\n`);

  // Group by issue type
  const byIssue: Record<string, InvalidProtocol[]> = {};
  invalid.forEach(p => {
    p.issues.forEach(issue => {
      if (!byIssue[issue]) byIssue[issue] = [];
      byIssue[issue].push(p);
    });
  });

  console.log('📋 Breakdown by issue type:\n');
  Object.entries(byIssue).forEach(([issue, protocols]) => {
    console.log(`${issue}: ${protocols.length} protocols`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 Detailed invalid protocol listings:\n');

  // Show details by category
  for (const [issue, protocols] of Object.entries(byIssue)) {
    console.log(`\n${issue} (${protocols.length} entries):`);
    console.log('-'.repeat(80));
    protocols.slice(0, 20).forEach(p => {
      const titlePreview = p.title.length > 80 ? p.title.substring(0, 77) + '...' : p.title;
      console.log(`  ${p.code} [${p.status}]: ${titlePreview}`);
    });
    if (protocols.length > 20) {
      console.log(`  ... and ${protocols.length - 20} more`);
    }
  }

  // Export for removal script
  console.log('\n' + '='.repeat(80));
  console.log('\n📝 Codes to consider for removal:\n');

  const codesToRemove = invalid
    .filter(p =>
      p.issues.includes('DCI_FRAGMENT') ||
      p.issues.includes('SECTION_HEADER') ||
      p.issues.includes('TABLE_FRAGMENT') ||
      p.issues.includes('EMPTY_CODE_REF') ||
      (p.issues.includes('TOO_SHORT') && p.title.length < 10) ||
      p.issues.includes('CORRUPT_START')
    )
    .map(p => p.code);

  console.log(`High confidence removals: ${codesToRemove.length} protocols`);
  console.log(JSON.stringify(codesToRemove, null, 2));

  return invalid;
}

analyzeInvalidProtocols()
  .then(() => {
    console.log('\n✨ Analysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
