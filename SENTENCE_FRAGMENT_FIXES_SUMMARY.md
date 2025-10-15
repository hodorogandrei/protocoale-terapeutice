# Sentence Fragment Title Fixes - Complete Summary

**Date:** October 15, 2025
**Focus:** Protocols with sentence fragment titles (examples: R03AC13, R03BB06)
**Total Fixed:** 43 protocols
**Success Rate:** 100%

---

## 📊 Problem Identification

### Initial Analysis

Found **95 protocols** with sentence fragment titles using pattern detection:

| Pattern Type | Count | Examples |
|-------------|-------|----------|
| Romanian sentence structures (cu, de, la, în...) | 76 | "Astmul Bronşic persistent, forme moderate..." |
| Medical condition fragments | 4 | "Cancer mamar HER2 pozitiv" |
| Protocol headers | 5 | "Protocol terapeutic corespunzător..." |
| Lowercase starts | 2 | "intestinale c-kit pozitive" |
| Numeric prefixes | 6 | "09 VACCIN MENINGOCOCIC..." |
| List items | 2 | "- leucemie acută mieloidă" |

### Refinement Process

After implementing ALL CAPS drug name validation (to avoid false positives), reduced to **91 actual sentence fragments**.

Excluded valid titles that matched patterns but were correct:
- "COMPLEX DE HIDROXID FER (III) SUCROZĂ" - valid Romanian drug name with "de"
- "INHIBITOR DE PROTEAZA" - valid drug name with "de"
- Similar properly formatted drug names

---

## 🔧 Fix Strategy Development

### Multi-Strategy Approach

**Strategy 1: DCI Field Validation (HIGH confidence)**
- Validate DCI field meets criteria:
  - Length 5-100 characters
  - Starts with uppercase
  - No metadata terms (Informații, Pagina, Protocol, CNAS)
  - No sentence fragments (cu, la, în, pentru, care, este, sunt)
  - Not truncated version of current title
  - Not generic terms (COMBINAȚII)
  - Drug name pattern: ends with UM/IN/AN/OL/ID/AT/AB/IL/MAB or ALL CAPS

**Strategy 2: Content Extraction (MEDIUM confidence)**
- Extract from rawText using:
  - DCI: pattern matching
  - Protocol header with code pattern
  - Drug name pattern (uppercase words ending with UM)

**Strategy 3: Manual Review (LOW confidence)**
- No valid DCI or extractable title found
- Proposed title unchanged or invalid

### Results by Confidence Level

| Confidence | Count | Action |
|------------|-------|--------|
| HIGH | 33 | Curated to 30, applied all |
| MEDIUM | 19 | Curated to 13 safe ones, applied all |
| LOW | 39 | Flagged for manual review |

---

## ✅ Fixes Applied

### HIGH Confidence Fixes (30 protocols)

**Category: Sentence Fragments → DCI**

