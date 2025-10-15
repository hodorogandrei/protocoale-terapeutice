/**
 * Generate medical specialties from protocol content and ATC codes
 *
 * This script analyzes protocol content, titles, DCI names, and ATC classification
 * to extract and assign appropriate medical specialties to each protocol.
 *
 * Strategy:
 * 1. ATC code mapping (first letter indicates anatomical/therapeutic category)
 * 2. Content analysis for specialty-specific keywords
 * 3. Title and DCI analysis for disease/drug patterns
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ATC Classification System (Level 1 - Anatomical main group)
// Reference: https://www.whocc.no/atc/structure_and_principles/
const ATC_TO_SPECIALTY: Record<string, string[]> = {
  'A': ['Gastroenterologie', 'Endocrinologie'], // Alimentary tract and metabolism
  'B': ['Hematologie'], // Blood and blood forming organs
  'C': ['Cardiologie'], // Cardiovascular system
  'D': ['Dermatologie'], // Dermatologicals
  'G': ['Ginecologie', 'Urologie'], // Genito-urinary system and sex hormones
  'H': ['Endocrinologie'], // Systemic hormonal preparations
  'J': ['Boli Infecțioase', 'Imunologie'], // Anti-infectives for systemic use
  'L': ['Oncologie', 'Imunologie'], // Antineoplastic and immunomodulating agents
  'M': ['Reumatologie', 'Ortopedice'], // Musculo-skeletal system
  'N': ['Neurologie', 'Psihiatrie'], // Nervous system
  'P': ['Parazitologie'], // Antiparasitic products
  'R': ['Pneumologie'], // Respiratory system
  'S': ['Oftalmologie', 'ORL'], // Sensory organs
  'V': ['Diverse'], // Various
};

// More specific ATC L3 code mappings
const SPECIFIC_ATC_MAPPINGS: Record<string, string[]> = {
  'L01': ['Oncologie'], // Antineoplastic agents
  'L02': ['Oncologie', 'Endocrinologie'], // Endocrine therapy
  'L03': ['Imunologie', 'Hematologie'], // Immunostimulants
  'L04': ['Imunologie', 'Reumatologie'], // Immunosuppressants
  'A10': ['Endocrinologie'], // Drugs used in diabetes
  'B01': ['Hematologie', 'Cardiologie'], // Antithrombotic agents
  'B02': ['Hematologie'], // Antihemorrhagics
  'B03': ['Hematologie'], // Antianemic preparations
  'C09': ['Cardiologie', 'Nefrologie'], // Agents acting on renin-angiotensin system
  'C10': ['Cardiologie', 'Endocrinologie'], // Lipid modifying agents
  'G03': ['Ginecologie', 'Endocrinologie'], // Sex hormones
  'H01': ['Endocrinologie'], // Pituitary and hypothalamic hormones
  'H02': ['Endocrinologie', 'Reumatologie'], // Corticosteroids
  'H03': ['Endocrinologie'], // Thyroid therapy
  'H04': ['Endocrinologie'], // Pancreatic hormones
  'H05': ['Endocrinologie', 'Nefrologie'], // Calcium homeostasis
  'J01': ['Boli Infecțioase'], // Antibacterials
  'J02': ['Boli Infecțioase'], // Antimycotics
  'J04': ['Pneumologie', 'Boli Infecțioase'], // Antimycobacterials (TB)
  'J05': ['Boli Infecțioase', 'Gastroenterologie'], // Antivirals
  'J06': ['Imunologie'], // Immune sera and immunoglobulins
  'J07': ['Imunologie', 'Pediatrie'], // Vaccines
  'M05': ['Reumatologie', 'Endocrinologie'], // Drugs for bone diseases
  'M09': ['Reumatologie'], // Other drugs for musculo-skeletal disorders
  'N02': ['Neurologie', 'Anestezie'], // Analgesics
  'N03': ['Neurologie'], // Antiepileptics
  'N04': ['Neurologie'], // Anti-parkinson drugs
  'N05': ['Psihiatrie'], // Psycholeptics
  'N06': ['Psihiatrie'], // Psychoanaleptics
  'N07': ['Neurologie', 'Psihiatrie'], // Other nervous system drugs
  'R03': ['Pneumologie'], // Drugs for obstructive airway diseases
  'S01': ['Oftalmologie'], // Ophthalmologicals
};

// Content-based specialty detection patterns
interface SpecialtyPattern {
  specialty: string;
  keywords: string[];
  weight: number; // Higher weight = stronger indicator
}

const CONTENT_PATTERNS: SpecialtyPattern[] = [
  // Oncology
  { specialty: 'Oncologie', keywords: ['cancer', 'tumora', 'tumoare', 'neoplaz', 'chimioterapie', 'radioterapie', 'metastaz', 'carcinoma', 'limfom', 'leucemie', 'melanom', 'sarcom'], weight: 3 },

  // Cardiology
  { specialty: 'Cardiologie', keywords: ['cardiac', 'inimă', 'coronar', 'aterosclero', 'hipertensiune', 'aritmie', 'insuficienta cardiaca', 'infarct', 'angină', 'fibrilatie', 'valvular'], weight: 3 },

  // Neurology
  { specialty: 'Neurologie', keywords: ['cerebral', 'neuronal', 'epilepsie', 'parkinson', 'scleroză multiplă', 'accident vascular', 'neuropatie', 'meningită', 'encefalit', 'migren', 'convulsi'], weight: 3 },

  // Rheumatology
  { specialty: 'Reumatologie', keywords: ['artrita', 'articular', 'reumatoid', 'spondilit', 'lupus', 'artroză', 'gută', 'sindrom Sjögren', 'sclerodermie', 'sinovit'], weight: 3 },

  // Endocrinology
  { specialty: 'Endocrinologie', keywords: ['diabet', 'hormonal', 'tiroidă', 'hipofiz', 'glucoz', 'insulină', 'hipoglicemie', 'hiperglicemie', 'tireotoxicoză', 'hipotiroidism', 'acromegalie'], weight: 3 },

  // Gastroenterology
  { specialty: 'Gastroenterologie', keywords: ['hepatic', 'intestinal', 'gastric', 'ciroză', 'hepatită', 'pancreatită', 'colită', 'crohn', 'esofag', 'ficat', 'pancreas'], weight: 3 },

  // Pulmonology
  { specialty: 'Pneumologie', keywords: ['pulmonar', 'respirator', 'astm', 'bpoc', 'emfizem', 'bronșic', 'pulmonară', 'fibroză pulmonară', 'plămân', 'bronhopneumopatie'], weight: 3 },

  // Nephrology
  { specialty: 'Nefrologie', keywords: ['renal', 'rinichi', 'nefrotic', 'dializă', 'insuficiență renală', 'glomerulonefrit', 'nefropatie'], weight: 3 },

  // Hematology
  { specialty: 'Hematologie', keywords: ['hematologic', 'sânge', 'anemie', 'trombocit', 'coagulare', 'hemofilie', 'leucemie', 'limfom', 'mielom', 'eritrocit'], weight: 3 },

  // Infectious Diseases
  { specialty: 'Boli Infecțioase', keywords: ['infecțios', 'infecție', 'viral', 'bacterian', 'sepsis', 'hiv', 'hepatită virală', 'tuberculoză', 'covid'], weight: 3 },

  // Immunology
  { specialty: 'Imunologie', keywords: ['imunitar', 'autoimun', 'imunodeficiență', 'vaccin', 'imunoglobulin', 'anticorp'], weight: 2 },

  // Dermatology
  { specialty: 'Dermatologie', keywords: ['dermatologic', 'piele', 'cutanat', 'psoriazis', 'dermatită', 'eczem'], weight: 3 },

  // Ophthalmology
  { specialty: 'Oftalmologie', keywords: ['ocular', 'oftalmologic', 'retină', 'maculă', 'glaucom', 'cataract', 'vedere', 'vizual'], weight: 3 },

  // Psychiatry
  { specialty: 'Psihiatrie', keywords: ['psihiatric', 'mental', 'depresie', 'anxietate', 'schizofrenie', 'bipolar', 'psihoză'], weight: 3 },

  // Pediatrics
  { specialty: 'Pediatrie', keywords: ['copil', 'pediatric', 'sugar', 'nou-născut', 'neonatal', 'adolescent'], weight: 2 },

  // Orthopedics
  { specialty: 'Ortopedice', keywords: ['ortopedic', 'osteoporo', 'fractură', 'osteosarcom', 'osteogen'], weight: 2 },

  // Gynecology
  { specialty: 'Ginecologie', keywords: ['ginecologic', 'uterin', 'ovarian', 'endometrio', 'menstrual', 'menopauză'], weight: 3 },
];

/**
 * Extract specialties from ATC code
 */
