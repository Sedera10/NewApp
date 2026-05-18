import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { commandeService } from '../../../service/Commande';
import { cartService } from '../../../service/cartService';
import { localCartService } from '../../../service/Cart';
import Header from '../../../components/layout/Header';
import './Commande.css';

export default function CommandePage() {
  const [paniers, setPaniers] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
      return val['#text'];
    }
    if (val && typeof val === 'object' && val.language) {
      if (Array.isArray(val.language)) {
        return val.language[0]['#text'] || val.language[0];
      }
      return val.language['#text'] || val.language;
    }
    return val || '';
  };

  useEffect(() => {
    const fetchCommandes = async () => {
      try {
        const customerData = localStorage.getItem('client_session');
        if (!customerData) {
          navigate('/mystore/fr/login');
          return;
        }

        const connectedCustomer = JSON.parse(customerData);
        setCustomer(connectedCustomer);
        const customerId = connectedCustomer.id;

        const allCommandes = await commandeService.getCommandes();
        const lesPaniersRaw = await cartService.getUnorderedCarts(customerId);
        const lesPaniersFormatted = await Promise.all((lesPaniersRaw || []).map(cart => cartService.formatCart(cart)));

        const customerCommandes = (allCommandes || []).filter(
          cmd => getTextVal(cmd.idCustomer) === customerId
        );

        setPaniers(lesPaniersFormatted.filter(Boolean));
        console.log("Panier non associé : " , lesPaniersFormatted.filter(Boolean));

        setCommandes(customerCommandes);

        if (location.state?.orderSuccess) {
          console.log('✅ Commande créée avec succès ! ID:', location.state.orderId);
        }
      } catch (error) {
        console.error('Error fetching commandes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommandes();
  }, [navigate, location]);

  const handleViewDetails = (orderId) => {
    navigate(`/mystore/fr/commandes/${orderId}`);
  };

  const handleResumeCart = async (panier) => {
    try {
      const customerId = customer?.id;
      if (!customerId || !panier?.id) {
        navigate('/mystore/fr/cart');
        return;
      }

      let cartToUse = panier;
      if (!cartToUse.products || cartToUse.products.length === 0) {
        cartToUse = await cartService.getCartById(panier.id);
      }

      if (cartToUse?.products?.length) {
        localCartService.setCart(customerId, cartToUse.products);
        localStorage.setItem(`current_cart_id_${customerId}`, panier.id);
      }

      navigate('/mystore/fr/cart');
    } catch (error) {
      console.error('Erreur lors de la reprise du panier:', error);
      navigate('/mystore/fr/cart');
    }
  };

  const getStateColor = (state) => {
    const stateColors = {
      '1': 'primary',
      '2': 'success',
      '3': 'warning',
      '4': 'success',
      '5': 'danger',
      '8': 'danger'
    };
    return stateColors[state] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="commandes-page">
          <div className="container py-5">
            <p className="text-center text-muted">Chargement de vos commandes...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="commandes-page">
        <div className="container py-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h2 mb-0">Mes Commandes</h1>
            <button
              onClick={() => navigate('/mystore/fr/products')}
              className="btn btn-outline-primary"
            >
              ← Continuer les achats
            </button>
          </div>
          {/* Dans le panier */}
          {paniers.length !== 0 && (
            <div className="mb-5 table-responsive shadow-sm rounded-3">
              <h3 className="p-3 mb-0 bg-light border-bottom">En attente (Paniers)</h3>
              <table className="table table-hover mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th scope="col" className="fw-600">Numéro de Panier</th>
                    <th scope="col" className="fw-600">Date</th>
                    <th scope="col" className="fw-600">Montant</th>
                    <th scope="col" className="fw-600">Statut</th>
                    <th scope="col" className="text-center fw-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paniers.map(panier => (
                    <tr key={panier.id} className="align-middle" style={{backgroundColor: '#fff9e6'}}>
                      <td className='p-2'>
                        <strong>#{panier.id}</strong>
                      </td>
                      <td>
                        <span className="text-muted">{formatDate(panier.dateAdd)}</span>
                      </td>
                      <td>
                        <strong className="text-success">
                          {panier.totalAmount} €
                        </strong>
                      </td>
                      <td>
                        <span className="badge bg-warning text-dark">
                          Dans le panier
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleResumeCart(panier)}
                        >
                          Reprendre
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Les commandes */}
          {commandes.length === 0 ? (
            <div className="empty-state text-center py-5">
              <div className="empty-icon mb-3">📦</div>
              <h2>Aucune commande</h2>
              <p className="text-muted">Vous n'avez pas encore passé de commande.</p>
              <button
                onClick={() => navigate('/mystore/fr/products')}
                className="btn btn-primary"
              >
                Commencer à magasiner
              </button>
            </div>
          ) : (
            <div className="table-responsive shadow-sm rounded-3">
              <table className="table table-hover mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th scope="col" className="fw-600">Numéro</th>
                    <th scope="col" className="fw-600">Date</th>
                    <th scope="col" className="fw-600">Adresse</th>
                    <th scope="col" className="fw-600">Paiement</th>
                    <th scope="col" className="fw-600">Montant</th>
                    <th scope="col" className="fw-600">Statut</th>
                    <th scope="col" className="text-center fw-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {commandes.map(commande => (
                    <tr key={commande.id} className="align-middle">
                      <td className='p-2'>
                        <strong>#{getTextVal(commande.reference)}</strong>
                      </td>
                      <td>
                        <span className="text-muted">{formatDate(commande.date_add)}</span>
                      </td>
                      <td>
                        <span>{getTextVal(commande.addressName)}</span>
                      </td>
                      <td>
                        <span className="text-muted small">{getTextVal(commande.payment)}</span>
                      </td>
                      <td>
                        <strong className="text-success">
                          {parseFloat(getTextVal(commande.total_paid)).toFixed(2)} €
                        </strong>
                      </td>
                      <td>
                        <span className={`badge bg-${getStateColor(getTextVal(commande.current_state))}`}>
                          {getTextVal(commande.stateName)}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleViewDetails(commande.id)}
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
