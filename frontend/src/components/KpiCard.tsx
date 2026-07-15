interface KpiCardProps {
  label: string;
  value: number | string;
}

export default function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
