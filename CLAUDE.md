# Protocoale Terapeutice România - Development Guidelines

## Project Overview

**Protocoale Terapeutice România** is an **independent** comprehensive Romanian therapeutic protocols platform that extracts, processes, and presents CNAS (Casa Națională de Asigurări de Sănătate) therapeutic protocols in an accessible, searchable format. **This platform has no affiliation with CNAS or any governmental institutions.** The system handles complete PDF extraction from official CNAS sources, intelligent data classification, multi-source protocol aggregation, and provides a modern Next.js-based frontend for healthcare professionals.

**Primary Goal**: Transform complex CNAS PDF documents (extracted from official sources) into structured, searchable, and accessible therapeutic protocol data while maintaining 100% content fidelity.

**Legal Status**: Independent voluntary project. All data is extracted from official CNAS sources at https://cnas.ro/protocoale-terapeutice/

## Technology Stack

### Frontend
- **Next.js 15.5.4** (App Router with async params pattern)
- **React 19.0.0** with TypeScript 5.7.3
- **Tailwind CSS 3.4.17** + shadcn/ui components
- **Radix UI** primitives for accessible components
- **TanStack React Query 5.65.0** for data fetching
- **Zustand 5.0.3** for state management
- **Lucide React** for icons
- **date-fns 4.1.0** for date formatting

### Backend & Data
- **PostgreSQL** (via Prisma ORM 6.3.0)
- **Prisma** for type-safe database access
- **Next.js API Routes** (serverless functions)
- **MeiliSearch 0.47.0** for full-text search (optional)

### Data Pipeline & Scraping
- **Crawlee 3.13.4** (Puppeteer + Cheerio) for web scraping
- **Puppeteer 24.1.0** for browser automation
- **pdf-parse 1.1.1** for basic PDF text extraction
- **pdf.js-extract 0.2.1** for advanced positioned text extraction
- **pdf-lib 1.17.1** for PDF manipulation and metadata

### Development Tools
- **tsx 4.19.2** for TypeScript execution
- **ESLint 9.18.0** with Next.js config
- **PostCSS 8.4.49** + Autoprefixer

## Architecture & Design Patterns

### 1. Data Flow Architecture

```
CNAS Website → PDF Download → PDF Extraction → Protocol Parsing → Database Storage → API → Frontend
                    ↓              ↓                   ↓                  ↓
              data/pdfs/      Text + Tables      Validation +      PostgreSQL
                              Positioning        Classification
```

### 2. Multi-Source PDF Strategy

The system handles protocols from two complementary sources:

**Source 1: CNAS Official Multi-Protocol PDFs**
- Location: `data/pdfs/A_C.pdf`, `D_L.pdf`, `M_V.pdf`
- Contains: Comprehensive alphabetical protocol compilations
- Characteristics: Multiple protocols per PDF, requires page number tracking
- Database fields: `officialPdfUrl`, `officialPdfPage`

**Source 2: FormareMedicala.ro Individual PDFs**
- Location: `data/pdfs/individual/`
- Contains: Single protocol per PDF
- Characteristics: Better for individual protocol viewing
- Database fields: `storedPdfUrl`
- Download script: `scripts/download-formaremedicala-pdfs.ts` (363 PDFs downloaded)
- Association script: `scripts/associate-formaremedicala-pdfs.ts` (93 protocols matched, 29.1%)

### 3. PDF Extraction Pipeline

**Stage 1: Advanced Table Detection** (`lib/table-extractor.ts`)
- Uses pdf.js-extract for text positioning (x/y coordinates)
- Column detection via x-position cluster analysis (30px tolerance)
- Row detection via y-position similarity grouping
- Intelligent cell assignment algorithm
- Reconstructs table structure from positioned elements

**Stage 2: Protocol List Parsing** (`lib/protocol-list-parser.ts`)
- Multi-strategy parsing (table + text fallback)
- Automatic PDF type detection (list vs single protocol)
- Confidence scoring system (0-100 scale):
  - Code format validation: 30% weight
  - Title quality assessment: 40% weight
  - Content validity checks: 30% weight
- Protocol validation and filtering (threshold: 50+)
- Metadata enhancement pipeline

**Stage 3: Title Extraction & Validation** (`lib/title-validator.ts`)
- Known protocol titles mapping (KNOWN_PROTOCOL_TITLES)
- Content-based extraction strategies:
  - Protocol header patterns
  - Drug name detection (uppercase words ending with "UM")
  - First meaningful line fallback
- Corruption detection patterns:
  - Table header contamination
  - DCI fragment artifacts
  - Section header misidentification
  - Short titles (< 25 chars)
  - Lowercase/punctuation start corruption

