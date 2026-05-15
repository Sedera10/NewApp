export default function StatCard({
    title,
    amount,
    footerText
}) {
    return <div className="stat-card highlight">
        <div className="stat-header">{title}</div>
        <div className="stat-value">{amount.toFixed(2)} €</div>
        <div className="stat-desc">{footerText}</div>
    </div>
}