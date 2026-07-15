import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BreakdownItem } from "../../types/site";

interface BreakdownChartProps {
  title: string;
  data: BreakdownItem[];
  color?: string;
  maxItems?: number;
}

export default function BreakdownChart({
  title,
  data,
  color = "#2f6f4f",
  maxItems = 8,
}: BreakdownChartProps) {
  const chartData = data.slice(0, maxItems);

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
            <Bar dataKey="count" fill={color} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
