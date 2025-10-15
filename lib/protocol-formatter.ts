/**
 * Protocol Text Formatter
 *
 * Intelligently extracts and formats Romanian therapeutic protocol sections
 * inspired by Mediately.co's structured presentation.
 *
 * CRITICAL: 100% content preservation guarantee
 * - All protocol text is preserved and displayed
 * - Extracted sections are non-destructive (text remains in full content)
 * - Unmatched content is displayed in "Complete Protocol Text" section
 * - Featured sections provide quick access, not content replacement
 */

export interface ProtocolSection {
  id: string;
  title: string;
  content: string;
  subsections?: ProtocolSection[];
  order: number; // Display priority (lower = higher priority)
}

export interface FormattedProtocol {
  featuredSections: ProtocolSection[];
  fullText: string; // Always preserved - complete protocol text
  hasStructure: boolean; // Whether featured sections were detected
  extractionConfidence: number; // 0-100 confidence in section extraction
}

/**
 * Section patterns for Romanian therapeutic protocols
 * Ordered by display priority (most important first)
 */
const SECTION_PATTERNS = [
  {
    id: 'indicatii',
    title: 'Indicații Terapeutice',
    order: 1,
    patterns: [
      /^(?:I\.?\s+)?INDICA[ȚT]I[IE]\s+TERAPEUTICE?[\s:]/i,
      /^INDICA[ȚT]I[IE]\s*(?:TERAPEUTICE?)?[\s:]/i,
      /^Scopul\s+protocolului/i,
    ]
  },
  {
    id: 'criterii_includere',
    title: 'Criterii de Includere în Tratament',
    order: 2,
    patterns: [
      /^(?:I{1,3}\.?\s+)?CRITERI[IU]\s+DE\s+(?:ELIGIBILITATE|INCLUDERE)/i,
      /^CRITERI[IU]\s+DE\s+INCLUDERE/i,
      /^(?:Criterii|Condi[țt]ii)\s+de\s+eligibilitate/i,
    ]
  },
  {
    id: 'criterii_excludere',
    title: 'Criterii de Excludere',
    order: 3,
    patterns: [
      /^(?:I{1,3}\.?\s+)?CRITERI[IU]\s+DE\s+EXCLUDERE/i,
      /^CONTRAINDICA[ȚT]II/i,
      /^Se\s+vor\s+exclude/i,
    ]
  },
  {
    id: 'schema_tratament',
    title: 'Schema de Tratament',
    order: 4,
    patterns: [
      /^(?:I{0,3}\.?\s+)?SCHEM[AĂ]\s+(?:DE\s+)?TRATAMENT/i,
      /^TRATAMENT(?:UL)?[\s:]/i,
      /^(?:Doz[ăa]|Posologie)/i,
      /^Modalit[ăa][țt]i\s+de\s+administrare/i,
    ]
  },
  {
    id: 'monitorizare',
    title: 'Monitorizare',
    order: 5,
    patterns: [
      /^(?:I{0,3}\.?\s+)?MONITORIZARE[A]?/i,
      /^(?:Evaluare|Supraveghere)\s+(?:clinic[ăa]|terapeutic[ăa])/i,
      /^Parametrii\s+de\s+(?:evaluare|monitorizare)/i,
    ]
  },
  {
    id: 'efecte_adverse',
    title: 'Efecte Adverse și Reacții Nedorite',
    order: 6,
    patterns: [
      /^(?:I{0,3}\.?\s+)?EFECTE\s+ADVERSE/i,
      /^(?:I{0,3}\.?\s+)?REAC[ȚT]II\s+ADVERSE/i,
      /^(?:Toxicitate|Efecte\s+secundare)/i,
    ]
  },
  {
    id: 'durata_tratament',
    title: 'Durata Tratamentului',
    order: 7,
    patterns: [
      /^(?:I{0,3}\.?\s+)?DURATA\s+TRATAMENT/i,
      /^Durata\s+(?:de\s+)?administr[ăa]rii/i,
      /^(?:Perioada|Intervalul)\s+de\s+tratament/i,
    ]
  },
  {
    id: 'reevaluare',
    title: 'Criterii de Reevaluare',
    order: 8,
    patterns: [
      /^(?:I{0,3}\.?\s+)?CRITERI[IU]\s+DE\s+REEVALUARE/i,
      /^REEVALUARE[A]?/i,
      /^(?:Continuare|Reînnoire)\s+tratament/i,
    ]
  },
  {
    id: 'intrerupere',
    title: 'Criterii de Întrerupere',
    order: 9,
    patterns: [
      /^(?:I{0,3}\.?\s+)?CRITERI[IU]\s+DE\s+(?:ÎNTRERUPERE|OPRIRE|SISTARE)/i,
      /^ÎNTRERUPERE[A]?\s+TRATAMENT/i,
      /^(?:Încetare|Suspendare)\s+tratament/i,
    ]
  },
  {
    id: 'interactiuni',
    title: 'Interacțiuni Medicamentoase',
    order: 10,
    patterns: [
      /^(?:I{0,3}\.?\s+)?INTERAC[ȚT]IUNI/i,
      /^(?:Medicamente|Asocieri)\s+contraindicate/i,
    ]
  },
];

/**
 * Extract a section's content between its start and the next section
 */
function extractSectionContent(
  text: string,
  startIndex: number,
  nextSectionIndex: number
): string {
  const content = text.substring(startIndex, nextSectionIndex).trim();

  // Remove the section header line
  const lines = content.split('\n');
  const contentWithoutHeader = lines.slice(1).join('\n').trim();

  return contentWithoutHeader || content;
}