**Stage 4: Text Processing Utilities** (`lib/text-utils.ts`)
- Romanian diacritics normalization
- Whitespace and encoding cleanup
- Line break normalization
- Table header filtering

### 4. Protocol Status Classification System

Protocols are classified into four status categories:

**Active Protocols** (`status: "active"`)
- Current therapeutic protocols available for prescription
- Default status for valid protocols
- Displayed prominently in UI

**Discontinued Protocols** (`status: "discontinued"`)
- Historical protocols no longer in use
- Red badge in UI: "Discontinuat"
- Includes `statusReason` with discontinuation context

**Pending Protocols** (`status: "pending"`)
- Require manual review due to extraction ambiguity
- Yellow badge in UI: "În verificare"
- Includes `statusReason` explaining review need

**Variant Protocols** (`status: "variant"`)
- Genetic mutation codes (e.g., G551D, T790M, L858R)
- Category codes or classification identifiers
- Gray badge in UI: "Variantă / Cod Genetic"
- References `parentProtocolCode` for hierarchical lookup

### 5. Medical Specialty Classification

Automated specialty extraction using multi-signal analysis:

**Signal 1: ATC Classification Mapping** (`scripts/generate-specialties.ts`)
- WHO Anatomical Therapeutic Chemical (ATC) codes
- Level 1 mapping: First letter (A=Alimentary, L=Antineoplastics)
- Level 3 mapping: First 3 chars (L01=Oncology, A10=Diabetes)
- Base score: 10 points per ATC match

**Signal 2: Content-Based Detection**
- Keyword matching in rawText, title, DCI fields
- 17 specialty pattern definitions with domain keywords
- Weight system: 2-3 points per keyword match
- Analyzes first 2000 characters for performance

**Signal 3: Title Analysis**
- Title keyword matches get +5 boost
- Primary specialty: Highest combined score
- Secondary specialties: All ATC categories + scores >15

**Specialty Coverage** (22 medical specialties):
- Oncologie, Reumatologie, Cardiologie, Neurologie, Endocrinologie
- Pneumologie, Gastroenterologie, Hematologie, Nefrologie, Psihiatrie
- Dermatologie, Oftalmologie, Imunologie, Boli Infecțioase, Ginecologie
- Urologie, Pediatrie, Ortopedice, Anestezie, ORL, Parazitologie, Diverse

**Processing Statistics**:
- 418/419 protocols successfully classified (99.8%)
- Oncologie: 98 protocols (23.4%)
- Endocrinologie: 51 protocols (12.2%)
- Multi-category assignment: Many protocols in 2-4 specialties

## Database Schema (Prisma)

### Protocol Model (Main Entity)

**Primary Fields:**
```typescript
id: String (cuid)
code: String (unique) // A001E, B002C, J05AX28
title: String // Full protocol name
dci: String? // International Non-Proprietary Name
specialtyCode: String? // Primary medical specialty
```

**PDF Source Fields:**
```typescript
cnasUrl: String? // CNAS protocol page
officialPdfUrl: String // CNAS multi-protocol PDF URL
officialPdfPage: Int? // Page number in multi-protocol PDF
storedPdfUrl: String? // Individual PDF from formaremedicala.ro
```

**Content Fields (100% Fidelity):**
```typescript
rawText: String @db.Text // Complete raw extracted text
htmlContent: String @db.Text // Full HTML with formatting
structuredJson: Json? // Intelligent sections while preserving everything
```

**Classification & Metadata:**
```typescript
sublists: String[] // Disease codes, sublists
prescribers: String[] // Who can prescribe
canFamilyDoctor: Boolean // Family doctor continuation rights
categories: String[] // Multiple specialties (Oncology, Immunology, etc.)
keywords: String[] // Extracted keywords for search
```

**Status & Versioning:**
```typescript
status: String // "active" | "discontinued" | "pending" | "variant"
statusReason: String? // Explanation for status
parentProtocolCode: String? // For genetic variants
lastCnasUpdate: DateTime? // CNAS official update date
cnasOrderNumber: String? // CNAS order number
publishDate: DateTime?
lastUpdateDate: DateTime?
orderNumber: String? // Ministry order number
version: Int
```

**Quality Assurance:**
```typescript
extractionQuality: Float // 0-100 confidence score
verified: Boolean // Admin verification flag
```

**Relations:**
```typescript
images: ProtocolImage[] // Extracted PDF images
sections: ProtocolSection[] // Structured sections
versions: ProtocolVersion[] // Version history
bookmarks: Bookmark[] // User favorites
```