function getSpecialtiesFromATC(code: string): string[] {
  const specialties = new Set<string>();

  // Try specific L3 mapping first (e.g., L01, A10)
  const l3Code = code.match(/^([A-Z]\d{2})/)?.[1];
  if (l3Code && SPECIFIC_ATC_MAPPINGS[l3Code]) {
    SPECIFIC_ATC_MAPPINGS[l3Code].forEach(s => specialties.add(s));
  }

  // Fall back to L1 mapping (first letter)
  const l1Code = code.charAt(0);
  if (l1Code && ATC_TO_SPECIALTY[l1Code]) {
    ATC_TO_SPECIALTY[l1Code].forEach(s => specialties.add(s));
  }

  return Array.from(specialties);
}

/**
 * Analyze content for specialty indicators
 */
function analyzeContentForSpecialties(text: string): Map<string, number> {
  const scores = new Map<string, number>();
  const lowerText = text.toLowerCase();

  for (const pattern of CONTENT_PATTERNS) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      // Count occurrences (but cap to avoid over-weighting)
      const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
      score += Math.min(matches, 5) * pattern.weight;
    }

    if (score > 0) {
      scores.set(pattern.specialty, (scores.get(pattern.specialty) || 0) + score);
    }
  }

  return scores;
}

/**
 * Determine primary specialty from multiple signals
 */
