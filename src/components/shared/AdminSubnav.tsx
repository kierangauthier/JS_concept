import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * V4 — Sub-navigation bar shown on all admin pages to make the two routes
 * (/admin, /admin/import) feel like tabs of the same surface. Kept as a
 * presentational component so we don't touch the monolithic AdminPage body.
 */
const TABS = [
  { to: "/admin", label: "Paramètres", end: true },
  { to: "/admin/import", label: "Import de données", end: false },
];

export function AdminSubnav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Sections administration"
      className="border-b border-border mb-6"
    >
      <ul className="flex gap-2 -mb-px">
        {TABS.map((t) => {
          const active = t.end ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.end}
                className={cn(
                  "inline-flex items-center px-4 py-2 text-sm font-medium border-b-2",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
