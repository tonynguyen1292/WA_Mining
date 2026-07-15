import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import SiteDetailPage from "./pages/SiteDetailPage";
import SitesPage from "./pages/SitesPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">WA Mining Portfolio</span>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/sites">Sites</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/sites/:siteCode" element={<SiteDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
