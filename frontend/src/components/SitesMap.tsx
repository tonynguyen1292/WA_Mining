import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Site } from "../types/site";

// WA-specific: centers the default view on the state rather than the world.
const WA_CENTER: [number, number] = [-25.5, 122.5];
const WA_DEFAULT_ZOOM = 5;

// All 6 real STAGE values get their own color here -- unlike the Unity
// prototype's 3-bucket simplification, this is the full product surface.
const STAGE_COLORS: Record<string, string> = {
  Operating: "#2f8f52",
  Proposed: "#c6631e",
  "Care And Maintenance": "#d9a441",
  Undeveloped: "#7a7f85",
  "Under Development": "#3b6e8f",
  Shut: "#b3261e",
};
const DEFAULT_STAGE_COLOR = "#7a7f85";

function stageColor(stage: string | null): string {
  if (!stage) return DEFAULT_STAGE_COLOR;
  return STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
}

interface SitesMapProps {
  sites: Site[];
}

export default function SitesMap({ sites }: SitesMapProps) {
  const plottable = sites.filter(
    (site): site is Site & { longitude: number; latitude: number } =>
      site.longitude != null && site.latitude != null
  );
  const missingCount = sites.length - plottable.length;

  return (
    <div>
      <div className="map-container">
        <MapContainer center={WA_CENTER} zoom={WA_DEFAULT_ZOOM} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {plottable.map((site) => (
            <CircleMarker
              key={site.site_code}
              center={[site.latitude, site.longitude]}
              radius={6}
              pathOptions={{
                color: "#1d2321",
                weight: 1,
                fillColor: stageColor(site.stage),
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <p className="map-popup-title">{site.title ?? site.site_code}</p>
                <p className="map-popup-row">Stage: {site.stage ?? "—"}</p>
                <p className="map-popup-row">Commodity: {site.target_group_name ?? "—"}</p>
                <p className="map-popup-row">Region: {site.development_region ?? "—"}</p>
                <p className="map-popup-row">Project: {site.project_title ?? "—"}</p>
                <Link className="map-popup-link" to={`/sites/${site.site_code}`}>
                  View full details →
                </Link>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="map-legend">
          <div className="map-legend-title">Stage</div>
          {Object.entries(STAGE_COLORS).map(([stage, color]) => (
            <div className="map-legend-row" key={stage}>
              <span className="map-legend-dot" style={{ background: color }} />
              {stage}
            </div>
          ))}
        </div>
      </div>

      {missingCount > 0 && (
        <p className="map-missing-note">
          {missingCount} site{missingCount === 1 ? "" : "s"} without location data not shown.
        </p>
      )}
    </div>
  );
}