function determinePrimarySpecialty(
  atcSpecialties: string[],
  contentScores: Map<string, number>,
  title: string
): string | null {
  // Combine all signals
  const finalScores = new Map<string, number>();

  // ATC-based specialties get base score
  atcSpecialties.forEach(specialty => {
    finalScores.set(specialty, (finalScores.get(specialty) || 0) + 10);
  });

  // Add content-based scores
  contentScores.forEach((score, specialty) => {
    finalScores.set(specialty, (finalScores.get(specialty) || 0) + score);
  });

  // Title boost for specific mentions
  const lowerTitle = title.toLowerCase();
  CONTENT_PATTERNS.forEach(pattern => {
    for (const keyword of pattern.keywords) {
      if (lowerTitle.includes(keyword)) {
        finalScores.set(pattern.specialty, (finalScores.get(pattern.specialty) || 0) + 5);
      }
    }
  });

  // Find highest scoring specialty
  if (finalScores.size === 0) return null;

  const sorted = Array.from(finalScores.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Main execution
 */
async function generateSpecialties() {
  console.log('🔬 Starting specialty generation...\n');

  const protocols = await prisma.protocol.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      dci: true,
      rawText: true,
      specialtyCode: true,
    },
  });

  console.log(`Found ${protocols.length} protocols to analyze\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const specialtyStats = new Map<string, number>();

  for (const protocol of protocols) {
    try {
      // Skip if already has specialty and we don't want to override
      // (comment out this block to force re-generation)
      // if (protocol.specialtyCode) {
      //   skipped++;
      //   continue;
      // }

      // Get specialties from ATC code
      const atcSpecialties = getSpecialtiesFromATC(protocol.code);

      // Analyze content
      const contentToAnalyze = `${protocol.title} ${protocol.dci || ''} ${protocol.rawText.substring(0, 2000)}`;
      const contentScores = analyzeContentForSpecialties(contentToAnalyze);

      // Determine primary specialty
      const primarySpecialty = determinePrimarySpecialty(
        atcSpecialties,
        contentScores,
        protocol.title
      );

      if (primarySpecialty) {
        // Get all relevant specialties (ATC + high-scoring content matches)
        const allSpecialties = new Set<string>([primarySpecialty]);

        // Add ATC-derived specialties
        atcSpecialties.forEach(s => allSpecialties.add(s));

        // Add high-scoring content specialties (score > 15)
        contentScores.forEach((score, specialty) => {
          if (score > 15) {
            allSpecialties.add(specialty);
          }
        });

        // Update protocol with both specialtyCode (primary) and categories (all relevant)
        await prisma.protocol.update({
          where: { id: protocol.id },
          data: {
            specialtyCode: primarySpecialty,
            categories: Array.from(allSpecialties),
          },
        });

        updated++;
        specialtyStats.set(primarySpecialty, (specialtyStats.get(primarySpecialty) || 0) + 1);

        if (updated % 50 === 0) {
          console.log(`Progress: ${updated}/${protocols.length} protocols processed`);
        }
      } else {
        skipped++;
        console.log(`⚠️  No specialty determined for ${protocol.code}: ${protocol.title.substring(0, 60)}`);
      }

    } catch (error) {
      failed++;
      console.error(`❌ Failed to process ${protocol.code}:`, error);
    }
  }

  console.log('\n✅ Specialty generation complete!\n');
  console.log('Statistics:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);

  console.log('\n📊 Specialty Distribution:');
  const sortedStats = Array.from(specialtyStats.entries()).sort((a, b) => b[1] - a[1]);
  sortedStats.forEach(([specialty, count]) => {
    const percentage = ((count / updated) * 100).toFixed(1);
    console.log(`  ${specialty}: ${count} (${percentage}%)`);
  });
}

// Execute
generateSpecialties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
