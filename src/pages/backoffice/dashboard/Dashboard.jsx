import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { commandeService } from '../../../service/Commande';
import { cartService } from '../../../service/cartService';
import { customerService } from '../../../service/Customer';
import StatCard from '../../../components/UI/others/StatCard';

const getTextVal = (value) => {
  if (value && typeof value === 'object' && value['#text'] !== undefined) {
    return value['#text'];
  }
  return value;
};

const toDateKey = (value) => {
  if (!value) return null;
  const rawValue = String(getTextVal(value) || '').trim();
  if (!rawValue) return null;
  return rawValue.slice(0, 10);
};

const parseAmount = (value) => Number.parseFloat(getTextVal(value) || 0) || 0;

const toDateNumber = (dateKey) => new Date(`${dateKey}T00:00:00`).getTime();

const aggregateByDay = (items, getDate, getAmount) => {
  const dayMap = {};

  items.forEach((item) => {
    const dayKey = toDateKey(getDate(item));
    if (!dayKey) return;

    if (!dayMap[dayKey]) {
      dayMap[dayKey] = {
        date: dayKey,
        count: 0,
        amount: 0
      };
    }

    dayMap[dayKey].count += 1;
    dayMap[dayKey].amount += getAmount(item);
  });

  return Object.values(dayMap).sort((a, b) => toDateNumber(b.date) - toDateNumber(a.date));
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [globalStats, setGlobalStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    totalCustomers: 0,
    ordersByDay: [],
    allOrders: [],
    allCarts: []
  });
  const [periodStats, setPeriodStats] = useState(null);

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        const [orders, customers, carts] = await Promise.all([
          commandeService.getCommandes(),
          customerService.getCustomers(),
          cartService.getCarts()
        ]);

        const totalAmount = orders.reduce((sum, order) => sum + parseAmount(order.total_paid), 0);
        const ordersByDay = aggregateByDay(
          orders,
          (order) => order.date_add,
          (order) => parseAmount(order.total_paid)
        );

        setGlobalStats({
          totalOrders: orders.length,
          totalAmount,
          totalCustomers: customers.length,
          ordersByDay,
          allOrders: orders,
          allCarts: carts
        });
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  useEffect(() => {
    const { start, end } = dateFilter;

    if (!start || !end) {
      setPeriodStats(null);
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const filteredOrders = globalStats.allOrders.filter((order) => {
      const orderDate = new Date(order.date_add);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const orderCartIds = new Set(
      globalStats.allOrders
        .map((order) => String(getTextVal(order.id_cart) || '').trim())
        .filter(Boolean)
    );

    const filteredCarts = globalStats.allCarts.filter((cart) => {
      if (!cart.dateAdd) return false;
      const cartDate = new Date(cart.dateAdd);
      const cartId = String(getTextVal(cart.id) || '').trim();
      return cartDate >= startDate && cartDate <= endDate && cartId && !orderCartIds.has(cartId);
    });

    setPeriodStats({
      totalOrders: filteredOrders.length,
      totalAmount: filteredOrders.reduce((sum, order) => sum + parseAmount(order.total_paid), 0),
      ordersByDay: aggregateByDay(
        filteredOrders,
        (order) => order.date_add,
        (order) => parseAmount(order.total_paid)
      ),
      cartsByDay: aggregateByDay(
        filteredCarts,
        (cart) => cart.dateAdd,
        (cart) => parseAmount(cart.totalAmount)
      ),
      cartsCount: filteredCarts.length,
      cartsAmount: filteredCarts.reduce((sum, cart) => sum + parseAmount(cart.totalAmount), 0)
    });
  }, [dateFilter, globalStats.allOrders, globalStats.allCarts]);

  const handleFilterChange = (field, value) => {
    setDateFilter((previous) => ({ ...previous, [field]: value }));
  };

  if (loading) {
    return (
      <div className="dashboard-container loading">
        <div className="spinner" />
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  const hasActiveFilter = Boolean(dateFilter.start && dateFilter.end);

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <div>
          <h1 className="dashboard-title">Tableau de bord</h1>
          <p className="dashboard-intro">
            Vue globale des commandes, clients et paniers. Le filtre de dates reste vide par défaut.
          </p>
        </div>
      </div>

      <div className="dashboard-summary">
        <StatCard title="Total commandes" amount={globalStats.totalOrders} footerText="Depuis le début" />
        <StatCard title="Montant total des commandes" amount={globalStats.totalAmount} footerText="Depuis le début" format="currency" />
        <StatCard title="Nombre de clients" amount={globalStats.totalCustomers} footerText="Clients enregistrés" />
      </div>

      <section className="filter-panel">
        <div className="filter-panel-header">
          <div>
            <h2>Filtre par période</h2>
            <p>Choisissez une date de début et une date de fin pour afficher les résultats détaillés.</p>
          </div>
        </div>

        <div className="filter-grid">
          <label>
            <span>Date de début</span>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(event) => handleFilterChange('start', event.target.value)}
            />
          </label>
          <label>
            <span>Date de fin</span>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(event) => handleFilterChange('end', event.target.value)}
            />
          </label>
        </div>
      </section>

      {hasActiveFilter ? (
        <section className="period-section">
          <div className="period-summary-grid">
            <StatCard title="Commandes sur la période" amount={periodStats?.totalOrders || 0} footerText="Nombre total" />
            <StatCard title="Montant des commandes" amount={periodStats?.totalAmount || 0} footerText="Montant cumulé" format="currency" />
            <StatCard title="Paniers sans commande" amount={periodStats?.cartsCount || 0} footerText="Non associés" />
            <StatCard title="Montant des paniers" amount={periodStats?.cartsAmount || 0} footerText="Total des paniers non associés" format="currency" />
          </div>

          <div className="dashboard-grid">
            <article className="dashboard-table-container">
              <div className="dashboard-panel-header">
                <h3>Commandes par jour</h3>
                <p>Entre les deux dates choisies.</p>
              </div>

              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Nombre de commandes</th>
                    <th>Montant total</th>
                  </tr>
                </thead>
                <tbody>
                  {periodStats?.ordersByDay?.length ? (
                    periodStats.ordersByDay.map((row) => (
                      <tr key={row.date}>
                        <td>{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                        <td>{row.count}</td>
                        <td>{row.amount.toFixed(2)} €</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="no-data">Aucune commande sur cette période.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>

            <article className="dashboard-table-container">
              <div className="dashboard-panel-header">
                <h3>Paniers non associés par jour</h3>
                <p>Paniers sans commande détectés sur la même période.</p>
              </div>

              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Nombre de paniers</th>
                    <th>Montant total</th>
                  </tr>
                </thead>
                <tbody>
                  {periodStats?.cartsByDay?.length ? (
                    periodStats.cartsByDay.map((row) => (
                      <tr key={row.date}>
                        <td>{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                        <td>{row.count}</td>
                        <td>{row.amount.toFixed(2)} €</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="no-data">Aucun panier non associé sur cette période.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>
          </div>
        </section>
      ) : (
        <section className="period-placeholder">
          Sélectionnez deux dates pour afficher le détail quotidien des commandes et des paniers non associés.
        </section>
      )}
    </div>
  );
}
