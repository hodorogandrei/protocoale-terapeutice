/**
 * Seed database with sample therapeutic protocols
 */

import { db } from '../lib/db'

const sampleProtocols = [
  {
    code: 'A001E',
    title: 'Protocol terapeutic pentru tratamentul Artritei Reumatoide cu anti-TNF alfa',
    dci: 'Adalimumab, Etanercept, Infliximab',
    specialtyCode: 'REUMATOLOGIE',
    officialPdfUrl: 'https://cnas.ro/wp-content/uploads/2023/A001E.pdf',
    cnasUrl: 'https://cnas.ro/protocoale-terapeutice/',
    rawText: `PROTOCOL TERAPEUTIC

A001E - ARTRITA REUMATOIDĂ

I. Indicația terapeutică
Artrita reumatoidă activă la pacienții adulți care au avut un răspuns inadecvat la tratamentul anterior cu medicamente antireumatice modificatoare de boală (DMARD).

II. Criterii de includere în tratament
1. Diagnostic confirmat de artrită reumatoidă conform criteriilor ACR/EULAR
2. Boală activă (DAS28 > 3.2)
3. Răspuns inadecvat la cel puțin 2 DMARD-uri convenționale
4. Absența contraindicațiilor pentru terapia biologică

III. Tratament
Medicamentele aprobate:
- Adalimumab 40 mg s.c. la 2 săptămâni
- Etanercept 50 mg s.c. săptămânal
- Infliximab 3-10 mg/kg i.v. la 0, 2, 6 săptămâni apoi la 8 săptămâni

IV. Contraindicații
- Infecții active severe
- Tuberculoză activă
- Insuficiență cardiacă severă (NYHA III-IV)
- Neoplazii active

V. Atenționări și precauții
- Screening pentru tuberculoză înainte de inițiere
- Monitorizare pentru infecții oportuniste
- Evitarea vaccinurilor vii

VI. Monitorizarea tratamentului
- Evaluare clinică la 3 luni
- DAS28 la fiecare vizită
- Teste hepatice și hematologice la 3 luni

VII. Criterii de întrerupere
- Lipsa răspunsului terapeutic la 3 luni
- Efecte adverse severe
- Infecții recurente

VIII. Prescriptori autorizați
Medici specialiști în reumatologie`,
    htmlContent: `<div class="protocol">
<h1>PROTOCOL TERAPEUTIC A001E</h1>
<h2>ARTRITA REUMATOIDĂ</h2>

<h3>I. Indicația terapeutică</h3>
<p>Artrita reumatoidă activă la pacienții adulți care au avut un răspuns inadecvat la tratamentul anterior cu medicamente antireumatice modificatoare de boală (DMARD).</p>

<h3>II. Criterii de includere în tratament</h3>
<ol>
<li>Diagnostic confirmat de artrită reumatoidă conform criteriilor ACR/EULAR</li>
<li>Boală activă (DAS28 > 3.2)</li>
<li>Răspuns inadecvat la cel puțin 2 DMARD-uri convenționale</li>
<li>Absența contraindicațiilor pentru terapia biologică</li>
</ol>

<h3>III. Tratament</h3>
<p><strong>Medicamentele aprobate:</strong></p>
<ul>
<li>Adalimumab 40 mg s.c. la 2 săptămâni</li>
<li>Etanercept 50 mg s.c. săptămânal</li>
<li>Infliximab 3-10 mg/kg i.v. la 0, 2, 6 săptămâni apoi la 8 săptămâni</li>
</ul>

<h3>IV. Contraindicații</h3>
<ul>
<li>Infecții active severe</li>
<li>Tuberculoză activă</li>
<li>Insuficiență cardiacă severă (NYHA III-IV)</li>
<li>Neoplazii active</li>
</ul>

<h3>V. Atenționări și precauții</h3>
<ul>
<li>Screening pentru tuberculoză înainte de inițiere</li>
<li>Monitorizare pentru infecții oportuniste</li>
<li>Evitarea vaccinurilor vii</li>
</ul>

<h3>VI. Monitorizarea tratamentului</h3>
<ul>
<li>Evaluare clinică la 3 luni</li>
<li>DAS28 la fiecare vizită</li>
<li>Teste hepatice și hematologice la 3 luni</li>
</ul>

<h3>VII. Criterii de întrerupere</h3>
<ul>
<li>Lipsa răspunsului terapeutic la 3 luni</li>
<li>Efecte adverse severe</li>
<li>Infecții recurente</li>
</ul>

<h3>VIII. Prescriptori autorizați</h3>
<p>Medici specialiști în reumatologie</p>
</div>`,
    sublists: ['M05', 'M06'],
    prescribers: ['Medic specialist reumatolog'],
    canFamilyDoctor: false,
    categories: ['Reumatologie', 'Boli autoimune'],
    keywords: ['artrită reumatoidă', 'anti-TNF', 'adalimumab', 'etanercept', 'infliximab', 'DMARD'],
    extractionQuality: 95,
    verified: true,
    publishDate: new Date('2023-01-15'),
    lastUpdateDate: new Date('2024-06-20'),
    orderNumber: '234/2023',
  },
  {
    code: 'B002C',
    title: 'Protocol pentru tratamentul Hepatitei Cronice C cu antivirale cu acțiune directă',
    dci: 'Sofosbuvir, Ledipasvir, Daclatasvir',
    specialtyCode: 'GASTROENTEROLOGIE',
    officialPdfUrl: 'https://cnas.ro/wp-content/uploads/2023/B002C.pdf',
    cnasUrl: 'https://cnas.ro/protocoale-terapeutice/',
    rawText: `PROTOCOL TERAPEUTIC

B002C - HEPATITA CRONICĂ C

I. Indicația terapeutică
Tratamentul infecției cronice cu virusul hepatitei C (VHC) la pacienții adulți.

II. Criterii de includere în tratament
1. Diagnostic confirmat de hepatită cronică C (ARN VHC pozitiv)
2. Determinarea genotipului viral
3. Evaluarea gradului de fibroză hepatică
4. Absența contraindicațiilor pentru tratament

III. Tratament
Scheme terapeutice în funcție de genotip:
- Genotip 1: Sofosbuvir/Ledipasvir 12 săptămâni
- Genotip 2: Sofosbuvir + Ribavirină 12 săptămâni
- Genotip 3: Sofosbuvir/Daclatasvir 12-24 săptămâni
- Genotip 4: Sofosbuvir/Ledipasvir 12 săptămâni

IV. Contraindicații
- Hipersensibilitate la substanța activă
- Interacțiuni medicamentoase majore
- Insuficiență hepatică decompensată

V. Monitorizarea tratamentului
- ARN VHC la săptămâna 4 și 12
- Teste hepatice lunare
- Evaluare RVS (răspuns virologic susținut) la 12 săptămâni post-tratament

VI. Criterii de succes
- ARN VHC nedetectabil la finalul tratamentului
- RVS 12 pozitiv (ARN VHC nedetectabil la 12 săptămâni post-tratament)

VII. Prescriptori autorizați
Medici specialiști în gastroenterologie sau boli infecțioase`,
    htmlContent: `<div class="protocol">
<h1>PROTOCOL TERAPEUTIC B002C</h1>
<h2>HEPATITA CRONICĂ C</h2>

<h3>I. Indicația terapeutică</h3>
<p>Tratamentul infecției cronice cu virusul hepatitei C (VHC) la pacienții adulți.</p>

<h3>II. Criterii de includere în tratament</h3>
<ol>
<li>Diagnostic confirmat de hepatită cronică C (ARN VHC pozitiv)</li>
<li>Determinarea genotipului viral</li>
<li>Evaluarea gradului de fibroză hepatică</li>
<li>Absența contraindicațiilor pentru tratament</li>
</ol>

<h3>III. Tratament</h3>
<p><strong>Scheme terapeutice în funcție de genotip:</strong></p>
<ul>
<li>Genotip 1: Sofosbuvir/Ledipasvir 12 săptămâni</li>
<li>Genotip 2: Sofosbuvir + Ribavirină 12 săptămâni</li>
<li>Genotip 3: Sofosbuvir/Daclatasvir 12-24 săptămâni</li>
<li>Genotip 4: Sofosbuvir/Ledipasvir 12 săptămâni</li>
</ul>
</div>`,
    sublists: ['B18.2'],
    prescribers: ['Medic specialist gastroenterolog', 'Medic specialist boli infecțioase'],
    canFamilyDoctor: false,
    categories: ['Gastroenterologie', 'Hepatologie', 'Boli infecțioase'],
    keywords: ['hepatită C', 'VHC', 'sofosbuvir', 'antivirale', 'DAA'],
    extractionQuality: 92,
    verified: true,
    publishDate: new Date('2023-03-10'),
    lastUpdateDate: new Date('2024-09-15'),
    orderNumber: '456/2023',
  },
  {
    code: 'C003D',
    title: 'Protocol pentru tratamentul Diabetului Zaharat tip 2 cu inhibitori SGLT2',
    dci: 'Empagliflozin, Dapagliflozin, Canagliflozin',
    specialtyCode: 'DIABET',
    officialPdfUrl: 'https://cnas.ro/wp-content/uploads/2024/C003D.pdf',
    cnasUrl: 'https://cnas.ro/protocoale-terapeutice/',
    rawText: `PROTOCOL TERAPEUTIC

C003D - DIABET ZAHARAT TIP 2

I. Indicația terapeutică
Tratamentul diabetului zaharat tip 2 la adulți pentru îmbunătățirea controlului glicemic.

II. Criterii de includere
1. Diagnostic de diabet zaharat tip 2
2. HbA1c ≥ 7% sub tratament cu metformină
3. RFG ≥ 45 ml/min/1.73m²
4. Indicație de protecție cardiovasculară sau renală

III. Tratament
Doze recomandate:
- Empagliflozin 10-25 mg/zi
- Dapagliflozin 5-10 mg/zi
- Canagliflozin 100-300 mg/zi

IV. Monitorizare
- HbA1c la 3 luni
- Funcție renală la 3 luni
- Presiune arterială

V. Prescriptori
Medici specialiști diabet zaharat, nutriție și boli metabolice`,
    htmlContent: `<div class="protocol">
<h1>PROTOCOL TERAPEUTIC C003D</h1>
<h2>DIABET ZAHARAT TIP 2</h2>
<h3>I. Indicația terapeutică</h3>
<p>Tratamentul diabetului zaharat tip 2 la adulți pentru îmbunătățirea controlului glicemic.</p>
</div>`,
    sublists: ['E11'],
    prescribers: ['Medic specialist diabet zaharat, nutriție și boli metabolice'],
    canFamilyDoctor: true,
    categories: ['Diabet', 'Endocrinologie'],
    keywords: ['diabet tip 2', 'SGLT2', 'empagliflozin', 'dapagliflozin'],
    extractionQuality: 88,
    verified: true,
    publishDate: new Date('2024-01-20'),
    lastUpdateDate: new Date('2024-10-01'),
    orderNumber: '789/2024',
  },
]

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing protocols...')
    await db.protocol.deleteMany()

    console.log(`📝 Creating ${sampleProtocols.length} sample protocols...`)

    for (const protocol of sampleProtocols) {
      await db.protocol.create({
        data: protocol as any,
      })
      console.log(`   ✅ Created: ${protocol.code} - ${protocol.title}`)
    }

    console.log('\n✨ Seed completed successfully!')
    console.log(`   Total protocols: ${sampleProtocols.length}`)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { seed }