### Supporting Models

**ProtocolImage**: Stores extracted images with positions, captions, alt text
**ProtocolSection**: Hierarchical sections (indicatie, criterii_includere, tratament)
**ProtocolVersion**: Complete version history with snapshots and changelogs
**Bookmark**: User favorites with personal notes and tags
**ScraperRun**: Scraper execution logs and statistics
**SearchIndex**: Full-text search optimization

## Scripts & Utilities

### PDF Download Scripts

**`scripts/download-full-protocols.ts`**
- Downloads comprehensive CNAS alphabetical PDFs (A_C, D_L, M_V)
- January 2025 complete protocol texts
- Creates `data/pdfs/` directory
- Sequential download with progress logging
- Error handling per PDF (non-blocking failures)

**`scripts/download-missing-cnas-pdfs.ts`**
- Downloads historically missing CNAS protocol lists
- Gap analysis: March 2024 - September 2025
- Includes: vaccine updates, protocol lists, binders
- Duplicate detection via file existence checks
- Download statistics: downloaded, skipped, errors

**`scripts/download-formaremedicala-pdfs.ts`**
- Downloads 363 individual protocol PDFs from formaremedicala.ro
- Uses Puppeteer for robust web scraping
- Extracts protocol codes from filenames (regex: `[A-Z]\d+[A-Z]+\.pdf`)
- Stores in `data/pdfs/individual/`
- Rate limiting: 500ms delay between downloads
- Idempotent: skips existing files

**`scripts/associate-formaremedicala-pdfs.ts`**
- Matches downloaded individual PDFs to database protocols
- Updates `storedPdfUrl` field: `/api/pdfs-individual/{CODE}.pdf`
- Preserves existing `officialPdfUrl`
- Statistics: 93 matched (29.1% of 320 protocols), 189 unmatched

### Extraction & Processing Scripts

**`scripts/scraper.ts`** (Main CNAS scraper)
- Crawlee-based web scraping of CNAS website
- PDF download orchestration
- Integrates protocol-list-parser for extraction
- Logs extraction method and quality scores
- Stores confidence scores in database
- Error handling with retry logic

**`scripts/extract-full-protocols.ts`**
- Processes comprehensive CNAS PDFs (A_C, D_L, M_V)
- Multi-protocol extraction from single PDFs
- Protocol boundary detection
- Individual protocol content extraction
- Batch database updates

**`scripts/process-all-pdfs.ts`**
- Bulk processing utility for all PDFs in `data/pdfs/`
- Sequential processing with progress tracking
- Error aggregation and reporting
- Database population with extracted data

**`scripts/generate-specialties.ts`**
- Analyzes all protocols for specialty classification
- Multi-signal analysis (ATC + content + title)
- Populates `specialtyCode` and `categories` fields
- Progress logging every 50 protocols
- Final statistics with specialty distribution

### Data Quality Analysis Scripts

**`scripts/analyze-invalid-protocols.ts`**
- Comprehensive validation of database entries
- 8 invalid entry categories:
  - DCI_FRAGMENT: Partial DCI extractions
  - SECTION_HEADER: Table of contents entries
  - TABLE_FRAGMENT: Column headers extracted as protocols
  - EMPTY_CODE_REF: Incomplete header extractions
  - PROTOCOL_LIST: Multi-protocol table rows
  - TOO_SHORT: Fragment entries (< 15 chars)
  - CORRUPT_START: Lowercase/punctuation prefix
  - MULTI_PROTOCOL: Table rows with >2 codes
- Generates removal candidate lists with justifications
- High-confidence removal criteria

**`scripts/analyze-corrupted-titles.ts`**
- Identifies malformed protocol titles
- Detection patterns:
  - Short titles (< 25 chars)
  - Lowercase/punctuation start
  - Table row patterns (multiple codes)
  - Numeric prefix (not section numbers)
- Extraction recommendations with potential corrections
- Pattern statistics categorization

**`scripts/check-biomarker-codes.ts`**
- Validates biomarker-like codes (CD19, IL17, B12, etc.)
- Tests 18 codes following biomarker naming
- Distinguishes legitimate protocols from artifacts
- Removal eligibility: content length < 500 chars
- Prevents accidental deletion of valid protocols

**`scripts/check-remaining-suspicious.ts`**
- Post-cleanup validation check
- Quick suspicion filters (simplified criteria)
- First 40 suspicious protocols display
- Verification of data quality improvements

### Data Cleanup Scripts

**`scripts/fix-corrupted-titles.ts`**
- Automated title correction (non-destructive)
- Leverages title-validator.ts strategies:
  - Known protocol lookup
  - Content-based extraction
  - Multi-strategy fallback
