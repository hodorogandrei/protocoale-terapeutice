/**
 * Drug Name Enhancement Utilities
 *
 * Expands short drug names (like LISPRO, GLULIZINA) to full pharmaceutical names
 * (INSULINUM LISPRO, INSULINUM GLULISINUM) during protocol extraction.
 *
 * This ensures consistent, complete drug names in the database without requiring
 * manual cleanup of extracted data.
 */

/**
 * Comprehensive mapping of short drug names to full pharmaceutical names
 * Focused on insulin types and other commonly abbreviated substances
 */
export const DRUG_NAME_EXPANSIONS: Record<string, string> = {
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

  // Add more as patterns are identified
};

/**
 * Expand short drug names in text to full pharmaceutical names
 * Handles case-insensitive matching and avoids double replacements
 *
 * @param text - Text containing potential short drug names
 * @returns Text with expanded drug names
 */
export function expandDrugNames(text: string): string {
  if (!text) return text;

  let result = text;

  for (const [shortName, fullName] of Object.entries(DRUG_NAME_EXPANSIONS)) {
    // Create regex that matches the short name but NOT when preceded by INSULINUM
    // Negative lookbehind to avoid matching "INSULINUM LISPRO"
    const regex = new RegExp(
      `(?<!INSULINUM\\s)(?<!Insulinum\\s)(?<!insulinum\\s)\\b(${shortName})\\b`,
      'gi'
    );

    // Replace while preserving original case context where possible
    result = result.replace(regex, (match) => {
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
 * Check if text contains short drug names that need expansion
 *
 * @param text - Text to check
 * @returns True if text contains expandable short drug names
 */
export function hasShortDrugNames(text: string): boolean {
  if (!text) return false;

  for (const shortName of Object.keys(DRUG_NAME_EXPANSIONS)) {
    // Check if short name exists but NOT preceded by INSULINUM
    const regex = new RegExp(
      `(?<!INSULINUM\\s)(?<!Insulinum\\s)(?<!insulinum\\s)\\b${shortName}\\b`,
      'i'
    );

    if (regex.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Enhance a protocol object by expanding short drug names in title and DCI
 *
 * @param protocol - Protocol object with title and optional DCI
 * @returns Enhanced protocol with expanded drug names
 */
export function enhanceProtocolDrugNames<T extends { title: string; dci?: string }>(
  protocol: T
): T {
  return {
    ...protocol,
    title: expandDrugNames(protocol.title),
    dci: protocol.dci ? expandDrugNames(protocol.dci) : protocol.dci,
  };
}