| Code | Old Title (truncated) | New Title | Type |
|------|----------------------|-----------|------|
| A005E | "Paricalcitolum este recomandat în:" | PARICALCITOLUM | Sentence |
| A008E | "Boala Gaucher este o boală monogen..." | IMIGLUCERASUM | Description |
| A016E | "Insulina aspart este un analog de..." | INSULINUM ASPART | Sentence |
| A029E | "Insulina lispro forma premixată..." | INSULINUM LISPRO | Sentence |
| A10BH02 | "VILDA*LIPTINUM este indicată..." | VILDAGLIPTINUM | Sentence |
| A10BJ05 | "Dulaglutid este indicată la adulţi..." | DULAGLUTIDUM | Sentence |
| A10BX10 | "A. Lixisenatida este indicată..." | LIXISENATIDUM | Sentence |
| B014I | "Sulodexidul prezintă o acţiune..." | SULODEXIDUM | Sentence |
| B01AC24 | "DCI Ticagrelorum este indicat..." | TICAGRELOR | Sentence |
| B02BX06 | "Date despre hemofilia A congenitală:" | EMICIZUMAB | Header |
| B06AC01 | "INHIBITOR DE ESTERAZ INHIBITOR DE..." | INHIBITOR DE ESTERAZĂ C1 | Duplicate |
| C03XA01 | "Scopul actualului protocol este..." | TOLVAPTAN | Sentence |
| D11AH05-A | "DA, în baza scrisorii medicale..." | DUPILUMABUM | Fragment |
| H01AC03 | "Creşterea liniară postnatală..." | MECASERMIN | Sentence |
| J001G | "IMUNOGLOBULINĂ NORMALĂ PENTRU..." | IMUNOGLOBULINA NORMALĂ | Duplicate |
| J06BB16 | "Infecțiile cu virus respirator..." | PALIVIZUMABUM | Sentence |
| L003C | "Fulvestrantum este indicat în..." | FULVESTRANTUM | Sentence |
| L01EH03 | "Cancer mamar HER2 pozitiv" | TUCATINIBUM | Disease |
| L01XC31 | "Avelumab este indicat ca mono..." | AVELUMABUM | Sentence |
| L01XE12 | "Carcinomul medular tiroidian..." | VANDETANIB | Sentence |
| L01XE13 | "Protocol terapeutic corespunzător..." | AFATINIBUM | Header |
| L01XE33 | "Palbociclib este indicat în..." | PALBOCICLIBUM | Sentence |
| L01XX45 | "HORMONULUI DE CREȘTERE CARFILZ..." | CARFILZOMIBUM | Corrupted |
| L040C | "GOLIMUMABUM** GOSERELINUM NU NU..." | GOSERELINUM | Mixed |
| N016F | "Antipsihotice de generaţia a 2-a" | CLOZAPINUM | Category |
| N028F | "Nota: protocoalele terapeutice..." | PALIPERIDONUM | Note |
| N07XX12 | "BOALA: Amiloidoza mediată de..." | PATISIRANUM | Disease |
| **R03AC13** | **"Astmul Bronşic persistent, forme..."** | **FORMOTEROLUM** | **User example** |
| **R03BB06** | **"Bronopneumonia obstructivă cronică..."** | **GLICOPIRONIUM** | **User example** |
| R07AX02 | "Ivacaftor comprimate este de..." | IVACAFTORUM | Sentence |

### MEDIUM Confidence Fixes - Safe Subset (13 protocols)

**Category: Duplicated Drug Names + Extra Text → Clean Drug Name**

| Code | Old Title (truncated) | New Title | Issue |
|------|----------------------|-----------|-------|
| A10BJ01 | "EXENATIDUM EXENATIDUM DA, doar..." | EXENATIDUM | Duplicate + metadata |
| A10BJ02 | "LIRAGLUTIDUM LIRAGLUTIDUM C2- P5..." | LIRAGLUTIDUM | Duplicate + metadata |
| A10BK03 | "EMPAGLIFLOZINUM EMPAGLIFLOZINUM C2..." | EMPAGLIFLOZINUM | Duplicate + metadata |
| A10BX09 | "DAPAGLIFLOZINUM DA, în dozele şi..." | DAPAGLIFLOZINUM | Drug + metadata |
| B06AC05 | "LANADELUMABUM LANADELUMABUM C2-P6..." | LANADELUMABUM | Duplicate + metadata |
| J05AX18 | "LETERMOVIRUM C2-P9.1, P9.7 spec..." | LETERMOVIRUM | Drug + metadata |
| J05AX28 | "BULEVIRTIDUM BULEVIRTIDUM C1-G4..." | BULEVIRTIDUM | Duplicate + metadata |
| L01XE18 | "RUXOLITINIBUM RUXOLITINIBUM C2-P3..." | RUXOLITINIBUM | Duplicate + metadata |
| L01XE31 | "NINTEDANIBUM NINTEDANIBUM OFEV C1..." | NINTEDANIBUM | Duplicate + metadata |
| L01XE44 | "LORLATINIBUM NU DA, doar medicii..." | LORLATINIBUM | Drug + metadata |
| L01XX46 | "OLAPARIBUM OLAPARIBUM C2-P3 DA..." | OLAPARIBUM | Duplicate + metadata |
| L02BB05 | "APALUTAMIDUM tehnice de realizare..." | APALUTAMIDUM | Drug + metadata |
| L04AA25-HPN | "NOCTURNA NU DA,in dozele si pe..." | ECULIZUMABUM | Extracted from content |

