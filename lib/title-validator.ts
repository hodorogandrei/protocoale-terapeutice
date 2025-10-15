/**
 * Title Validation and Correction Utilities
 *
 * Validates protocol titles and suggests corrections based on:
 * 1. Official CNAS protocol patterns
 * 2. Content analysis
 * 3. Common DCI naming patterns
 */

/**
 * Known valid protocol titles from official CNAS lists
 * This is a reference mapping for validation and correction
 */
export const KNOWN_PROTOCOL_TITLES: Record<string, string> = {
  // A Series - Metabolism and Digestive
  'A001E': 'ORLISTATUM',
  'A002C': 'PALONOSETRONUM',
  'A004C': 'ONDASETRONUM, GRANISETRONUM',
  'A005E': 'PARICALCITOLUM',
  'A006E': 'CALCITRIOLUM',
  'A008E': 'IMIGLUCERASUM',
  'A010N': 'COMPLEX DE HIDROXID FER (III) SUCROZĂ',
  'A014E': 'AGALSIDASUM BETA',
  'A015E': 'INSULINUM LISPRO',
  'A016E': 'INSULINUM ASPART',
  'A017E': 'INSULINUM LISPRO',
  'A018E': 'INSULINUM ASPART',
  'A019E': 'INSULINUM GLULIZINA',
  'A020E': 'PIOGLITAZONUM',
  'A021E': 'ACIDUM TIOCTICUM (ALFA-LIPOICUM)',
  'A022E': 'SITAGLIPTINUM',
  'A023E': 'INSULINUM DETEMIR',
  'A024E': 'INSULINUM GLARGINE',
  'A025E': 'COMBINAŢII (PIOGLITAZONUM + METFORMIN)',
  'A029E': 'INSULINUM LISPRO',
  'A10AE06': 'INSULINUM DEGLUDEC',
  'A10BH03': 'SAXAGLIPTINUM',
  'A16AB10': 'VELAGLUCERASE ALFA',
  'A16AB12': 'ELOSULFASE ALFA',
  'A16AX06': 'MIGLUSTATUM',
  'A16AX07': 'PLERIXAFOR',
  'A16AX10': 'ELIGLUSTAT',

  // L Series - Antineoplastic
  'L001C': 'ACIDUM CLODRONICUM',
  'L001G': 'MITOXANTRONUM',
  'L002G': 'SCLEROZA MULTIPLĂ - TRATAMENT IMUNOMODULATOR',
  'L004C': 'BEVACIZUMABUM',
  'L008C': 'IMATINIBUM',

  // N Series - Nervous System
  'N001F': 'MEMANTINUM',
  'N002F': 'MILNACIPRANUM',
  'N003F': 'OLANZAPINUM',
  'N004F': 'RISPERIDONUM',
  'N005F': 'QUETIAPINUM',
  'N006F': 'AMISULPRIDUM',
  'N007F': 'ARIPIPRAZOLUM',
  'N008F': 'CITALOPRAMUM',
  'N009F': 'ESCITALOPRAMUM',
  'N010F': 'TRAZODONUM',
  'N011F': 'TIANEPTINUM',
  'N012F': 'LAMOTRIGINUM',
  'N013F': 'VENLAFAXINUM',
  'N014F': 'DULOXETINUM',

  // C Series - Cardiovascular
  'C002I': 'ALPROSTADILUM',
  'C003I': 'IVABRADINUM',
  'C004I': 'IVABRADINUM',
  'C005I': 'SARTANI ÎN INSUFICIENŢA CARDIACĂ',
  'C10BA05': 'COMBINAŢII (EZETIMIBUM + ATORVASTATINUM)',

  // J Series - Anti-infectives
  'J003N': 'PEGINTERFERONUM ALFA 2B',
  'J004N': 'PEGINTERFERONUM ALFA 2A',
  'J005N': 'LAMIVUDINUM',
  'J006N': 'ADEFOVIR DIPIVOXIL',
  'J007N': 'TENOFOVIR DISOPROXIL',
  'J008N': 'ENTECAVIRUM',
  'J009N': 'TELBIVUDINUM',
  'J010D': 'CASPOFUNGINUM',
  'J012B': 'VORICONAZOLUM',

  // B Series - Blood and Blood Forming Organs
  'B009N': 'EPOETINUM BETA',
  'B010N': 'EPOETINUM ALFA',
  'B011N': 'DARBEPOETINUM ALFA',
  'B015D': 'EPTACOG ALFA ACTIVATUM',
  'B016I': 'DIOSMINUM',
  'B02AB02': 'INHIBITOR DE PROTEAZA (ACTIVATED PROTEIN C)',
  'B02BD02': 'TUROCTOCOG ALFA PEGOL',
  'B02BX04': 'ROMIPLOSTINUM',
  'B03XA03': 'EPOETINUM ZETA',
  'B03XA06': 'LUSPATERCEPT',
  'B06AC02': 'ICATIBANTUM',

  // R Series - Respiratory System
  'R001E': 'ERDOSTEINUM',
};

/**
 * Check if a title is corrupted/invalid
 */
export function isTitleCorrupted(title: string): boolean {
  if (!title || title.length < 3) return true;

  // Check for corruption patterns
  const corruptionPatterns = [
    /^[a-z,\(\)]/,  // Starts with lowercase or punctuation
    /poziţiei|corespunz|ă tor pozi/i,  // Protocol header fragments
    /Protocol terapeutic.*cod.*\(\)/i,  // Empty code references
    /^[:\-\•\,]\s/,  // Starts with punctuation
    /^COD PROTOCOL/i,  // Table header
    /sublista\/cod/i,  // Table column header
    /continuare prescriere/i,  // Table column content
    /^[+-] stadiul/i,  // Fragment like "+ stadiul IV"
    /ani si peste.*leucemie/i,  // Fragment from inclusion criteria
    /intestinale.*pozitive/i,  // Fragment from indication
    /neuronală.*receptori/i,  // Fragment from diagnostic
    /Tratamentului se prescrie/i,  // Fragment from prescription section
    /^(Manitol|Sorbitol) \(\)/,  // Food additive fragments
  ];

  return corruptionPatterns.some(pattern => pattern.test(title));
}