- Preview before modification (first 30)
- Post-operation verification
- Per-protocol error handling (non-blocking)
- Statistics: total corrected, failed, remaining issues

**`scripts/remove-gene-entries.ts`**
- Removes genetic mutation codes incorrectly extracted
- Patterns: CFTR (G551D, F508), EGFR (T790M, L858R), BRAF (V600E)
- Also removes: BCR-ABL (T315I), KIT (D816), food additives (E412)
- Preview and verification workflow
- Post-deletion statistics

**`scripts/remove-invalid-protocols.ts`**
- Comprehensive invalid entry removal (120+ codes)
- 8 removal categories with specific justifications
- Category breakdown display
- Preview deletion targets with formatted output
- Verification after deletion (checks for remaining entries)
- Final statistics: total, active, variant, pending counts

### Testing & Development Scripts

**`scripts/test-table-parser.ts`**
- Tests table extraction on individual PDFs
- Usage: `npx tsx scripts/test-table-parser.ts <pdf-path>`
- Displays extraction method, quality score, protocol count
- Output interpretation guide for debugging

**`scripts/test-title-extraction.ts`**
- Tests title extraction strategies
- Validates title-validator.ts functions
- Corruption detection testing
- Correction strategy validation

**`scripts/seed.ts`**
- Development database seeding
- Sample therapeutic protocols for testing
- Eliminates need for full scraper execution
- Quick development environment setup

**`scripts/clear-protocols.ts`**
- Development utility to clear protocols table
- Fresh start for re-extraction testing
- Preserves schema structure

### Specialty-Specific Scripts

**`scripts/fix-psychiatry-protocols.ts`**
- Specialty-specific title corruption fixes
- Psychiatry protocol validation
- Custom extraction logic for psychiatric medications

**`scripts/check-psychiatry-protocols.ts`**
- Lists psychiatry protocols for review
- Specialty-specific validation checks

**`scripts/test-psychiatry-extraction.ts`**
- Tests extraction on psychiatry PDFs
- Specialty-specific extraction debugging

**`scripts/list-psychiatry-protocols.ts`**
- Generates psychiatry protocol listings
- Export utility for specialty review

### Title Cleanup Scripts

**`scripts/clean-duplicate-titles.ts`**
- Identifies and removes duplicate protocol entries
- Title-based deduplication logic
- Preserves highest-quality version
- Statistics on duplicates removed

**`scripts/clean-protocol-titles.ts`**
- General title cleanup utility
- Whitespace normalization
- Encoding fixes
- Romanian diacritics correction

**`scripts/fix-specific-protocols.ts`**
- Manual fixes for specific protocol codes
- Ad-hoc correction utility
- Handles edge cases identified during review

**`scripts/check-specific-protocols.ts`**
- Validates specific protocol codes
- Inspection utility for targeted debugging

## Frontend Architecture

### Next.js 15 Patterns

**Async Params Migration**: All page components and API routes use Next.js 15 async params pattern:

```typescript
// Pages
export default async function ProtocolPage({
  params
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  // ...
}

// API Routes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  // ...
}
```

**Suspense Boundaries**: Components using `useSearchParams` wrapped in Suspense:

```typescript
export default function ProtocolsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProtocolsContent />
    </Suspense>
  )
}
```

**Environment-Aware API URLs**: Dynamic base URL resolution for fetch calls:

```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4444'
const response = await fetch(`${baseUrl}/api/protocols/${code}`)
```

### Page Structure

**`app/page.tsx`** (Homepage)
- Search bar with instant search
- Legal disclaimer section (amber warning banner)
- Protocol statistics display
- Top categories sorted by protocol count (descending)
- Category cards with descriptions and icons
- 22 medical specialty icons and Romanian descriptions
- Mobile-responsive grid layout

**`app/protocoale/page.tsx`** (Protocol Listing)
- Suspense-wrapped ProtocolsContent component
- Search and filter functionality
- Category filtering (22 specialties)
- Status badge display (variant, pending, discontinued)
- Pagination with protocol cards
- Responsive grid (md:2 cols, lg:3 cols, xl:4 cols)

**`app/protocol/[code]/page.tsx`** (Protocol Detail)
- Dynamic route with async params
- Three viewing modes (tabs):
  - Document view (HTML formatted)
  - Structured view (sections/tabs)
  - PDF viewer (iframe integration)
- PDF source prioritization: individual PDF > official PDF
- Page number badge for multi-protocol PDFs
- Metadata display: status, dates, order numbers, specialty
- Status warning panels for non-active protocols

