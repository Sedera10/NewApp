import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { commandeService } from '../../../service/Commande';
import Header from '../../../components/layout/Header';
import './CommandeDetail.css';

export default function CommandeDetail() {
  const getTextVal = (val) => {
    if (val === null || val === undefined) return '';

    // Si c'est déjà une string ou number
    if (typeof val !== 'object') return String(val);

    // Si c'est un objet avec #text
    if (val['#text'] !== undefined) return String(val['#text']);

    // Si c'est un objet avec language (structure {language: {...}})
    if (val.language) {
      if (Array.isArray(val.language)) {
        const langObj = val.language[0];
        return langObj['#text'] ? String(langObj['#text']) : String(langObj);
      }
      return val.language['#text'] ? String(val.language['#text']) : String(val.language);
    }

    // Si c'est un objet vide ou autre
    return '';
  };

  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const details = await commandeService.getOrderDetails(orderId);
        setOrder(details);
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) return (
    <>
      <Header />
      <div className="loading">Chargement...</div>
    </>
  );
  if (!order) return (
    <>
      <Header />
      <div className="error">Commande non trouvée</div>
    </>
  );

  const getStateColor = (state) => {
    const stateColors = {
      '1': '#3498db',
      '2': '#27ae60',
      '3': '#f39c12',
      '4': '#27ae60',
      '5': '#e74c3c',
      '8': '#e74c3c'
    };
    return stateColors[state] || '#95a5a6';
  };

  const totalQuantity = order.orderRows.reduce((sum, row) => sum + row.quantity, 0);
  const formattedDate = new Date(order.dateAdd).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <Header />
      <div className="commande-detail-page">
        <div className="detail-container">
          {/* Header avec retour */}
          <div className="detail-top">
            <button className="back-link" onClick={() => navigate(-1)}>
              ← Retour aux commandes
            </button>
          </div>

          {/* Titre et statut */}
          <div className="detail-title-section">
            <div>
              <h1>Commande #{getTextVal(order.reference)}</h1>
              <p className="order-meta">
                Passée le {formattedDate} • {totalQuantity} produit{totalQuantity > 1 ? 's' : ''}
              </p>
            </div>
            <span
              className="status-badge"
              style={{ backgroundColor: getStateColor(getTextVal(order.currentState)) }}
            >
              {getTextVal(order.stateName)}
            </span>
          </div>

          {/* Grille principale */}
          <div className="detail-content">
            {/* Section Gauche - Informations */}
            <div className="left-section">
              {/* Adresse de livraison */}
              <div className="info-card">
                <h3>Adresse de Livraison</h3>
                <div className="address-box">
                  <p className="name">{getTextVal(order.addressDelivery.fullName)}</p>
                  <p>{getTextVal(order.addressDelivery.address)}</p>
                  <p>{getTextVal(order.addressDelivery.country)}</p>
                  {getTextVal(order.addressDelivery.phone) && (
                    <p className="phone">📞 {getTextVal(order.addressDelivery.phone)}</p>
                  )}
                </div>
              </div>

              {/* Paiement */}
              <div className="info-card">
                <h3>Paiement</h3>
                <p>{getTextVal(order.payment)}</p>
                <p className="small-text">Module: {getTextVal(order.module)}</p>
              </div>
            </div>

            {/* Section Droite - Totaux */}
            <div className="right-section">
              <div className="totals-card">
                <h3>Résumé du Montant</h3>
                <div className="total-line">
                  <span>Produits</span>
                  <span>{parseFloat(getTextVal(order.totalProducts)).toFixed(2)} €</span>
                </div>
                <div className="total-line">
                  <span>Livraison</span>
                  <span>{parseFloat(getTextVal(order.totalShipping)).toFixed(2)} €</span>
                </div>
                <div className="total-line final">
                  <span>Total</span>
                  <span className="final-amount">{parseFloat(getTextVal(order.totalPaid)).toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>

          {/* Produits */}
          <div className="products-section">
            <h2>Produits Commandés</h2>
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Produit</th>
                    <th>Référence</th>
                    <th>Quantité</th>
                    <th>Prix Unitaire</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderRows.map((row, index) => (
                    // Utilisation de l'ID produit + index pour une clé unique garantie
                    <tr key={`${row.productId || index}-${index}`}>
                      <td className="product-image">
                        <img
                          src={row.productImage}
                          alt={getTextVal(row.productName)}
                          onError={(e) => { e.target.src = '/placeholder.png'; }}
                        />
                      </td>
                      <td className="product-name">{getTextVal(row.productName)}</td>
                      <td className="product-ref">{getTextVal(row.productReference)}</td>
                      <td className="quantite">{row.quantity}</td>
                      <td className="price">{parseFloat(getTextVal(row.productPrice)).toFixed(2)} €</td>
                      <td className="total">{(row.quantity * parseFloat(getTextVal(row.productPrice))).toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="actions-section">
            <button className="btn btn-primary">📄 Télécharger Facture</button>
          </div>
        </div>
      </div>
    </>
  );
}
