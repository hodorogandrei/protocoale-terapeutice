# Table Parser Improvements

## Overview

The CNAS protocol parser has been significantly improved to better extract protocols from tabular PDFs. The new implementation uses advanced table detection and extraction techniques to accurately parse protocol lists.

## What Was Improved

### 1. **Advanced Table Detection** (`lib/table-extractor.ts`)

- **Text Positioning**: Uses `pdf.js-extract` to get exact x,y coordinates of text
- **Column Detection**: Automatically detects columns by analyzing x-position clusters
- **Row Detection**: Groups text into rows based on y-position similarity
- **Table Reconstruction**: Rebuilds table structure from positioned text elements
- **Cell Assignment**: Intelligently assigns text to the correct table cells

### 2. **Smart Protocol Parsing** (`lib/protocol-list-parser.ts`)

- **Multi-Strategy Parsing**: Uses both table extraction and text parsing
- **Automatic Detection**: Determines if a PDF is a protocol list or single protocol
- **Confidence Scoring**: Each extracted protocol gets a quality confidence score (0-100)
- **Protocol Validation**: Filters out invalid or malformed protocol entries
- **Enhancement**: Automatically extracts and enhances metadata (DCI, titles, etc.)
- **Fallback Support**: Falls back to text parsing if table extraction fails

### 3. **Hybrid Extraction Approach**

The parser now uses a hybrid approach:

1. **Table Extraction (Primary)**: Best for tabular PDFs
   - Detects table structure using text positions
   - Preserves column relationships
   - High accuracy for well-structured tables

2. **Text Parsing (Fallback)**: For non-tabular content
   - Pattern-based extraction using regex
   - Works with simpler text-based lists
   - Lower confidence but more robust

3. **Merging Strategy**: Combines results from both methods
   - Deduplicates protocols by code
   - Keeps highest confidence version
   - Provides best possible extraction quality

### 4. **Enhanced PDF Extractor** (`lib/pdf-extractor.ts`)

- Added table detection during PDF extraction
- Reports table count and whether PDF has tabular data
- Provides metadata for better protocol list detection

### 5. **Improved Scraper Integration** (`scripts/scraper.ts`)

- Uses new parser with automatic fallback
- Logs extraction method and quality scores
- Stores confidence scores in database
- Better error handling and reporting

## Key Features

### Column Detection Algorithm

```typescript
// Detects columns by clustering x-positions
const columns = detectColumns(textItems)
// Returns array of columns with x, width, and alignment
```

The algorithm:
1. Collects all x-positions from text items
2. Clusters positions within 30px tolerance
3. Filters out noise (single-item clusters)
4. Creates column definitions with boundaries

### Protocol Code Recognition

Supports standard CNAS protocol codes:
- Format: `[A-Z]\d{3}[A-Z]?`
- Examples: `A001E`, `B123`, `C456X`

### Confidence Scoring

Protocols are scored based on:
- **Code Format** (30%): Valid protocol code structure
- **Title Quality** (40%): Reasonable length and content
- **Content Validity** (30%): Presence of actual text

Scoring thresholds:
- **90-100%**: Excellent extraction, high confidence
- **70-89%**: Good extraction, medium confidence
- **50-69%**: Fair extraction, review recommended
- **Below 50%**: Poor extraction, filtered out

## Usage

### Running the Improved Parser

The improved parser is automatically used by the scraper:

```bash
npm run scraper
```

### Testing the Table Parser

Test the parser on a specific PDF:

```bash
npx tsx scripts/test-table-parser.ts data/pdfs/protocol-list.pdf
```

This will show:
- Number of tables detected
- Number of protocols extracted
- Extraction method used (table/text/hybrid)
- Quality scores
- Sample extracted protocols

### Programmatic Usage

```typescript
import { parseProtocolList } from './lib/protocol-list-parser'

const result = await parseProtocolList(
  pdfPath,
  rawText,
  pageCount,
  title
)

console.log(`Found ${result.protocols.length} protocols`)
console.log(`Method: ${result.method}`)
console.log(`Quality: ${result.quality}%`)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CNAS Scraper                          │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ├──→ PDF Download
                    │
                    ├──→ PDF Extraction (pdf-extractor.ts)
                    │     ├── Raw text extraction
                    │     ├── Table detection
                    │     └── Metadata extraction
                    │
                    ├──→ Protocol List Parser (protocol-list-parser.ts)
                    │     ├── Detection (is it a list?)
                    │     │
                    │     ├──→ Table Extraction (table-extractor.ts)
                    │     │     ├── Extract positioned text
                    │     │     ├── Detect columns
                    │     │     ├── Group into rows
                    │     │     └── Parse protocols
                    │     │
                    │     ├──→ Text Parsing (fallback)
                    │     │     └── Regex-based extraction
                    │     │
                    │     ├── Merge results
                    │     ├── Validate protocols
                    │     └── Enhance metadata
                    │
                    └──→ Database Storage
```

