import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* About */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Despre Platformă</h3>
            <p className="text-sm text-muted-foreground">
              Platformă modernă pentru accesarea protocoalelor terapeutice din România.
              Date actualizate zilnic de pe site-ul CNAS.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Link-uri Rapide</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-medical-blue">
                  Acasă
                </Link>
              </li>
              <li>
                <Link href="/protocoale" className="text-muted-foreground hover:text-medical-blue">
                  Toate Protocoalele
                </Link>
              </li>
              <li>
                <Link href="/specialitati" className="text-muted-foreground hover:text-medical-blue">
                  Specialități
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Resurse</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://cnas.ro/protocoale-terapeutice/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-medical-blue"
                >
                  CNAS România
                </a>
              </li>
              <li>
                <a
                  href="https://cnas.ro/protocoale-terapeutice/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-medical-blue"
                >
                  Casa Națională de Asigurări
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Informații Legale</h3>
            <p className="text-xs text-muted-foreground">
              Protocoalele terapeutice sunt publicate cu rol informativ.
              Toate datele provin de pe site-ul oficial CNAS România.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Protocoale Terapeutice România. Date furnizate de{' '}
            <a
              href="https://cnas.ro/protocoale-terapeutice/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-medical-blue hover:underline"
            >
              CNAS
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