---

## 🚫 Excluded from Application

### HIGH Confidence Proposals NOT Applied (3 protocols)

| Code | Current Title | Proposed Title | Reason for Exclusion |
|------|--------------|----------------|----------------------|
| A010N | COMPLEX DE HIDROXID FER (III) SUCROZĂ | COMPLEX DE HIDROXID | DCI truncated - current better |
| L01XE50 | ABEMACICLIBUM de realizare... | ONIVYDE PEGYLATED LIPOSOMAL | DCI mismatch with code |
| M05BX04 | DENOSUMAB NU DA, pot continua... | PROLIA | Brand name, not DCI |

### MEDIUM Confidence Proposals NOT Applied (6 protocols)

| Code | Reason |
|------|--------|
| A10AE56 | Proposed "INSULINUM" truncates "INSULINUM DEGLUDEC + LIRAGLUTIDUM" |
| CI01I-HTP | Protocol reference, needs further review |
| G27 | Multi-drug list, complex case |
| G31E | Note text, needs validation |
| L01FD04 | Combination drug, needs review |
| (1 more) | See data/sentence-fragment-fixes.json |

---

## 📈 Impact Assessment

### Database Quality Improvements

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Total protocols** | 320 | 320 | - |
| **Sentence fragments fixed** | 95 identified | 43 fixed | **-45.3%** |
| **Corrupted titles** | 16 | 11 | **-5 (-31%)** |
| **Good content (>500 chars)** | 294 | 294 | Maintained |
| **Success rate** | - | 100% | **43/43** |

### Remaining Work

| Category | Count | Action Needed |
|----------|-------|---------------|
| LOW confidence sentence fragments | 39 | Manual review and individual fixes |
| Excluded HIGH confidence | 3 | Need alternative strategies |
| Excluded MEDIUM confidence | 6 | Content re-extraction or manual fixes |
| **Total remaining** | **48** | **Future cleanup phase** |

---

## 🛠️ Technical Implementation

### Scripts Created

1. **`scripts/investigate-sentence-fragments.ts`**
   - Analyzed specific examples (R03AC13, R03BB06)
   - Detected 8 sentence fragment patterns
   - Found 95 protocols (refined to 91)
   - Identified 45 with usable DCI fields

2. **`scripts/fix-sentence-fragments.ts`**
   - Multi-strategy title extraction
   - Confidence scoring (HIGH/MEDIUM/LOW)
   - DCI validation with 7 criteria
   - Content extraction with 3 strategies
   - Generated data/sentence-fragment-fixes.json

3. **`scripts/apply-sentence-fragment-fixes.ts`**
   - Manually curated fix application
   - 30 HIGH + 13 MEDIUM safe fixes
   - Excluded problematic proposals
   - 100% success rate (43/43)

### Validation Rules Implemented

**DCI Field Validation:**
```typescript
- Length: 5-100 characters
- Format: Starts with uppercase
- Reject: metadata (Informații, Pagina, Protocol, CNAS, "DCI ")
- Reject: sentence fragments (cu, la, în, pentru, care, este, sunt)
- Reject: truncated (first word only of multi-word title)
- Reject: generic terms (COMBINAȚII)
- Accept: drug suffixes (UM, IN, AN, OL, ID, AT, AB, IL, MAB, LIPOSOMAL)
- Accept: ALL CAPS drug names (>5 chars)
```

**Sentence Fragment Detection (with false positive prevention):**
```typescript
- Skip ALL CAPS drug names (>70% uppercase ratio)
- Detect: lowercase start, numeric prefix, Roman numerals
- Detect: list items (-, •)
- Detect: Romanian sentences (cu, de, la, în, pentru...)
- Detect: section headers (Pacient, Criterii, Indicat...)
- Detect: medical terms (leucem, cancer, diabet, scleroz...)
```

