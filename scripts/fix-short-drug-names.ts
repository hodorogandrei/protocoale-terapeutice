import { PrismaClient } from '@prisma/client';
import { DRUG_NAME_EXPANSIONS, expandDrugNames, checkForShortNames } from './analyze-short-drug-names';

const prisma = new PrismaClient();

interface UpdatePlan {
  code: string;
  currentTitle: string;
  newTitle: string;
  currentDci?: string | null;
  newDci?: string;
  updateType: 'title-only' | 'dci-only' | 'both' | 'smart-extract';
  confidence: 'high' | 'medium';
  reason: string;
}

/**
 * Intelligently fix short drug names in protocol titles and DCI fields
 *
 * Strategy:
 * 1. Simple short name titles (e.g., "LISPRO") → expand directly
 * 2. Corrupted/fragment titles → try to extract proper title from rawText
 * 3. DCI fields with short names → expand carefully
 */
async function fixShortDrugNames(dryRun = true) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(dryRun ? '🔍 DRY RUN MODE - No changes will be made' : '✏️  LIVE MODE - Applying changes');
  console.log(`${'='.repeat(60)}\n`);

  const protocols = await prisma.protocol.findMany({
    orderBy: { code: 'asc' },
    select: {
      code: true,
      title: true,
      dci: true,
      rawText: true,
    }
  });

  console.log(`📊 Analyzing ${protocols.length} protocols...\n`);

  const updatePlans: UpdatePlan[] = [];

  for (const protocol of protocols) {
    const titleMatch = checkForShortNames(protocol.title);
    const dciMatch = protocol.dci ? checkForShortNames(protocol.dci) : null;

    if (!titleMatch && !dciMatch) continue;

    // Strategy 1: Simple short name title (just the drug name, nothing else)
    if (isSimpleShortName(protocol.title)) {
      const newTitle = expandDrugNames(protocol.title);

      updatePlans.push({
        code: protocol.code,
        currentTitle: protocol.title,
        newTitle,
        currentDci: protocol.dci,
        updateType: 'title-only',
        confidence: 'high',
        reason: 'Simple short name title - safe to expand',
      });
      continue;
    }

    // Strategy 2: Title is a corrupted fragment or content text - try to extract proper title
    if (isTitleCorrupted(protocol.title) || isContentFragment(protocol.title)) {
      const extractedTitle = extractProperTitle(protocol.rawText, protocol.code);

      if (extractedTitle && extractedTitle !== protocol.title) {
        // Apply expansion to the extracted title
        const expandedTitle = expandDrugNames(extractedTitle);

        updatePlans.push({
          code: protocol.code,
          currentTitle: protocol.title,
          newTitle: expandedTitle,
          currentDci: protocol.dci,
          updateType: 'smart-extract',
          confidence: extractedTitle.length > 10 && extractedTitle.length < 200 ? 'high' : 'medium',
          reason: 'Corrupted/fragment title - extracted and expanded from rawText',
        });
        continue;
      }
    }

    // Strategy 3: Title contains short name but appears legitimate - skip medium confidence expansions
    // These need manual review as they may be content fragments that should be extracted instead
    // We only do high-confidence simple replacements above

    // Strategy 4: DCI field needs expansion
    if (dciMatch && protocol.dci) {
      const newDci = expandDrugNames(protocol.dci);

      // Check if DCI is actually corrupted (like "Pagina: 171")
      if (isDciCorrupted(protocol.dci)) {
        const extractedDci = extractProperDci(protocol.rawText, protocol.code);

        if (extractedDci) {
          updatePlans.push({
            code: protocol.code,
            currentTitle: protocol.title,
            newTitle: protocol.title,
            currentDci: protocol.dci,
            newDci: expandDrugNames(extractedDci),
            updateType: 'dci-only',
            confidence: 'medium',
            reason: 'Corrupted DCI - extracted and expanded from rawText',
          });
        }
      } else if (newDci !== protocol.dci) {
        updatePlans.push({
          code: protocol.code,
          currentTitle: protocol.title,
          newTitle: protocol.title,
          currentDci: protocol.dci,
          newDci,
          updateType: 'dci-only',
          confidence: 'high',
          reason: 'DCI contains short name - expanded',
        });
      }
    }
  }

  console.log(`\n✅ Found ${updatePlans.length} protocols to update\n`);

  // Group by confidence
  const highConfidence = updatePlans.filter(p => p.confidence === 'high');
  const mediumConfidence = updatePlans.filter(p => p.confidence === 'medium');

  console.log(`📊 Update plan breakdown:`);
  console.log(`   High confidence:   ${highConfidence.length} protocols`);
  console.log(`   Medium confidence: ${mediumConfidence.length} protocols\n`);

  // Show all updates
  console.log(`\n${'='.repeat(80)}\n`);
  console.log('📋 PLANNED UPDATES:\n');

  for (const plan of updatePlans) {
    console.log(`Code: ${plan.code} [${plan.confidence.toUpperCase()}]`);
    console.log(`  Type: ${plan.updateType}`);
    console.log(`  Reason: ${plan.reason}`);

    if (plan.newTitle !== plan.currentTitle) {
      console.log(`  Title:`);
      console.log(`    Current: ${plan.currentTitle}`);
      console.log(`    New:     ${plan.newTitle}`);
    }

    if (plan.newDci && plan.newDci !== plan.currentDci) {
      console.log(`  DCI:`);
      console.log(`    Current: ${plan.currentDci || '(none)'}`);
      console.log(`    New:     ${plan.newDci}`);
    }

    console.log();
  }

  console.log(`${'='.repeat(80)}\n`);

  // Apply updates if not dry run
  if (!dryRun) {
    console.log('💾 Applying updates to database...\n');

    let successCount = 0;
    let failCount = 0;

    for (const plan of updatePlans) {
      try {
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (plan.newTitle !== plan.currentTitle) {
          updateData.title = plan.newTitle;
        }

        if (plan.newDci && plan.newDci !== plan.currentDci) {
          updateData.dci = plan.newDci;
        }

        await prisma.protocol.update({
          where: { code: plan.code },
          data: updateData,
        });

        console.log(`  ✓ Updated ${plan.code}`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Failed to update ${plan.code}: ${error}`);
        failCount++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed:  ${failCount}`);
  } else {
    console.log('ℹ️  DRY RUN - No changes applied');
    console.log('   Run with --apply flag to apply changes\n');
  }

  return {
    total: updatePlans.length,
    highConfidence: highConfidence.length,
    mediumConfidence: mediumConfidence.length,
    plans: updatePlans,
  };
}

/**
 * Check if title is just a simple short drug name
 */
function isSimpleShortName(title: string): boolean {
  const trimmed = title.trim();

  // Check if it's just a single word from our expansions
  for (const shortName of Object.keys(DRUG_NAME_EXPANSIONS)) {
    if (trimmed.toUpperCase() === shortName.toUpperCase()) {
      return true;
    }
  }

  return false;
}

/**
 * Check if title is a content fragment (sentence from PDF content)
 */
function isContentFragment(title: string): boolean {
  // Indicators of content fragment:
  return (
    title.toLowerCase().startsWith('insulina ') && title.length > 50 || // Romanian "Insulin" followed by description
    title.match(/^[0-9]+\./) !== null || // Numbered list item
    title.match(/\beste\s+un\s+(analog|medicament)/i) !== null || // "is an analog/medication"
    title.match(/\((obţinută prin|constituit)/i) !== null || // Mid-sentence parenthetical
    title.match(/^[A-Z]\d+[A-Z]{2,3}\s+[A-Z]/i) !== null && title.length > 100 // Protocol code followed by long text
  );
}

/**
 * Check if title appears to be corrupted (content fragment)
 */
function isTitleCorrupted(title: string): boolean {
  // Indicators of corrupted title:
  return (
    title.length < 20 || // Very short
    title.toLowerCase().startsWith('insulina ') && title.length > 100 || // Content fragment
    title.match(/poziţiei|corespunz|ă tor pozi/i) !== null || // Table artifacts
    title.match(/^\d+\./) !== null || // Starts with number
    title.match(/\(obţinută prin$/i) !== null // Sentence fragment
  );
}

/**
 * Check if DCI is corrupted
 */
function isDciCorrupted(dci: string): boolean {
  return (
    dci.toLowerCase().includes('pagina') ||
    dci.toLowerCase().includes('table') ||
    dci.match(/^\d+$/) !== null
  );
}

/**
 * Extract proper title from rawText
 */
function extractProperTitle(rawText: string, code: string): string | null {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Strategy 1: Look for "Protocol terapeutic ... cod (CODE): TITLE"
  const protocolMatch = rawText.match(
    new RegExp(`Protocol\\s+terapeutic.*?cod\\s+\\(${code}\\):\\s*(.+?)(?:\\n|$)`, 'i')
  );

  if (protocolMatch && protocolMatch[1].trim().length > 2) {
    const extracted = protocolMatch[1].trim();
    // If it's just "DCI", look at next line
    if (extracted.match(/^DCI\s*$/i)) {
      const nextLineIndex = rawText.indexOf(protocolMatch[0]) + protocolMatch[0].length;
      const nextLine = rawText.substring(nextLineIndex).split('\n')[0]?.trim();
      if (nextLine && nextLine.length > 2 && nextLine.match(/^[A-Z]/)) {
        return nextLine;
      }
    }
    return extracted;
  }

  // Strategy 2: Look for DCI in first few lines after protocol code mention
  const codeIndex = rawText.indexOf(code);
  if (codeIndex !== -1) {
    const afterCode = rawText.substring(codeIndex).split('\n').slice(0, 10);

    for (const line of afterCode) {
      const dciMatch = line.match(/DCI[:\s]*(.+?)$/i);
      if (dciMatch && dciMatch[1].trim().length > 2) {
        return dciMatch[1].trim();
      }

      // Look for lines that are all uppercase drug names
      if (line.match(/^[A-Z][A-Z\s,]+$/) && line.length < 100) {
        return line.trim();
      }
    }
  }

  return null;
}

/**
 * Extract proper DCI from rawText
 */
function extractProperDci(rawText: string, code: string): string | null {
  // Use same logic as extractProperTitle
  return extractProperTitle(rawText, code);
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply');

  fixShortDrugNames(!applyChanges)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { fixShortDrugNames };
