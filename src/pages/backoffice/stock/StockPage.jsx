import React, { useState, useEffect } from 'react';
import { MdEdit, MdSearch, MdCheckCircle, MdError, MdHistory } from 'react-icons/md';
import { productService } from '../../../service/Product';
import './StockPage.css';

export default function StockPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stockData, setStockData] = useState({});
  const [selectedProductId, setSelectedProductId] = useState('');

  // Récupérer les produits au chargement
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const allProducts = await productService.getAllProducts();
      setProducts(allProducts);
      setFilteredProducts(allProducts);
      
      // Initialiser les quantités avec le stock actuel
      const stockMap = {};
      allProducts.forEach(product => {
        const quantity = getStockQuantity(product);
        stockMap[product.id] = quantity;
      });
      setStockData(stockMap);

      if (!selectedProductId && allProducts.length > 0) {
        setSelectedProductId(String(allProducts[0].id));
      }
    } catch (error) {
      showMessage('error', 'Erreur lors du chargement des produits');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir la quantité du produit
  const getStockQuantity = (product) => {
    if (product.computed_stock !== undefined && product.computed_stock !== null) {
      return parseInt(product.computed_stock, 10) || 0;
    }

    if (product.stock !== undefined && product.stock !== null) {
      return parseInt(product.stock, 10) || 0;
    }

    if (product.quantity) {
      if (typeof product.quantity === 'object' && product.quantity['#text']) {
        return parseInt(product.quantity['#text'], 10) || 0;
      }
      return parseInt(product.quantity, 10) || 0;
    }
    return 0;
  };

  // Filtrer les produits par terme de recherche
  useEffect(() => {
    const filtered = products.filter(product => {
      const name = (product.name?.value || product.name || '').toString().toLowerCase();
      const ref = (product.reference?.value || product.reference || '').toString().toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || ref.includes(search);
    });
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Afficher un message
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Démarrer l'édition
  const startEdit = (product) => {
    setEditingId(product.id);
    setEditQuantity(stockData[product.id]?.toString() || '0');
  };

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingId(null);
    setEditQuantity('');
  };

  // Sauvegarder le stock
  const saveStock = async (productId) => {
    const newQuantity = parseInt(editQuantity, 10);

    if (isNaN(newQuantity) || newQuantity < 0) {
      showMessage('error', 'Veuillez entrer une quantité valide (>= 0)');
      return;
    }

    try {
      setLoading(true);
      await productService.updateProductStock(productId, newQuantity);
      
      // Mettre à jour le stockData local
      setStockData(prev => ({
        ...prev,
        [productId]: newQuantity
      }));

      setEditingId(null);
      setEditQuantity('');
      showMessage('success', 'Stock mis à jour avec succès');
    } catch (error) {
      showMessage('error', `Erreur lors de la mise à jour: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le nom du produit
  const getProductName = (product) => {
    const getText = (val) => (val && typeof val === 'object' && val['#text'] !== undefined) ? val['#text'] : val;
    if (getText(product.name?.value)) {
      return getText(product.name.value);
    }
    if (product.name && typeof product.name === 'string') {
      return getText(product.name);
    }
    return 'Sans nom';
  };

  // Obtenir la référence du produit
  const getProductReference = (product) => {
    if (product.reference?.value) {
      return product.reference.value;
    }
    if (product.reference && typeof product.reference === 'string') {
      return product.reference;
    }
    return '-';
  };

  const getSelectedProduct = () => {
    if (!selectedProductId) return null;
    return products.find((product) => String(product.id) === String(selectedProductId)) || null;
  };

  const selectedProduct = getSelectedProduct();
  const selectedProductStock = selectedProduct ? (stockData[selectedProduct.id] ?? getStockQuantity(selectedProduct)) : 0;
  const stockHistory = selectedProduct
    ? productService.getDailyStockEvolution(selectedProduct.id, selectedProductStock)
    : [];

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading && products.length === 0) {
    return (
      <div className="stock-page loading">
        <div className="spinner"></div>
        <p>Chargement des produits...</p>
      </div>
    );
  }

  return (
    <div className="stock-page">
      {/* Header */}
      <div className="stock-header">
        <div>
          <h1 className="stock-title">Gestion du Stock</h1>
          <p className="stock-subtitle">Mettez à jour les quantités en stock de vos produits</p>
        </div>
        <div className="stock-stats">
          <div className="stat-badge">
            <span className="stat-label">Total produits</span>
            <span className="stat-value">{products.length}</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`message-alert message-${message.type}`}>
          <div className="message-icon">
            {message.type === 'success' ? <MdCheckCircle /> : <MdError />}
          </div>
          <span>{message.text}</span>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="stock-search">
        <div className="search-box">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom ou référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="results-count">
          {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="stock-history-panel">
        <div className="stock-history-panel-header">
          <div>
            <h2><MdHistory /> Évolution du stock journalier</h2>
            <p>Choisissez un produit pour voir son historique de stock.</p>
          </div>

          <select
            className="stock-history-select"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            {products.length === 0 && <option value="">Aucun produit</option>}
            {products.map((product) => (
              <option key={product.id} value={String(product.id)}>
                {getProductName(product)} — {getProductReference(product)}
              </option>
            ))}
          </select>
        </div>

        {!selectedProduct ? (
          <div className="stock-history-empty">
            Sélectionnez un produit pour afficher son évolution journalière.
          </div>
        ) : stockHistory.length === 0 ? (
          <div className="stock-history-empty">
            Aucune évolution de stock disponible pour ce produit.
          </div>
        ) : (
          <div className="stock-history-table-wrapper">
            <table className="stock-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ancienne quantité</th>
                  <th>Variation</th>
                  <th>Nouvelle quantité</th>
                  <th>Mise à jour</th>
                </tr>
              </thead>
              <tbody>
                {stockHistory.map((entry, index) => (
                  <tr key={`${entry.date}-${index}`}>
                    <td>{formatDisplayDate(entry.date)}</td>
                    <td>{entry.previousQuantity ?? 0}</td>
                    <td>
                      <span className={`stock-variation ${entry.variation >= 0 ? 'positive' : 'negative'}`}>
                        {entry.variation >= 0 ? '+' : ''}{entry.variation}
                      </span>
                    </td>
                    <td>{entry.quantity ?? 0}</td>
                    <td>{formatDateTime(entry.updatedAt || entry.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tableau des produits */}
      <div className="stock-container">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <MdSearch size={48} />
            <p>Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="card-header">
                  <div className="product-info">
                    <h3 className="product-name">{getProductName(product)}</h3>
                    <p className="product-reference">Ref: {getProductReference(product)}</p>
                  </div>
                </div>

                <div className="card-body">
                  <div className="stock-section">
                    <label className="stock-label">Quantité en stock</label>
                    {editingId === product.id ? (
                      <div className="edit-mode">
                        <input
                          type="number"
                          min="0"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="quantity-input"
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            onClick={() => saveStock(product.id)}
                            disabled={loading}
                            className="btn-save"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={loading}
                            className="btn-cancel"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="view-mode">
                        <div className={`quantity-display ${stockData[product.id] === 0 ? 'low-stock' : ''}`}>
                          {stockData[product.id]}
                        </div>
                        {product?.stock_breakdown && product.stock_breakdown.length > 0 && (
                          <div className="stock-breakdown">
                            {product.stock_breakdown.map(sb => (
                              <div key={sb.idProductAttribute} className="stock-breakdown-item">
                                <small>{sb.label}: {sb.quantity}</small>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => startEdit(product)}
                          className="btn-edit"
                          title="Modifier le stock"
                        >
                          <MdEdit /> Modifier
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="stock-info">
                    {stockData[product.id] === 0 && (
                      <div className="alert-low">
                        <span>⚠️ Stock épuisé</span>
                      </div>
                    )}
                    {stockData[product.id] > 0 && stockData[product.id] <= 10 && (
                      <div className="alert-medium">
                        <span>⚠️ Stock faible</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
