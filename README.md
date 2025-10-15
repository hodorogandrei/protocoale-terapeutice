# Protocoale Terapeutice România 🇷🇴

Platformă independentă cu date de la CNAS pentru accesarea și vizualizarea protocoalelor terapeutice din România.

## 🎯 Caracteristici Principale

- ✅ **Extragere Completă PDF** - Extrage și afișează 100% din conținutul protocoalelor
- 🔍 **Căutare Avansată** - Căutare instant cu filtre multiple
- 📱 **Design Responsive** - Optimizat pentru desktop, tablet și mobil
- 🇷🇴 **Interfață în Română** - Toate textele în limba română cu suport diacritice (ă, â, î, ș, ț)
- 📄 **Trei Moduri de Vizualizare**:
  - Vizualizare Document (HTML formatat)
  - Vizualizare Structurată (tabs/secțiuni)
  - PDF Original (viewer integrat)
- ⚡ **Actualizări Automate** - Sincronizare zilnică cu site-ul CNAS
- 🔖 **Bookmarks** - Salvează protocoale favorite
- 📊 **Comparare Protocoale** - Vezi diferențele între versiuni

## 🏗️ Arhitectură

### Frontend
- **Next.js 15** (App Router)
- **React 19** cu TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **React Query** pentru data fetching
- **Zustand** pentru state management

### Backend
- **Next.js API Routes** (serverless)
- **PostgreSQL** + **Prisma ORM**
- **MeiliSearch** pentru căutare full-text
- **Redis** pentru caching (opțional)

### Data Pipeline
- **Crawlee** (Puppeteer + Cheerio) pentru scraping CNAS
- **pdf-parse** pentru extragere text
- **pdf-lib** pentru metadata
- **AI (GPT-4/Claude)** pentru structurare inteligentă (opțional)

## 🚀 Setup Local

### Prerequisite

- Node.js 18+
- PostgreSQL 14+
- npm sau yarn

### Instalare

1. **Clone repository-ul**:
```bash
git clone <repository-url>
cd protocoale-terapeutice
```

2. **Instalează dependențele**:
```bash
npm install
```

3. **Configurează environment variables**:
```bash
cp .env.example .env
```

Editează `.env` și completează:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/protocoale_terapeutice"
MEILISEARCH_HOST="http://localhost:7700"
```

4. **Setup PostgreSQL database**:
```bash
# Creează baza de date
createdb protocoale_terapeutice

# Generează Prisma Client
npx prisma generate

# Aplică schema
npx prisma db push
```

5. **Pornește development server**:
```bash
npm run dev
```

Aplicația va fi disponibilă la: `http://localhost:3000`

### Comenzi Utile

```bash
# Development
npm run dev            # Pornește dev server

# Database
npm run db:push       # Aplică schema la baza de date
npm run db:studio     # Deschide Prisma Studio (GUI pentru DB)

# Build pentru producție
npm run build
npm run start

# Scraper
npm run scraper       # Rulează scraper-ul CNAS (după implementare)
```

## 📁 Structura Proiectului

```
protocoale-terapeutice/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Layout principal cu metadata română
│   ├── page.tsx           # Homepage
│   ├── globals.css        # Stiluri globale + Romanian typography
│   ├── protocoale/        # Listare protocoale
│   └── protocol/[id]/     # Detalii protocol (3 viewing modes)
│
├── components/
│   ├── ui/                # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   └── separator.tsx
│   │
│   ├── protocol/          # Protocol-specific components
│   │   ├── protocol-card.tsx
│   │   ├── protocol-viewer.tsx
│   │   ├── protocol-tabs.tsx
│   │   └── protocol-search.tsx
│   │
│   └── layout/            # Layout components
│       ├── header.tsx
│       ├── footer.tsx
│       └── sidebar.tsx
│
├── lib/
│   ├── db.ts              # Prisma client
│   ├── utils.ts           # Utility functions (Romanian text handling)
│   └── pdf-extractor.ts   # PDF extraction pipeline
│
├── types/
│   └── protocol.ts        # TypeScript types & Romanian UI text
│
├── prisma/
│   └── schema.prisma      # Database schema (complete protocol storage)
│
├── scripts/
│   ├── scraper.ts         # CNAS web scraper
│   └── pdf-processor.ts   # PDF processing pipeline
│
├── public/                # Static assets
│
└── data/                  # Scraped data (gitignored)
    ├── pdfs/             # Downloaded PDFs
    └── temp/             # Temporary files
```

