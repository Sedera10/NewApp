import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { commandeService } from '../../../service/Commande';
import StatCard from '../../../components/UI/others/StatCard'

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCommandes: 0,
    totalMontant: 0,
    parJour: []
  });

  const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
      return val['#text'];
    }
    return val;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch all orders
        const orders = await commandeService.getCommandes();
        
        let totalCmd = 0;
        let totalAmt = 0;
        const jourMap = {};

        // Process orders
        orders.forEach(order => {
          totalCmd++;
          const amount = parseFloat(getTextVal(order.total_paid) || 0);
          totalAmt += amount;

          // Group by Date 
          const fullDate = getTextVal(order.date_add); // format: YYYY-MM-DD HH:MM:SS
          if (fullDate) {
            const dateStr = fullDate.split(' ')[0]; // YYYY-MM-DD
            if (!jourMap[dateStr]) {
              jourMap[dateStr] = {
                date: dateStr,
                nbCommande: 0,
                montant: 0
              };
            }
            jourMap[dateStr].nbCommande++;
            jourMap[dateStr].montant += amount;
          }
        });

        // Convert map to sorted array (latest first)
        const parJourArr = Object.values(jourMap).sort((a, b) => new Date(b.date) - new Date(a.date));

        setStats({
          totalCommandes: totalCmd,
          totalMontant: totalAmt,
          parJour: parJourArr
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container loading">
        <div className="spinner"></div>
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Tableau de bord</h1>
      
      {/* Statistiques globales */}
      <div className="dashboard-summary">
        <StatCard title="Total Général" amount={stats.totalCommandes} footerText="Commandes totales"/>
        <StatCard title="Montant Total" amount={stats.totalMontant} footerText="Chiffre d'affaires global"/>
      </div>

      {/* Statistiques par jour */}
      <h2 className="dashboard-subtitle">Statistiques par Jour</h2>
      <div className="dashboard-table-container">
        {stats.parJour.length === 0 ? (
          <p className="no-data">Aucune donnée disponible</p>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Nombre de commandes</th>
                <th>Montant généré</th>
              </tr>
            </thead>
            <tbody>
              {stats.parJour.map(jour => (
                <tr key={jour.date}>
                  <td className="date-col">
                    {new Date(jour.date).toLocaleDateString('fr-FR', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </td>
                  <td className="nb-col">
                    <span className="badge-nb">{jour.nbCommande}</span>
                  </td>
                  <td className="montant-col font-weight-bold">
                    {jour.montant.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;