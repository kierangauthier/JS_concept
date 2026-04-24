import { Link } from "react-router-dom";

/**
 * V4 — Small legal footer rendered inside the authenticated app shell.
 * Required by French commercial law: the legal mentions, CGU, CGV and privacy
 * policy must be reachable from every page.
 */
export function LegalFooter() {
  return (
    <footer
      aria-label="Liens légaux"
      className="border-t border-border px-4 lg:px-6 py-3 text-xs text-muted-foreground flex flex-wrap items-center gap-4"
    >
      <span>© {new Date().getFullYear()} ConceptManager</span>
      <Link to="/mentions-legales" className="hover:text-foreground">
        Mentions légales
      </Link>
      <Link to="/cgu" className="hover:text-foreground">
        CGU
      </Link>
      <Link to="/cgv" className="hover:text-foreground">
        CGV
      </Link>
      <Link to="/confidentialite" className="hover:text-foreground">
        Confidentialité
      </Link>
    </footer>
  );
}
