import React, { useState, useEffect } from 'react';
import './Commande.css';
import { commandeService } from '../../../service/Commande';

// Utilitaire pour extraire la valeur brute
const getTextVal = (val) => {
  if (val && typeof val === 'object' && val['#text'] !== undefined) {
    return val['#text'];
  }
  return val;
};

// Fonction utilitaire pour associer une couleur à un ID de statut
const getStatusColor = (stateId) => {
  const parsedId = String(getTextVal(stateId));
  switch (parsedId) {
    case '10': return 'bg-primary';
    case '1': return 'bg-primary';
    case '2': return 'bg-success';
    case '3': return 'bg-info';
    case '4': return 'bg-info';
    case '5': return 'bg-success';
    case '6': return 'bg-dark';
    case '8': return 'bg-danger';
    default: return 'bg-secondary';
  }
};

export default function Commande() {

    const [commandes, setCommandes] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadOrdersAndStatuses = async () => {
        setLoading(true);
        setError(null);
        try {
            // Wait for both orders and statuses to load
            const [data, statusesData] = await Promise.all([
                commandeService.getCommandes(),
                commandeService.getStatusCommandes()
            ]);
            
            let statusArray = statusesData;
            if (!Array.isArray(statusArray)) statusArray = [statusArray];
            
            setCommandes(data);
            setStatuses(statusArray);
        } catch (err) {
            setError("Erreur lors du chargement des données : " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrdersAndStatuses();
    }, []);

    const handleChangeStatus = async (orderId, newStatusId) => {
        try {
            await commandeService.updateOrderStatus(orderId, newStatusId);
            // Refresh to get the actual translated name and new state 
            // (or we could just manually update the local state to save an API call)
            loadOrdersAndStatuses();
        } catch (err) {
            alert("Erreur lors du changement de statut : " + err.message);
        }
    };

  return (
    <div className="container-fluid py-4 fade-in-up">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-12">
          <div className="mat-card my-4">
            <h1 className="text-start" style={{marginBottom:"50px" }}>Liste de commandes</h1>

            {error && <div className="alert alert-danger mx-3 mt-3 text-white">{error}</div>}
            
            <div className="mat-card-header-floating d-flex justify-content-start align-items-center pe-4">
              <h6 className="text-white mb-0 text-start">Commandes</h6>
            </div>

            <div className="card-body px-0 pb-2">
              <div className="table-responsive p-0">
                <table className="table align-items-center mb-0 table-hover table-striped">
                  <thead>
                    <tr>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">ID</th>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Référence</th>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Livraison</th>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Client</th>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Total</th>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Paiement</th>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">État</th>
                      <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ps-2">Date</th>
                      <th className="text-end text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 pe-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan="11" className="text-center py-4">
                          <span className="spinner-border spinner-border-sm me-2"></span> 
                          Chargement des commandes...
                        </td>
                      </tr>
                    )}
                    
                    {!loading && commandes.length === 0 && !error && (
                      <tr>
                        <td colSpan="11" className="text-center py-4 text-secondary">
                          Aucune commande trouvée.
                        </td>
                      </tr>
                    )}

                    {!loading && commandes.map((order) => {
                      const badgeColor = getStatusColor(order.current_state);
                      
                      return (
                        <tr key={order.id}>
                          <td>
                            <p className="text-center font-weight-bold mb-0">{order.id}</p>
                          </td>
                          <td>
                            <p className="text-sm font-weight-bold mb-0">{order.reference}</p>
                          </td>
                          <td>
                            <p className="text-sm mb-0">
                               {order.addressName}
                            </p>
                          </td>
                          <td>
                            <p className="text-sm mb-0">
                               {order.customerName}
                            </p>
                          </td>
                          <td>
                            <p className="text-sm font-weight-bold mb-0">
                              {Number(order.total_paid || 0).toFixed(2)} Ar
                            </p>
                          </td>
                          <td>
                            <p className="text-sm mb-0">{order.payment}</p>
                          </td>
                          <td>
                            <select 
                                className={`badge ${badgeColor}`}
                                value={String(getTextVal(order.current_state))}
                                onChange={(e) => handleChangeStatus(order.id, e.target.value)}
                             >
                               {statuses.map(s => {
                                   const sid = getTextVal(s.id);
                                   // PrestaShop uses language arrays or objects. Let's just do a naive extract if it's there, 
                                   // or reuse CurrentStateName logic if needed. Here we try to get a string safely:
                                   const sname = s.name && s.name.language ? 
                                       (Array.isArray(s.name.language) ? getTextVal(s.name.language[0]) : getTextVal(s.name.language)) 
                                       : (getTextVal(s.name) || `Statut ${sid}`);
                                   return <option key={sid} value={sid}>{sname}</option>;
                               })}
                             </select>
                          </td>
                          <td>
                            <p className="text-sm mb-0 text-secondary">
                              {order.date_add ? new Date(order.date_add).toLocaleString() : 'N/A'}
                            </p>
                          </td>
                          <td className="text-end pe-4 d-flex align-items-center justify-content-end gap-2">
                             <a href="#">Details</a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
