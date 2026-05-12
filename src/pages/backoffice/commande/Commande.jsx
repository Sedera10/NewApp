import React, { useState, useEffect } from 'react';
import './Commande.css';
import { getCommandes, CustomName, AddresseLivraisonName, CurrentStateName } from '../../../service/Commande';

// Utilitaire pour extraire la valeur brute (les balises XML parsées peuvent être des objets contenant un #text et des attributs)
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

// Ce composant "Générique" remplace CustomerNameDisplay.
// Il exécute la "fetchFunction" qu'on lui donne.
const AsyncDataDisplay = ({ fetchFunction, valueId, placeholder = "Chargement..." }) => {
  const [data, setData] = useState(placeholder);
  
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const result = await fetchFunction(valueId);
      if(isMounted) setData(result);
    };
    fetchData();
    return () => { isMounted = false; };
  }, [fetchFunction, valueId]);

  return <>{data}</>;
}


export default function Commande() {

    const [commandes, setCommandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            let data = await getCommandes();
            if (!data) data = [];
            else if (!Array.isArray(data)) data = [data];
            
            setCommandes(data);
        } catch (err) {
            setError("Erreur lors du chargement des données : " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

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
                      const idText = getTextVal(order.id);
                      const refText = getTextVal(order.reference);
                      const totalPaid = Number(getTextVal(order.total_paid) || 0).toFixed(2);
                      const paymentText = getTextVal(order.payment);
                      const dateAddText = getTextVal(order.date_add);
                      const badgeColor = getStatusColor(order.current_state);
                      
                      return (
                        <tr key={idText}>
                          <td>
                            <p className="text-center font-weight-bold mb-0">{idText}</p>
                          </td>
                          <td>
                            <p className="text-sm font-weight-bold mb-0">{refText}</p>
                          </td>
                          <td>
                            <p className="text-sm mb-0">
                               <AsyncDataDisplay fetchFunction={AddresseLivraisonName} valueId={order.id_address_delivery} />
                            </p>
                          </td>
                          <td>
                            <p className="text-sm mb-0">
                               <AsyncDataDisplay fetchFunction={CustomName} valueId={order.id_customer} />
                            </p>
                          </td>
                          <td>
                            <p className="text-sm font-weight-bold mb-0">
                              {totalPaid} Ar
                            </p>
                          </td>
                          <td>
                            <p className="text-sm mb-0">{paymentText}</p>
                          </td>
                          <td>
                            <span className={`badge ${badgeColor}`}>
                              <AsyncDataDisplay fetchFunction={CurrentStateName} valueId={order.current_state} />
                            </span>
                          </td>
                          <td>
                            <p className="text-sm mb-0 text-secondary">
                              {dateAddText ? new Date(dateAddText).toLocaleString() : 'N/A'}
                            </p>
                          </td>
                          <td className="text-end pe-4">
                            <button className="btn btn-link text-secondary mb-0 p-0 fs-5" aria-label="Voir les détails">
                              🔍
                            </button>
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