## 🗄️ Schema Bază de Date

### Protocol (Model Principal)
Stochează ÎNTREGUL conținut al protocoalelor:
- `rawText`: Text complet extras
- `htmlContent`: HTML cu formatare
- `structuredJson`: Structură inteligentă (JSON)
- `images`: Imagini extrase din PDF
- `sections`: Secțiuni structurate
- `versions`: Istoric versiuni

Vezi `prisma/schema.prisma` pentru schema completă.

## 📝 TODO Implementation

### Phase 1: Foundation ✅
- [x] Next.js 15 setup cu TypeScript
- [x] Tailwind + shadcn/ui components
- [x] Prisma schema pentru conținut complet
- [x] Romanian typography support

### Phase 2: Data Pipeline (În Curs)
- [ ] Web scraper pentru CNAS website
- [ ] PDF downloader automat
- [ ] PDF extraction pipeline (text + tables + images)
- [ ] OCR pentru PDF-uri scanate
- [ ] AI-assisted structuring (opțional)
- [ ] Admin interface pentru validare

### Phase 3: Core Features
- [ ] Homepage cu căutare
- [ ] Listare protocoale cu filtre
- [ ] Protocol detail pages (3 viewing modes)
- [ ] MeiliSearch integration
- [ ] Bookmarks & favorites

### Phase 4: Advanced Features
- [ ] Protocol comparison
- [ ] Version history & diff viewer
- [ ] In-protocol search
- [ ] Export (PDF, Word)
- [ ] AI-powered Q&A chatbot

### Phase 5: Production
- [ ] Mobile optimization
- [ ] PWA support
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Deploy to production

## 🔄 Automated Updates

Scraper-ul se execută automat zilnic pentru:
1. Verifică protocoale noi pe site-ul CNAS
2. Descarcă PDF-uri noi/actualizate
3. Extrage conținut complet
4. Actualizează baza de date
5. Trimite notificări pentru protocoale noi

## 🎨 Design Principles

1. **Claritate peste Complexitate** - Informații medicale trebuie să fie cristal-clare
2. **Progressive Disclosure** - Arată overview-ul primul, detalii la cerere
3. **Încredere & Transparență** - Link mereu către PDF-uri oficiale
4. **Accessibility First** - WCAG 2.1 AA compliance
5. **Mobile-First** - 60%+ profesioniști sănătate folosesc mobile
6. **Performance** - Căutare sub 1 secundă, navigare instantă
7. **Offline Capability** - Cache protocoale critice

## 📖 Romanian UI Text

Toate textele din interfață sunt în română:
- Caută protocoale terapeutice...
- Filtreză după: Specialitate, Medicament, Boală
- Indicația Terapeutică
- Criterii de Includere în Tratament
- Descarcă PDF Original
- Salvează în favorite

Vezi `types/protocol.ts` pentru UI_TEXT constants.

## 🤝 Contributing

Contribuții sunt binevenite! Te rugăm să:
1. Fork repository-ul
2. Creează un branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Deschide un Pull Request

## 📄 License

Acest proiect este open source și independent. Protocoalele terapeutice sunt proprietatea CNAS România și sunt extrase din sursa oficială.

## 🙏 Credits

- Date surse: [CNAS România](https://cnas.ro/protocoale-terapeutice/)
- UI Components: [shadcn/ui](https://ui.shadcn.com/)
- Framework: [Next.js](https://nextjs.org/)

---

**Status**: 🚧 În dezvoltare activă

**Versiune**: 0.1.0

**Ultima actualizare**: Octombrie 2025