**`app/specialitati/page.tsx`** (Specialties Listing)
- All 22 medical specialties with statistics
- Icons and Romanian descriptions
- Protocol count per specialty
- Category cards linking to filtered protocol lists
- Dynamic base URL for API fetches

**`app/api/pdfs/[filename]/route.ts`**
- Serves CNAS official multi-protocol PDFs
- Security: file existence validation
- Proper Content-Type and Content-Disposition headers
- Error handling: 404/500 responses

**`app/api/pdfs-individual/[filename]/route.ts`**
- Serves individual protocol PDFs from formaremedicala.ro
- Separate endpoint from official PDFs
- Directory: `data/pdfs/individual/`
- Consistent security and error handling

**`app/api/protocols/route.ts`**
- Protocol listing endpoint
- Search, filter, pagination support
- Returns protocol status and CNAS metadata

**`app/api/protocols/[code]/route.ts`**
- Individual protocol detail endpoint
- Full protocol data with content
- Includes status, categories, images, sections

### Component Architecture

**Protocol Components** (`components/protocol/`)

**`protocol-viewer.tsx`**
- Main protocol display component
- Actions section with PDF download buttons:
  - "PDF Individual" (primary) - storedPdfUrl
  - "PDF Oficial CNAS" (outline) - officialPdfUrl with page badge
- Status badges: Variantă, În verificare, Discontinuat
- Status warning panels with contextual information
- Metadata display:
  - "Ultima Actualizare CNAS" (lastCnasUpdate)
  - "Ordin CNAS" (cnasOrderNumber)
  - "Ordin MS/CNAS" (orderNumber)
- PDF viewer tab with source metadata
- Quick-access buttons to switch PDF sources
- Adaptive iframe URL parameters

**`protocol-card.tsx`**
- Protocol card for listings
- Flex-wrap badge container for multiple badges
- Conditional status badge rendering:
  - Gray badge: "Variantă" (variant)
  - Yellow badge: "În verificare" (pending)
  - Red badge: "Discontinuat" (discontinued)
- Title, code, specialty display
- Click navigation to detail page

**`category-card.tsx`**
- Medical specialty category card
- Icon, name, description props
- Protocol count badge
- Responsive hover effects

**`search-bar.tsx`**
- Instant search with debouncing
- Romanian placeholder text
- Search icon integration
- Accessible input field

**`bookmark-button.tsx`**
- User bookmarking functionality
- Session-based or authenticated
- Toggle favorite state
- Visual feedback

**UI Components** (`components/ui/`)
- shadcn/ui components: button, card, input, tabs, badge, separator
- Radix UI primitives: dialog, dropdown-menu, select, slot
- Tailwind-based styling with CSS variables
- Accessible by default

**Layout Components** (`components/layout/`)

**`header.tsx`**
- Site navigation
- Logo and branding
- Search access
- Mobile menu

**`footer.tsx`**
- CNAS attribution links (updated to /protocoale-terapeutice/)
- Resource links (CNAS link in resources column)
- Copyright with "Date furnizate de CNAS" link
- All external links: target="_blank" rel="noopener noreferrer"

## Library Utilities

**`lib/db.ts`**
- Prisma client instantiation
- Connection pooling
- Type-safe database access

**`lib/utils.ts`**
- General utility functions
- Romanian text handling
- className merging (cn utility)
- Date formatting helpers

**`lib/pdf-extractor.ts`**
- PDF text extraction wrapper
- Table detection flags
- Metadata extraction
- Both pdf-parse and pdf.js-extract integration
- Returns: text, metadata, tables, hasTabularData

**`lib/table-extractor.ts`**
- Advanced table extraction engine
- Positioned text analysis (x/y coordinates)
- Column clustering algorithm (30px tolerance)
- Row grouping by y-position similarity
- Cell assignment to table structure
- Noise filtering (single-item clusters)
- Column boundary calculation

**`lib/protocol-list-parser.ts`**
- Multi-strategy protocol parsing orchestrator
- Strategy 1: Table extraction (best for structured PDFs)
- Strategy 2: Text parsing (fallback for irregular content)
- Confidence scoring (0-100):
  - Code format: 30%
  - Title quality: 40%
  - Content validity: 30%
- Protocol validation and filtering
- Merging and deduplication
- Metadata enhancement

**`lib/title-validator.ts`**
- Protocol title validation and correction
- Known protocol titles mapping (KNOWN_PROTOCOL_TITLES)
- Corruption detection:
  - isTitleCorrupted(): Detects various corruption patterns
  - isTitleShort(): Length validation (< 25 chars)
  - startsWithLowercaseOrPunctuation(): Boundary error detection
  - looksLikeTableRow(): Multi-code pattern detection
  - hasUnexpectedNumericPrefix(): Section number validation