/**
 * Find all section boundaries in the protocol text
 */
function findSectionBoundaries(text: string): Array<{
  id: string;
  title: string;
  order: number;
  startIndex: number;
  matchedPattern: string;
}> {
  const boundaries: Array<{
    id: string;
    title: string;
    order: number;
    startIndex: number;
    matchedPattern: string;
  }> = [];

  for (const sectionDef of SECTION_PATTERNS) {
    for (const pattern of sectionDef.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags + 'gm');
      let match;

      while ((match = regex.exec(text)) !== null) {
        boundaries.push({
          id: sectionDef.id,
          title: sectionDef.title,
          order: sectionDef.order,
          startIndex: match.index,
          matchedPattern: match[0],
        });
      }
    }
  }

  // Sort by appearance in text
  return boundaries.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Parse subsections within a section (numbered lists, lettered lists)
 */
function parseSubsections(content: string): ProtocolSection[] | undefined {
  const subsections: ProtocolSection[] = [];

  // Pattern for numbered subsections (1., 2., A., B., etc.)
  const subsectionPattern = /^([0-9]+|[A-Z])\.[\s)]+(.*?)$/gm;
  let match;
  const matches: Array<{ index: number; title: string; number: string }> = [];

  while ((match = subsectionPattern.exec(content)) !== null) {
    matches.push({
      index: match.index,
      title: match[2].trim(),
      number: match[1],
    });
  }

  // Only treat as subsections if we have at least 2 matches
  if (matches.length >= 2) {
    matches.forEach((match, idx) => {
      const nextMatch = matches[idx + 1];
      const subsectionContent = content.substring(
        match.index,
        nextMatch ? nextMatch.index : content.length
      ).trim();

      subsections.push({
        id: `subsection_${match.number}`,
        title: match.title || `Secțiunea ${match.number}`,
        content: subsectionContent,
        order: idx,
      });
    });

    return subsections;
  }

  return undefined;
}

/**
 * Calculate confidence score based on extraction quality
 */
function calculateConfidence(
  featuredSections: ProtocolSection[]
): number {
  if (featuredSections.length === 0) return 0;

  let score = 0;

  // Base score for having sections (30 points)
  score += 30;

  // Points for each high-priority section found (up to 40 points)
  const highPrioritySections = featuredSections.filter(s => s.order <= 4);
  score += Math.min(40, highPrioritySections.length * 10);

  // Points for having multiple sections (up to 20 points)
  score += Math.min(20, featuredSections.length * 3);

  // Points for section content quality (up to 10 points)
  const avgContentLength = featuredSections.reduce((sum, s) => sum + s.content.length, 0) / featuredSections.length;
  if (avgContentLength > 200) score += 10;
  else if (avgContentLength > 100) score += 5;

  return Math.min(100, score);
}

/**
 * Main formatting function - extracts featured sections while preserving full text
 *
 * @param rawText - Complete protocol text from database
 * @returns FormattedProtocol with featured sections AND full text preserved
 */
export function formatProtocol(rawText: string): FormattedProtocol {
  // CRITICAL: Always preserve full text
  const fullText = rawText.trim();

  if (!fullText) {
    return {
      featuredSections: [],
      fullText: '',
      hasStructure: false,
      extractionConfidence: 0,
    };
  }

  // Find all section boundaries
  const boundaries = findSectionBoundaries(fullText);

  if (boundaries.length === 0) {
    // No structure detected - return with full text preserved
    return {
      featuredSections: [],
      fullText,
      hasStructure: false,
      extractionConfidence: 0,
    };
  }

  // Extract featured sections (non-destructive)
  const featuredSections: ProtocolSection[] = [];

  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    const nextBoundary = boundaries[i + 1];

    const content = extractSectionContent(
      fullText,
      boundary.startIndex,
      nextBoundary ? nextBoundary.startIndex : fullText.length
    );

    // Parse subsections if present
    const subsections = parseSubsections(content);

    featuredSections.push({
      id: boundary.id,
      title: boundary.title,
      content,
      subsections,
      order: boundary.order,
    });
  }

  // Sort by display priority
  featuredSections.sort((a, b) => a.order - b.order);

  const confidence = calculateConfidence(featuredSections);

  return {
    featuredSections,
    fullText, // ALWAYS included - 100% content preservation
    hasStructure: featuredSections.length > 0,
    extractionConfidence: confidence,
  };
}

/**
 * Format section content with basic text formatting
 * Converts plain text to HTML with proper line breaks and lists
 */
export function formatSectionContent(content: string): string {
  if (!content) return '';

  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  let html = '';
  let inList = false;

  for (const line of lines) {
    // Check if line is a list item
    const isListItem = /^[-•○●▪▫]\s/.test(line) || /^[a-z]\)|[0-9]+\)/.test(line);

    if (isListItem) {
      if (!inList) {
        html += '<ul class="list-disc list-inside space-y-1 ml-4">';
        inList = true;
      }
      const cleanedLine = line.replace(/^[-•○●▪▫]\s|^[a-z]\)|^[0-9]+\)\s/, '');
      html += `<li class="text-gray-700">${cleanedLine}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }

      // Check if line is a subheading (all caps, or starts with letter+number)
      if (line === line.toUpperCase() && line.length < 100) {
        html += `<h4 class="font-semibold text-gray-900 mt-4 mb-2">${line}</h4>`;
      } else {
        html += `<p class="text-gray-700 mb-3">${line}</p>`;
      }
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}
