import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { sitesLinkForBreakdown } from "../../utils/urlFilters";
import type { BreakdownItem } from "../../types/site";

interface BreakdownChartProps {
  title: string;
  data: BreakdownItem[];
  color?: string;
  maxItems?: number;
  /** When set, clicking a bar navigates to /sites pre-filtered to that
   * bar's value -- URL-synced filters make the destination a shareable
   * link. Left unset for breakdowns with no matching sites-list filter
   * (e.g. LGA), where a click would have nowhere honest to go. */
  linkField?: "stage" | "commodity" | "region" | "site_type";
}

export default function BreakdownChart({
  title,
  data,
  color = "#2f6f4f",
  maxItems = 8,
  linkField,
}: BreakdownChartProps) {
  const chartData = data.slice(0, maxItems);
  const navigate = useNavigate();

  function handleBarClick(payload: { label?: string }) {
    if (!linkField || !payload.label) return;
    const link = sitesLinkForBreakdown(linkField, payload.label);
    if (link) navigate(link);
  }

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {chartData.length === 0 ? (
        <p className="empty-note">No data for the current filters.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill={color}
              radius={[0, 3, 3, 0]}
              cursor={linkField ? "pointer" : undefined}
              onClick={handleBarClick}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
      {linkField && <p className="chart-hint">Click a bar to open the matching sites.</p>}
    </div>
  );
}
