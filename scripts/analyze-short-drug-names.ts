import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Comprehensive mapping of short drug names to full pharmaceutical names
 * Focused on insulin types and other commonly abbreviated substances
 */
const DRUG_NAME_EXPANSIONS: Record<string, string> = {
  // Insulin types
  'LISPRO': 'INSULINUM LISPRO',
  'GLULIZINA': 'INSULINUM GLULISINUM',
  'GLULISINUM': 'INSULINUM GLULISINUM',
  'ASPART': 'INSULINUM ASPART',
  'DETEMIR': 'INSULINUM DETEMIR',
  'GLARGINUM': 'INSULINUM GLARGINE',
  'GLARGINE': 'INSULINUM GLARGINE',
  'DEGLUDECUM': 'INSULINUM DEGLUDECUM',
  'DEGLUDEC': 'INSULINUM DEGLUDECUM',

  // Other common abbreviations
  'FILGRASTIMUM': 'FILGRASTIMUM',
  'PEGFILGRASTIMUM': 'PEGFILGRASTIMUM',
  'LENOGRASTIMUM': 'LENOGRASTIMUM',

  // Add more as needed
};

/**
 * Patterns to detect short drug names that need expansion
 */
const SHORT_NAME_PATTERNS = [
  /\b(LISPRO|GLULIZINA|GLULISINUM|ASPART|DETEMIR|GLARGINUM|GLARGINE|DEGLUDECUM|DEGLUDEC)\b/i,
];

interface ProtocolWithShortName {
  code: string;
  title: string;
  dci?: string | null;
  suggestedTitle?: string;
  suggestedDci?: string;
  matchedPattern: string;
  confidence: 'high' | 'medium' | 'low';
}

async function analyzeShortDrugNames() {
  console.log('🔍 Analyzing protocols for short drug names...\n');

  const protocols = await prisma.protocol.findMany({
    orderBy: { code: 'asc' },
    select: {
      code: true,
      title: true,
      dci: true,
      rawText: true,
    }
  });

  console.log(`📊 Total protocols in database: ${protocols.length}\n`);

  const protocolsNeedingExpansion: ProtocolWithShortName[] = [];

  for (const protocol of protocols) {
    // Check if title or DCI contains short drug names
    const titleMatch = checkForShortNames(protocol.title);
    const dciMatch = protocol.dci ? checkForShortNames(protocol.dci) : null;

    if (titleMatch || dciMatch) {
      const suggestedTitle = titleMatch ? expandDrugNames(protocol.title) : protocol.title;
      const suggestedDci = dciMatch && protocol.dci ? expandDrugNames(protocol.dci) : protocol.dci;

      // Determine confidence based on match quality
      let confidence: 'high' | 'medium' | 'low' = 'high';
      if (suggestedTitle === protocol.title && suggestedDci === protocol.dci) {
        confidence = 'low'; // No changes suggested
      } else if (suggestedTitle.length < 10) {
        confidence = 'medium'; // Very short title might need manual review
      }

      protocolsNeedingExpansion.push({
        code: protocol.code,
        title: protocol.title,
        dci: protocol.dci,
        suggestedTitle: suggestedTitle !== protocol.title ? suggestedTitle : undefined,
        suggestedDci: suggestedDci !== protocol.dci ? (suggestedDci || undefined) : undefined,
        matchedPattern: titleMatch || dciMatch || 'unknown',
        confidence,
      });
    }
  }

  console.log(`\n✅ Found ${protocolsNeedingExpansion.length} protocols with short drug names\n`);

  // Group by confidence
  const byConfidence = {
    high: protocolsNeedingExpansion.filter(p => p.confidence === 'high'),
    medium: protocolsNeedingExpansion.filter(p => p.confidence === 'medium'),
    low: protocolsNeedingExpansion.filter(p => p.confidence === 'low'),
  };

  console.log('📊 Breakdown by confidence:');
  console.log(`   High:   ${byConfidence.high.length} protocols`);
  console.log(`   Medium: ${byConfidence.medium.length} protocols`);
  console.log(`   Low:    ${byConfidence.low.length} protocols\n`);

  // Show examples from each category
  console.log('📋 Sample protocols needing expansion:\n');

  const samplesToShow = [
    ...byConfidence.high.slice(0, 15),
    ...byConfidence.medium.slice(0, 5),
  ];

  for (const protocol of samplesToShow) {
    console.log(`Code: ${protocol.code}`);
    console.log(`  Current title: ${protocol.title}`);
    if (protocol.suggestedTitle) {
      console.log(`  Suggested title: ${protocol.suggestedTitle}`);
    }
    if (protocol.dci) {
      console.log(`  Current DCI: ${protocol.dci}`);
    }
    if (protocol.suggestedDci) {
      console.log(`  Suggested DCI: ${protocol.suggestedDci}`);
    }
    console.log(`  Confidence: ${protocol.confidence}`);
    console.log(`  Pattern: ${protocol.matchedPattern}`);
    console.log();
  }

  // Generate statistics
  console.log('\n📈 Statistics:');
  const shortNameCounts: Record<string, number> = {};

  for (const protocol of protocolsNeedingExpansion) {
    for (const [shortName] of Object.entries(DRUG_NAME_EXPANSIONS)) {
      if (protocol.title.includes(shortName) || protocol.dci?.includes(shortName)) {
        shortNameCounts[shortName] = (shortNameCounts[shortName] || 0) + 1;
      }
    }
  }

  console.log('\nMost common short names:');
  Object.entries(shortNameCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`  ${name}: ${count} occurrences → ${DRUG_NAME_EXPANSIONS[name]}`);
    });

  return protocolsNeedingExpansion;
}

/**
 * Check if text contains short drug names
 */
function checkForShortNames(text: string): string | null {
  for (const pattern of SHORT_NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1]; // Return the matched short name
    }
  }
  return null;
}

/**
 * Expand short drug names in text to full pharmaceutical names
 * Handles case-insensitive matching and avoids double replacements
 */
function expandDrugNames(text: string): string {
  let result = text;

  for (const [shortName, fullName] of Object.entries(DRUG_NAME_EXPANSIONS)) {
    // Create regex that matches the short name but NOT when preceded by INSULINUM
    // Negative lookbehind to avoid matching "INSULINUM LISPRO"
    const regex = new RegExp(
      `(?<!INSULINUM\\s)(?<!Insulinum\\s)(?<!insulinum\\s)\\b(${shortName})\\b`,
      'gi'
    );

    // Replace while preserving original case context where possible
    result = result.replace(regex, (match, capturedGroup) => {
      // If the match is all uppercase, return all uppercase
      if (match === match.toUpperCase()) {
        return fullName.toUpperCase();
      }
      // If the match starts with uppercase, return title case
      if (match[0] === match[0].toUpperCase()) {
        return fullName.charAt(0).toUpperCase() + fullName.slice(1).toLowerCase();
      }
      // Otherwise return lowercase
      return fullName.toLowerCase();
    });
  }

  return result;
}

/**
 * Export the expansion mapping for use in other scripts
 */
export { DRUG_NAME_EXPANSIONS, expandDrugNames, checkForShortNames };

// Run analysis if called directly
if (require.main === module) {
  analyzeShortDrugNames()
    .then(() => {
      console.log('\n✅ Analysis complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
