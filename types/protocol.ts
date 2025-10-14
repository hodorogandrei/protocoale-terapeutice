// Type definitions for Romanian therapeutic protocols

export interface Protocol {
  id: string
  code: string
  title: string
  dci?: string | null
  specialtyCode?: string | null

  cnasUrl?: string | null
  officialPdfUrl: string
  storedPdfUrl?: string | null

  rawText: string
  htmlContent: string
  structuredJson?: ProtocolStructure | null

  sublists: string[]
  prescribers: string[]
  canFamilyDoctor: boolean

  publishDate?: Date | null
  lastUpdateDate?: Date | null
  orderNumber?: string | null
  version: number

  searchVector?: string | null
  categories: string[]
  keywords: string[]

  extractionQuality: number
  verified: boolean

  createdAt: Date
  updatedAt: Date

  images?: ProtocolImage[]
  sections?: ProtocolSection[]
  versions?: ProtocolVersion[]
}

export interface ProtocolImage {
  id: string
  protocolId: string
  imageUrl: string
  altText?: string | null
  caption?: string | null
  pageNumber?: number | null
  position: number
  width?: number | null
  height?: number | null
  createdAt: Date
}

export interface ProtocolSection {
  id: string
  protocolId: string
  type: string
  title: string
  order: number
  content: string
  rawText: string
  parentId?: string | null
  children?: ProtocolSection[]
}

export interface ProtocolVersion {
  id: string
  protocolId: string
  version: number
  createdAt: Date
  title: string
  rawText: string
  htmlContent: string
  structuredJson?: ProtocolStructure | null
  changelog?: string | null
  orderNumber?: string | null
  officialPdfUrl: string
}

export interface Bookmark {
  id: string
  userId: string
  protocolId: string
  notes?: string | null
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ScraperRun {
  id: string
  startedAt: Date
  completedAt?: Date | null
  status: string
  protocolsFound: number
  protocolsUpdated: number
  protocolsAdded: number
  protocolsFailed: number
  errorLog?: string | null
  summary?: any
}

// Structured JSON format for protocols (while preserving 100% content)
export interface ProtocolStructure {
  metadata: {
    code: string
    title: string
    publishDate?: string
    orderNumber?: string
  }

  sections: ProtocolStructuredSection[]

  // Preserve additional content that doesn't fit in sections
  additionalContent?: {
    headers?: string[]
    footers?: string[]
    annexes?: string[]
    references?: string[]
  }
}

export interface ProtocolStructuredSection {
  type: SectionType
  title: string
  order: number
  content: string // Full HTML content
  subsections?: ProtocolStructuredSection[]
  tables?: TableData[]
  lists?: ListData[]
}

export type SectionType =
  | 'indicatie'
  | 'criterii_includere'
  | 'criterii_excludere'
  | 'tratament'
  | 'contraindicatii'
  | 'atentionari'
  | 'monitorizare'
  | 'criterii_intrerupere'
  | 'prescriptori'
  | 'altele'

export interface TableData {
  headers: string[]
  rows: string[][]
  caption?: string
}

export interface ListData {
  type: 'ordered' | 'unordered'
  items: (string | ListData)[] // Nested lists supported
}

// Search and filtering types
export interface ProtocolFilters {
  searchTerm?: string
  specialties?: string[]
  categories?: string[]
  prescribers?: string[]
  canFamilyDoctor?: boolean
  dateFrom?: Date
  dateTo?: Date
  orderBy?: 'relevance' | 'date' | 'title' | 'code'
  orderDirection?: 'asc' | 'desc'
}

export interface ProtocolSearchResult {
  protocol: Protocol
  highlights?: string[]
  score: number
}

// Viewing modes for protocol display
export type ViewMode = 'document' | 'structured' | 'pdf'

// Romanian UI text constants
export const UI_TEXT = {
  search: {
    placeholder: 'Caută protocoale terapeutice...',
    button: 'Caută',
    results: 'rezultate găsite',
    noResults: 'Nu s-au găsit rezultate',
    filters: 'Filtrează după:',
    clearFilters: 'Resetează filtre',
  },
  protocol: {
    viewModes: {
      document: 'Vizualizare Document',
      structured: 'Vizualizare Structurată',
      pdf: 'PDF Original',
    },
    actions: {
      download: 'Descarcă PDF',
      print: 'Tipărește',
      bookmark: 'Salvează în favorite',
      share: 'Partajează',
      compare: 'Compară',
      report: 'Raportează eroare',
    },
    sections: {
      indicatie: 'Indicația Terapeutică',
      criterii_includere: 'Criterii de Includere în Tratament',
      criterii_excludere: 'Criterii de Excludere',
      tratament: 'Tratament',
      contraindicatii: 'Contraindicații',
      atentionari: 'Atenționări și Precauții Speciale',
      monitorizare: 'Monitorizarea Tratamentului',
      criterii_intrerupere: 'Criterii pentru Întreruperea Tratamentului',
      prescriptori: 'Prescriptori Autorizați',
      altele: 'Alte Informații',
    },
  },
  filters: {
    specialty: 'Specialitate medicală',
    category: 'Categorie',
    prescriber: 'Tip prescriptor',
    date: 'Data actualizării',
    familyDoctor: 'Poate fi prescris de medicul de familie',
  },
  navigation: {
    home: 'Acasă',
    allProtocols: 'Toate Protocoalele',
    specialties: 'Specialități',
    about: 'Despre',
    contact: 'Contact',
  },
}