- Content-based extraction:
  - extractTitleFromRawText(): Multiple regex strategies
  - Protocol header patterns
  - Drug name detection (uppercase + "UM" suffix)
  - First meaningful line extraction
- Used by fix-corrupted-titles.ts and analyze scripts

**`lib/text-utils.ts`**
- Romanian diacritics normalization (ă, â, î, ș, ț)
- Whitespace cleanup
- Encoding fixes (UTF-8)
- Line break normalization
- Table header filtering (COD PROTOCOL, DCI, PROTOCOL)
- Text fragment extraction
- String similarity functions

**`lib/bookmarks.ts`**
- Bookmark management utilities
- CRUD operations for user favorites
- Session-based storage
- Tag and note handling

## Development Workflow

### Port Configuration
- Development server: Port **4444** (not 3000)
- `package.json` scripts:
  - `npm run dev`: `next dev -p 4444`
  - `npm run start`: `next start -p 4444`
  - `prestart`: Kills existing process on 4444 (fuser/lsof)

### Environment Variables
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:4444" # Development
# Production: Set to actual domain
```

### Database Workflow
```bash
# Apply schema changes
npm run db:push

# Open Prisma Studio (GUI)
npm run db:studio

# Generate Prisma Client (after schema changes)
npx prisma generate
```

### Data Pipeline Workflow
```bash
# 1. Download PDFs
npx tsx scripts/download-full-protocols.ts
npx tsx scripts/download-missing-cnas-pdfs.ts
npx tsx scripts/download-formaremedicala-pdfs.ts

# 2. Run scraper (CNAS extraction)
npm run scraper

# 3. Process individual PDFs
npx tsx scripts/process-all-pdfs.ts
npx tsx scripts/extract-full-protocols.ts

# 4. Associate individual PDFs
npx tsx scripts/associate-formaremedicala-pdfs.ts

# 5. Generate specialties
npx tsx scripts/generate-specialties.ts

# 6. Data quality analysis
npx tsx scripts/analyze-invalid-protocols.ts
npx tsx scripts/analyze-corrupted-titles.ts
npx tsx scripts/check-biomarker-codes.ts

# 7. Data cleanup
npx tsx scripts/fix-corrupted-titles.ts
npx tsx scripts/remove-gene-entries.ts
npx tsx scripts/remove-invalid-protocols.ts

# 8. Verification
npx tsx scripts/check-remaining-suspicious.ts
```

### Testing Workflow
```bash
# Test table parser on specific PDF
npx tsx scripts/test-table-parser.ts data/pdfs/A_C.pdf

# Test title extraction
npx tsx scripts/test-title-extraction.ts

# Test psychiatry extraction
npx tsx scripts/test-psychiatry-extraction.ts

# Seed development database
npx tsx scripts/seed.ts
```

## Key Implementation Details

### Legal Disclaimer (Homepage)
- Prominent amber warning banner between search and statistics
- Two-paragraph structure:
  - Paragraph 1: Platform purpose, CNAS attribution, extraction disclaimers
  - Paragraph 2: Bold "Nu reprezintă sfat medical" + physician consultation emphasis
- Links to official CNAS source: `https://cnas.ro/protocoale-terapeutice/`
- Liability mitigation for extraction errors, data staleness, medical decisions

### Category Sorting & Descriptions
- Homepage categories sorted by protocol count (descending)
- All 22 specialties displayed (no 8-category limit)
- Romanian descriptions with clinical context
- getCategoryDescription() helper function with specialty-specific text
- Icon system: 🩺 Oncologie, ❤️ Cardiologie, 🧠 Neurologie, etc.

### Protocol Status UI
- **Card Level**: Compact status badges (Variantă, În verificare, Discontinuat)
- **Viewer Level**: Detailed status warning panels with:
  - Contextual emoji indicators (ℹ️, ⚠️, 🚫)
  - Status titles
  - statusReason explanation
  - parentProtocolCode reference (bold) for variants
- Color coding: Gray (variant), Yellow (pending), Red (discontinued)

### PDF Dual-Source Integration
- **Individual PDFs prioritized** in iframe viewer (better UX)
- **Official PDFs** always accessible with page number guidance
- Actions section shows both download options when available
- Source metadata display: "FormareMedicala.ro" vs "CNAS oficial"
- Seamless switching between PDF sources
- Backward compatible: protocols without storedPdfUrl still work

