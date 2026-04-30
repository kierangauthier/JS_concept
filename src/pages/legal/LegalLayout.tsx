import { Link, Outlet } from "react-router-dom";
import { toISODateLocal } from "@/lib/format";

/**
 * Sober wrapper used by all public legal pages (/mentions-legales, /cgu, /cgv,
 * /confidentialite). Kept intentionally free of app-level context so it renders
 * even for unauthenticated visitors.
 */
export default function LegalLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-medium">
            ConceptManager
          </Link>
          <nav className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
            <Link to="/cgu" className="hover:text-foreground">CGU</Link>
            <Link to="/cgv" className="hover:text-foreground">CGV</Link>
            <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 prose prose-sm dark:prose-invert">
        <Outlet />
      </main>
      <footer className="border-t border-border mt-10">
        <div className="mx-auto max-w-3xl px-6 py-6 text-xs text-muted-foreground">
          Dernière mise à jour : {toISODateLocal(new Date())}.
        </div>
      </footer>
    </div>
  );
}