---

## 📁 Generated Data Files

1. **`data/sentence-fragment-fixes.json`**
   - Complete analysis of 91 sentence fragments
   - Proposals organized by confidence level
   - Includes reasoning and strategy for each
   - Used for manual curation and review

---

## 💡 Key Learnings

### What Worked Well

1. **Multi-Strategy Approach**: Combining DCI validation with content extraction caught most cases
2. **Confidence Scoring**: 3-tier system allowed safe automated fixes while flagging edge cases
3. **Manual Curation**: Reviewing HIGH confidence proposals prevented 3 bad fixes
4. **Pattern Refinement**: Adding ALL CAPS validation eliminated false positives
5. **User Examples**: R03AC13 and R03BB06 were successfully fixed as requested

### Challenges Encountered

1. **DCI Field Quality**: Some DCI fields are truncated, mismatched, or contain brand names
2. **Romanian Prepositions**: "DE" commonly appears in valid drug names (e.g., "INHIBITOR DE")
3. **Metadata Contamination**: Many titles contain CNAS codes, dates, or prescriber info
4. **Multi-Drug Protocols**: Some protocols cover multiple drugs, making single DCI extraction difficult

### Best Practices Established

1. Always validate DCI fields against multiple criteria, not just format
2. Check for truncation by comparing DCI to current title
3. Manually curate HIGH confidence fixes before application
4. Prefer content extraction when DCI field is questionable
5. Flag protocols with complex issues for manual review

---

## 📋 Recommendations for Future Work

### Immediate (Next Phase)

1. **Manual Review LOW Confidence (39 protocols)**
   - Individual investigation per protocol
   - Custom extraction strategies
   - May require PDF consultation

2. **Resolve Excluded Cases (9 protocols)**
   - A010N: Keep current title (better than truncated DCI)
   - L01XE50: Investigate DCI mismatch
   - M05BX04: Find actual DCI (not brand PROLIA)
   - Others: Content re-extraction or individual fixes

3. **Expand DCI Validation**
   - Build comprehensive drug name suffix list
   - Add Romanian pharmaceutical term dictionary
   - Implement combination drug pattern detection

### Long-term

1. **Automated DCI Extraction**
   - Parse official CNAS PDFs for DCI fields
   - Cross-reference with ATC classification
   - Build canonical drug name database

2. **Content Structure Analysis**
   - Extract structured protocol headers
   - Identify DCI field positions consistently
   - Build protocol template recognition

3. **Quality Assurance Pipeline**
   - Automated title validation on import
   - Flag sentence fragments during extraction
   - Suggest corrections in real-time

---

## 🏆 Success Metrics

✅ **43 protocols improved** (45.3% of identified sentence fragments)
✅ **100% success rate** (no failed updates)
✅ **0 data loss** (all content preserved)
✅ **31% reduction** in corrupted titles (16 → 11)
✅ **User examples fixed** (R03AC13, R03BB06)
✅ **Comprehensive documentation** (scripts, analysis, reasoning)
✅ **Reusable utilities** (validation functions, extraction strategies)

---

## 📝 Conclusion

The sentence fragment title cleanup achieved significant improvements in database quality:

- **Fixed both user-provided examples** (R03AC13, R03BB06) successfully
- **Cleaned 43 sentence fragment titles** with 100% success rate
- **Reduced corrupted titles by 31%** through targeted fixes
- **Preserved 100% of content** - no data loss
- **Established reusable patterns** for future cleanup work

The remaining 48 sentence fragment protocols require more complex strategies:
- 39 LOW confidence need individual review
- 9 excluded cases need custom solutions

The multi-strategy approach (DCI validation + content extraction + manual curation) proved effective and can be applied to other title quality issues in the database.

---

**Work completed by:** Claude Code
**Date:** October 15, 2025
**Related documents:**
- PROTOCOL_FIXES_SUMMARY.md (previous cleanup work)
- data/sentence-fragment-fixes.json (complete analysis)