/**
 * Extract proper title from protocol rawText content
 */
export function extractTitleFromRawText(code: string, rawText: string): string | null {
  if (!rawText) return null;

  const lines = rawText.split('\n');

  // Strategy 1: Look for "Protocol terapeutic ... cod (CODE): DCI TITLE" pattern
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();

    // Match protocol header with this specific code
    const headerMatch = line.match(
      new RegExp(`Protocol\\s+terapeutic.*?cod\\s*\\(${code}\\):\\s*(?:DCI\\s+)?(.+?)$`, 'i')
    );

    if (headerMatch && headerMatch[1]) {
      let title = headerMatch[1].trim();

      // Clean up the extracted title
      title = title
        .replace(/^DCI[:\s]+/i, '')
        .replace(/\s+NU\s*$/i, '')
        .replace(/\s+C\d+-[A-Z]\d+.*$/i, '')
        .trim();

      if (title.length > 3 && title.length < 150) {
        return title;
      }
    }

    // Sometimes DCI is on the next line
    if (line.match(new RegExp(`Protocol\\s+terapeutic.*?cod\\s*\\(${code}\\).*DCI\\s*$`, 'i'))) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && nextLine.length > 3 && nextLine.length < 150) {
        // Check if it looks like a drug name (uppercase or capitalized)
        if (nextLine.match(/^[A-Z][A-Z\s,\-\(\)]+$/)) {
          return nextLine;
        }
      }
    }
  }

  // Strategy 2: Look for drug names (ending with UM, IN, INE, etc.)
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i].trim();

    // Skip section headers and protocol headers
    if (line.match(/^[IVX]+\./)) continue;
    if (line.match(/^\d+\./)) continue;
    if (line.toLowerCase().includes('protocol')) continue;
    if (line.toLowerCase().includes('criterii')) continue;
    if (line.toLowerCase().includes('definit')) continue;
    if (line.toLowerCase().includes('indicat')) continue;

    // Look for drug names
    const drugMatch = line.match(/\b([A-Z][A-Z]+(?:UM|IN|INE|OLUM|INUM|IDUM))\b/);
    if (drugMatch && drugMatch[1].length > 5) {
      return drugMatch[1];
    }

    // Look for multi-word drug names
    if (line.match(/^[A-Z][A-Z\s,\-\(\)]{5,100}$/) && !line.includes('PROTOCOL')) {
      return line;
    }
  }

  // Strategy 3: Look for treatment descriptions (for non-drug protocols)
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i].trim();

    // Look for condition/treatment names (mixed case, descriptive)
    if (line.match(/^[A-Z][a-zăâîșț][A-Za-zăâîșțĂÂÎȘȚ\s\-]{10,100}$/)) {
      // Exclude section headers
      if (!line.match(/^(Defini|Criterii|Indicat|Protocol|Introducere|Obiective)/i)) {
        return line;
      }
    }
  }

  return null;
}

/**
 * Validate and correct a protocol title
 * Returns corrected title or null if no correction possible
 */
export function validateAndCorrectTitle(
  code: string,
  currentTitle: string,
  rawText: string
): string | null {
  // Check if title is already valid
  if (!isTitleCorrupted(currentTitle) && currentTitle.length >= 5 && currentTitle.length <= 150) {
    return null; // No correction needed
  }

  // Check known titles first
  if (KNOWN_PROTOCOL_TITLES[code]) {
    return KNOWN_PROTOCOL_TITLES[code];
  }

  // Try to extract from raw text
  const extractedTitle = extractTitleFromRawText(code, rawText);
  if (extractedTitle && extractedTitle.length > 3) {
    return extractedTitle;
  }

  return null;
}

/**
 * Check if proposed title is better than current title
 */
export function isBetterTitle(current: string, proposed: string): boolean {
  if (!proposed || proposed.length < 3) return false;
  if (!current) return true;

  // Proposed is better if:
  // 1. Current is corrupted and proposed is not
  if (isTitleCorrupted(current) && !isTitleCorrupted(proposed)) {
    return true;
  }

  // 2. Proposed is from known list
  if (Object.values(KNOWN_PROTOCOL_TITLES).includes(proposed)) {
    return true;
  }

  // 3. Proposed is longer and more descriptive (but not too long)
  if (proposed.length > current.length &&
      proposed.length <= 150 &&
      !isTitleCorrupted(proposed)) {
    return true;
  }

  return false;
}

/**
 * Batch validate all protocols
 * Returns protocols that need correction
 */
export function findProtocolsNeedingCorrection(
  protocols: Array<{ code: string; title: string; rawText: string }>
): Array<{ code: string; currentTitle: string; suggestedTitle: string }> {
  const needsCorrection: Array<{ code: string; currentTitle: string; suggestedTitle: string }> = [];

  for (const protocol of protocols) {
    const suggestion = validateAndCorrectTitle(protocol.code, protocol.title, protocol.rawText);

    if (suggestion && isBetterTitle(protocol.title, suggestion)) {
      needsCorrection.push({
        code: protocol.code,
        currentTitle: protocol.title,
        suggestedTitle: suggestion
      });
    }
  }

  return needsCorrection;
}
