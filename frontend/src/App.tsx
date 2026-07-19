import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import CommandPalette from "./components/CommandPalette";
import DashboardPage from "./pages/DashboardPage";
import MapPage from "./pages/MapPage";
import SiteDetailPage from "./pages/SiteDetailPage";
import SitesPage from "./pages/SitesPage";

export default function App() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Global, not page-scoped: a command palette that only works on some
  // routes isn't one you can rely on, so this listens on `window` rather
  // than living inside a specific page component.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isSearchShortcut) {
        event.preventDefault(); // otherwise this doubles as the browser's own address-bar search shortcut
        setIsPaletteOpen((open) => !open);
      } else if (event.key === "Escape") {
        // Escape is handled here at the window level, not only inside the
        // palette: the palette's own keydown handler can't fire when focus
        // has drifted to <body> (e.g. after clicking its non-focusable hint
        // bar), and a modal whose Escape only sometimes works reads as
        // broken. Closing when already closed is a no-op.
        setIsPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">WA Mining Portfolio</span>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/sites">Sites</NavLink>
          <NavLink to="/map">Map</NavLink>
        </nav>
        <button
          type="button"
          className="command-palette-trigger"
          onClick={() => setIsPaletteOpen(true)}
        >
          Search sites <kbd>Ctrl</kbd><kbd>K</kbd>
        </button>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/sites/:siteCode" element={<SiteDetailPage />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </main>

      {isPaletteOpen && <CommandPalette onClose={() => setIsPaletteOpen(false)} />}
    </div>
  );
}