### Next.js 15 Hydration
- useSearchParams requires Suspense boundary
- Prevents hydration mismatches
- Fallback UI: Loader2 spinner with medical-blue theme
- Applies to: ProtocolsContent component (protocoale/page.tsx)

## Git Commit Standards

### Commit Message Structure

**Format**: Technical, comprehensive, and detailed commit messages that fully document changes.

**Required Elements**:
1. **First Line**: Imperative present tense summary (50-80 chars)
2. **Blank Line**
3. **Detailed Body**: Multi-paragraph technical explanation covering:
   - Architecture changes with file paths and line numbers
   - Implementation details and algorithms
   - Rationale for design decisions
   - User experience impacts
   - Performance considerations
   - Edge cases and error handling
   - Statistics and metrics when applicable
   - Future enhancement opportunities

**File-Level Documentation**: For each modified file, include:
- File path
- Section headers for major changes
- Line number references for specific changes
- Before/after behavior explanations
- Parameter descriptions
- Return value documentation

### Example Commit Structure

```
Implement individual protocol PDF download and integration from FormareMedicala.ro

Adds comprehensive functionality to download, store, and serve individual protocol PDFs from FormareMedicala.ro as a complement to existing CNAS multi-protocol PDFs. The system now supports dual PDF sources with intelligent UI presentation.

Architecture Changes:

Database Schema (prisma/schema.prisma):
- Add officialPdfPage field (Int?) to Protocol model for tracking page numbers in multi-protocol PDFs
- Clarifies storedPdfUrl purpose: individual protocol PDFs from formaremedicala.ro
- Clarifies officialPdfUrl purpose: CNAS multi-protocol PDFs

[... continues with extensive technical detail ...]
```

### Grouping Strategy

**Strategic File Grouping**: Group files into commits based on logical feature boundaries and long-term maintainability:

1. **Feature Cohesion**: Files that implement a complete feature together
2. **Layer Separation**: Database changes separate from frontend changes when appropriate
3. **Utility Independence**: Shared utilities in separate commits when reusable
4. **Documentation Alignment**: Docs committed with related features

**Examples of Good Groupings**:
- Database schema + TypeScript types + API routes (complete vertical slice)
- Multiple analysis scripts (related by purpose: data quality)
- Multiple cleanup scripts (related by function: data repair)
- Frontend components + their styles + related pages (UI feature)

### Prohibited Practices

- **DO NOT** credit Claude Code or Anthropic in commit messages
- **DO NOT** change git author name: Must remain "Andrei Hodorog"
- **DO NOT** change git email: Must remain "contact@aboutadhd.ro"
- **DO NOT** use generic commit messages like "fix bug" or "update code"
- **DO NOT** commit without comprehensive technical documentation

### Commit Message Characteristics

**Technical Depth**: Explain what, why, and how for every change
**Context Preservation**: Future maintainers should understand decisions from commit alone
**Searchability**: Include keywords like file paths, function names, error patterns
**Completeness**: Document all significant changes, not just the "main" one
**Statistics**: Include metrics when available (protocols processed, success rates, etc.)
**Edge Cases**: Document known limitations and future improvement opportunities

## Project Statistics (As of Latest Commit)

- **Total Protocols in Database**: 320 active protocols
- **Protocols with Individual PDFs**: 93 (29.1%)
- **Individual PDFs Downloaded**: 363 from FormareMedicala.ro
- **Unmatched PDFs**: 189 (candidates for database expansion)
- **Medical Specialties**: 22 categories
- **Top Specialty**: Oncologie with 98 protocols (23.4%)
- **Specialty Classification Success**: 418/419 protocols (99.8%)
- **Development Port**: 4444 (not 3000)
- **Next.js Version**: 15.5.4 with App Router
- **React Version**: 19.0.0
- **TypeScript Version**: 5.7.3
- **Prisma Version**: 6.3.0

## Data Quality Insights

### Extraction Challenges Identified
- Table header contamination in titles
- Genetic mutation codes misidentified as protocols (G551D, T790M, etc.)
- Food additive codes in protocol text (E412, E1200)
- DCI fragment artifacts (").*DCI" pattern)
- Section headers extracted as protocols (Indicații, table of contents)
- Multi-protocol table rows extracted as single entries
- Short fragment entries (< 15 characters)
- Lowercase/punctuation-prefixed corruption

### Quality Assurance Pipeline
1. Confidence scoring during extraction (0-100)
2. Automated analysis scripts (identify issues)
3. Manual review for edge cases (biomarker codes)
4. Title correction scripts (non-destructive repair)
5. Invalid entry removal scripts (with preview)
6. Post-cleanup verification (remaining suspicious check)
7. Database consistency checks