## Supported PDF Formats

### Tabular PDFs (Best Results)
- Multi-column tables
- Protocol code in first column
- Title/DCI in subsequent columns
- Consistent row structure

### Text-based PDFs (Good Results)
- Line-by-line protocol listings
- Code at start of line
- Title following code
- DCI in parentheses or separate line

### Complex PDFs (Fair Results)
- Mixed layouts
- Multiple sections
- Irregular spacing
- Multi-line entries

## Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Table Detection | No | Yes | ✅ New feature |
| Column Awareness | No | Yes | ✅ New feature |
| Multi-Strategy | No | Yes | ✅ New feature |
| Confidence Scoring | No | Yes (0-100%) | ✅ New feature |
| Fallback Support | Limited | Full | ⬆️ Enhanced |
| Protocol Validation | Basic | Advanced | ⬆️ Enhanced |

## Examples

### Example 1: Tabular PDF

**Input PDF Structure:**
```
┌──────────┬────────────────────────────────┬──────────────┐
│ Cod      │ Denumire                       │ DCI          │
├──────────┼────────────────────────────────┼──────────────┤
│ A001E    │ Protocol oncologie             │ Bevacizumab  │
│ A002C    │ Protocol reumatologie          │ Adalimumab   │
│ B123     │ Protocol cardiologie           │ Atorvastatin │
└──────────┴────────────────────────────────┴──────────────┘
```

**Output:**
```json
{
  "protocols": [
    {
      "code": "A001E",
      "title": "Protocol oncologie",
      "dci": "Bevacizumab",
      "confidence": 95
    },
    {
      "code": "A002C",
      "title": "Protocol reumatologie",
      "dci": "Adalimumab",
      "confidence": 95
    }
  ],
  "method": "table",
  "quality": 95
}
```

### Example 2: Text-based PDF

**Input PDF Content:**
```
A001E Protocol pentru tratamentul cancerului (Bevacizumab)
A002C Protocol pentru artrita reumatoida (Adalimumab)
B123 Protocol pentru tratamentul hipercolesterolemiei
```

**Output:**
```json
{
  "protocols": [
    {
      "code": "A001E",
      "title": "Protocol pentru tratamentul cancerului",
      "dci": "Bevacizumab",
      "confidence": 75
    }
  ],
  "method": "text",
  "quality": 75
}
```

## Troubleshooting

### Low Confidence Scores

If protocols are extracted with low confidence:

1. **Check PDF Quality**: Ensure PDF is text-based, not scanned images
2. **Review Format**: Verify protocol codes follow `[A-Z]\d{3}[A-Z]?` pattern
3. **Check Structure**: Ensure consistent table/list structure
4. **Manual Review**: Review protocols with confidence < 70%

### Missing Protocols

If some protocols are not extracted:

1. **Check Code Format**: Ensure codes match expected pattern
2. **Review Spacing**: Irregular spacing may confuse column detection
3. **Test Fallback**: Run with text parser only to diagnose
4. **Adjust Tolerance**: May need to adjust clustering tolerance in code

### Table Detection Failed

If table detection fails:

1. **PDF Structure**: Check if PDF has actual tabular data
2. **Text Extraction**: Verify text can be extracted (not images)
3. **Fallback**: Parser automatically falls back to text parsing
4. **Manual Processing**: May need manual review for complex PDFs

## Future Improvements

Potential enhancements for future versions:

- [ ] OCR support for scanned PDFs
- [ ] Multi-page table handling
- [ ] Better DCI extraction (from separate columns)
- [ ] Support for merged cells
- [ ] Handling of rotated/vertical text
- [ ] Machine learning-based table detection
- [ ] Support for more complex layouts
- [ ] Automatic column header detection
- [ ] Export to structured formats (JSON, CSV)

## Technical Details

### Dependencies Added

- `pdf.js-extract`: For positioned text extraction
- Compatible with existing `pdf-parse` for raw text

### Files Created

1. `lib/table-extractor.ts` - Core table extraction logic
2. `lib/protocol-list-parser.ts` - Smart protocol parsing
3. `scripts/test-table-parser.ts` - Testing utility
4. `docs/TABLE_PARSER_IMPROVEMENTS.md` - This documentation

### Files Modified

1. `lib/pdf-extractor.ts` - Added table detection
2. `scripts/scraper.ts` - Integrated new parser
3. `package.json` - Added pdf.js-extract dependency

## Conclusion

The improved table parser significantly enhances protocol extraction from CNAS PDFs by:

✅ Using intelligent table detection and column awareness
✅ Providing multiple extraction strategies with automatic fallback
✅ Scoring extraction confidence for quality assurance
✅ Validating and enhancing extracted data
✅ Supporting both tabular and text-based PDF formats

This results in higher accuracy, better data quality, and more robust extraction of therapeutic protocols.
