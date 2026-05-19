import React, { useEffect, useState } from 'react';
import './StatsPage.css';
import StatCard from '../../../components/UI/others/StatCard';
import { dashboardService } from '../../../service/dashboardService';

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesOverview, setSalesOverview] = useState({
    totalSalesHT: 0,
    totalPurchaseHT: 0,
    profitByCategory: []
  });
  const [stockByCategory, setStockByCategory] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError('');
        const [salesData, stockData] = await Promise.all([
          dashboardService.getSalesOverview(),
          dashboardService.getStockByCategory()
        ]);

        setSalesOverview(salesData);
        setStockByCategory(stockData);
      } catch (err) {
        setError('Erreur lors du chargement des statistiques.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="stats-container loading">
        <div className="spinner" />
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="stats-hero">
        <div>
          <h1 className="stats-title">Statistiques</h1>
          <p className="stats-intro">
            Suivi des ventes HT, des achats HT et des performances par categorie.
          </p>
        </div>
      </div>

      {error && <div className="stats-error">{error}</div>}

      <div className="stats-summary">
        <StatCard
          title="Total ventes HT"
          amount={salesOverview.totalSalesHT}
          footerText="Hors taxe"
          format="currency"
        />
        <StatCard
          title="Total achats HT"
          amount={salesOverview.totalPurchaseHT}
          footerText="Hors taxe"
          format="currency"
        />
      </div>

      <section className="stats-section">
        <div className="stats-panel-header">
          <h2>Benefice par categorie</h2>
          <p>Ventes HT - achats HT pour chaque categorie de produit.</p>
        </div>

        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Categorie</th>
                <th>Ventes HT</th>
                <th>Achats HT</th>
                <th>Benefice HT</th>
              </tr>
            </thead>
            <tbody>
              {salesOverview.profitByCategory.length ? (
                salesOverview.profitByCategory.map((row) => (
                  <tr key={row.categoryId}>
                    <td>{row.categoryName}</td>
                    <td>{row.salesHT.toFixed(2)} €</td>
                    <td>{row.purchaseHT.toFixed(2)} €</td>
                    <td>{row.profitHT.toFixed(2)} €</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="no-data">Aucune donnee disponible.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-panel-header">
          <h2>Stock par categorie</h2>
          <p>Vue synthetique des stocks physiques, reserves et disponibles.</p>
        </div>

        <div className="stats-table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Categorie</th>
                <th>Qte physique</th>
                <th>Qte reserve</th>
                <th>Qte disponible</th>
              </tr>
            </thead>
            <tbody>
              {stockByCategory.length ? (
                stockByCategory.map((row) => (
                  <tr key={row.categoryId}>
                    <td>{row.categoryName}</td>
                    <td>{row.physicalQuantity}</td>
                    <td>{row.reservedQuantity}</td>
                    <td>{row.availableQuantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="no-data">Aucune donnee disponible.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