### Known Edge Cases
- Some psychiatry protocols have unique formatting
- Historical protocols may have incomplete metadata
- Genetic variants require parent protocol lookups
- Multi-page tables span protocol boundaries
- Romanian diacritics in some PDFs require normalization

## Future Enhancement Opportunities

### Data Pipeline
- OCR support for scanned PDFs
- Multi-page table handling improvements
- Better DCI extraction from separate columns
- Merged cell support in table extraction
- Rotated/vertical text handling
- Machine learning-based table detection
- Automatic header detection
- Export to JSON/CSV formats

### Features
- Protocol comparison (side-by-side diff viewer)
- Version history with visual diff
- In-protocol search (highlight matches)
- Export capabilities (PDF, Word, structured data)
- AI-powered Q&A chatbot for protocol questions
- Mobile PWA support
- Offline capability with protocol caching
- User accounts with personalized bookmarks
- Email notifications for protocol updates

### Data Expansion
- Populate database with 189 unmatched FormareMedicala.ro PDFs
- Implement automated page number detection for multi-protocol PDFs
- Add periodic sync script for FormareMedicala.ro updates
- Historical protocol version tracking
- Protocol change notifications

### Performance
- CDN integration for PDF serving
- MeiliSearch full integration for instant search
- Redis caching for frequent queries
- Image optimization for protocol figures
- Lazy loading for long protocol content
- Service worker for offline support

### Accessibility & SEO
- WCAG 2.1 AA compliance audit
- Screen reader optimization
- Keyboard navigation improvements
- Semantic HTML enhancements
- Structured data for search engines (Schema.org)
- Open Graph tags for social sharing

## Romanian Language Considerations

### Diacritics Support
- Full support: ă, â, î, ș, ț
- Normalization in lib/text-utils.ts
- Search queries handle diacritics gracefully
- Database stores UTF-8 encoded text

### UI Text Standards
- All interface text in Romanian
- Medical terminology follows CNAS nomenclature
- Professional tone for healthcare audience
- Clear, concise descriptions
- Accessibility-friendly language

### Common Romanian UI Text
- "Caută protocoale terapeutice..." (Search placeholder)
- "Filtreează după:" (Filter by)
- "Indicația Terapeutică" (Therapeutic Indication)
- "Criterii de Includere în Tratament" (Treatment Inclusion Criteria)
- "Descarcă PDF Original" (Download Original PDF)
- "Salvează în favorite" (Save to favorites)
- "Protocol în Verificare" (Protocol under review)
- "Protocol Discontinuat" (Discontinued protocol)
- "Cod Variantă / Genetic" (Variant/Genetic code)

## Design Principles

1. **Clarity over Complexity**: Medical information must be crystal-clear
2. **Progressive Disclosure**: Show overview first, details on demand
3. **Trust & Transparency**: Always link to official CNAS PDFs
4. **Accessibility First**: WCAG 2.1 AA compliance target
5. **Mobile-First**: 60%+ healthcare professionals use mobile
6. **Performance**: Sub-1-second search, instant navigation
7. **Offline Capability**: Cache critical protocols for reliability
8. **Data Integrity**: 100% content fidelity from source PDFs

## Security Considerations

- All external links use `rel="noopener noreferrer"`
- API routes validate file paths (no directory traversal)
- PDF serving includes security checks (file existence, path validation)
- Database queries use Prisma ORM (SQL injection prevention)
- Environment variables for sensitive configuration
- CORS headers for API routes (production)

## Maintenance Guidelines

### Regular Tasks
- Monitor scraper execution logs
- Review data quality analysis output
- Check for new CNAS protocol updates
- Validate extraction quality scores
- Update specialty classifications as needed
- Review and merge unmatched PDFs

### Database Maintenance
- Run VACUUM on PostgreSQL periodically
- Monitor database size and growth
- Review slow query logs
- Update indexes based on query patterns
- Backup database before major cleanups

### Code Maintenance
- Update dependencies regularly (security patches)
- Review ESLint warnings and errors
- Test extraction pipeline on new PDF formats
- Update title-validator.ts with new corruption patterns
- Document new edge cases discovered

### When to Run Cleanup Scripts
- After major scraper runs
- When extraction quality drops below threshold
- After schema changes affecting protocol data
- When adding new PDF sources
- Before production deployments

---

**Last Updated**: October 15, 2025
**Project Status**: Active Development
**Version**: 0.1.0
**Primary Maintainer**: Andrei Hodorog (contact@aboutadhd.ro)
