export default function StatCard({
    title,
    amount,
    footerText,
    format = 'number'
}) {
    const numericAmount = Number(amount) || 0;
    const displayValue = format === 'currency'
        ? `${numericAmount.toFixed(2)} €`
        : numericAmount.toLocaleString('fr-FR');

    return (
        <div className="stat-card highlight">
            <div className="stat-header">{title}</div>
            <div className="stat-value">{displayValue}</div>
            <div className="stat-desc">{footerText}</div>
        </div>
    );
}