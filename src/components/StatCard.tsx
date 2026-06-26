interface StatCardProps {
  label: string
  value: string | number
}

export const StatCard = ({ label, value }: StatCardProps) => {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
