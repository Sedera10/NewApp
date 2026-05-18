import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCheckCircle, MdError, MdVisibility } from 'react-icons/md';
import { productService } from '../../../service/Product';
import './StockPage.css';

const getTextVal = (value) => {
  if (value && typeof value === 'object' && value['#text'] !== undefined) {
    return value['#text'];
  }
  return value;
};

const formatProductRows = (products) => {
  const rows = [];

  products.forEach((product) => {
    const formattedProduct = productService.formatProduct(product) || {};
    const productName = formattedProduct.name || `Produit #${product.id}`;
    const productImage = formattedProduct.image || '/LoginCover.avif';
    const productReference = getTextVal(product.reference) || `REF-${product.id}`;
    const breakdown = Array.isArray(product.stock_breakdown) && product.stock_breakdown.length > 0
      ? product.stock_breakdown
      : [{ idProductAttribute: 0, label: 'Produit', quantity: product.computed_stock ?? product.stock ?? 0 }];

    breakdown.forEach((declination) => {
      rows.push({
        idProduct: String(product.id),
        productName,
        productImage,
        productReference,
        declinationId: Number.parseInt(declination.idProductAttribute, 10) || 0,
        declinationName: declination.label || 'Produit',
        quantity: Number.parseInt(declination.quantity, 10) || 0
      });
    });
  });

  return rows;
};

export default function StockPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingKey, setEditingKey] = useState(null);
  const [editDelta, setEditDelta] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const allProducts = await productService.getAllProducts();
      setProducts(formatProductRows(allProducts));
    } catch (error) {
      showMessage('error', 'Erreur lors du chargement des produits');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(showMessage.timeoutId);
    showMessage.timeoutId = window.setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3500);
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => (
      product.productName.toLowerCase().includes(term)
      || product.productReference.toLowerCase().includes(term)
      || product.declinationName.toLowerCase().includes(term)
    ));
  }, [products, searchTerm]);

  const startEdit = (row) => {
    setEditingKey(`${row.idProduct}_${row.declinationId}`);
    setEditDelta('0');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditDelta('0');
  };

  const saveStock = async (row) => {
    const delta = Number.parseInt(editDelta, 10);
    if (Number.isNaN(delta)) {
      showMessage('error', 'Veuillez saisir un delta valide');
      return;
    }

    try {
      setLoading(true);
      await productService.updateStockByDelta(row.idProduct, row.declinationId, delta);
      showMessage('success', 'Stock mis à jour avec succès');
      await fetchProducts();
      cancelEdit();
    } catch (error) {
      showMessage('error', 'Erreur lors de la mise à jour du stock');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openProductSheet = (row) => {
    navigate(`/mystore/admin/stock/${row.idProduct}`);
  };

  const totalRows = filteredProducts.length;
  const totalStock = filteredProducts.reduce((sum, row) => sum + row.quantity, 0);

  if (loading && products.length === 0) {
    return (
      <div className="stock-page loading">
        <div className="spinner" />
        <p>Chargement des stocks...</p>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="stock-header">
        <div>
          <h1 className="stock-title">Gestion des stocks par déclinaison</h1>
          <p className="stock-subtitle">
            La modification passe par les deltas PrestaShop, pas par un stock global.
          </p>
        </div>

        <div className="stock-summary">
          <div className="summary-card">
            <span>Lignes visibles</span>
            <strong>{totalRows}</strong>
          </div>
          <div className="summary-card">
            <span>Stock total</span>
            <strong>{totalStock}</strong>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`message-alert message-${message.type}`}>
          <div className="message-icon">
            {message.type === 'success' ? <MdCheckCircle /> : <MdError />}
          </div>
          <span>{message.text}</span>
        </div>
      )}

      <div className="stock-toolbar">
        <input
          type="search"
          className="stock-search-input"
          placeholder="Rechercher un produit, une référence ou une déclinaison"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="stock-container">
        <div className="stock-table-wrapper">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Produit</th>
                <th>Référence</th>
                <th>Déclinaison</th>
                <th>Stock actuel</th>
                <th>Delta</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length ? filteredProducts.map((row) => {
                const rowKey = `${row.idProduct}_${row.declinationId}`;
                const isEditing = editingKey === rowKey;

                return (
                  <tr key={rowKey}>
                    <td>
                      <img className="stock-product-image" src={row.productImage} alt={row.productName} />
                    </td>
                    <td>
                      <strong>{row.productName}</strong>
                    </td>
                    <td>{row.productReference}</td>
                    <td>{row.declinationName}</td>
                    <td>
                      <span className="stock-value">{row.quantity}</span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editDelta}
                          onChange={(event) => setEditDelta(event.target.value)}
                          className="delta-input"
                          placeholder="+5 / -2"
                          autoFocus
                        />
                      ) : (
                        <span className="stock-placeholder">—</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveStock(row)} className="btn-save">
                              Enregistrer
                            </button>
                            <button onClick={cancelEdit} className="btn-cancel">
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(row)} className="btn-edit">
                              Modifier
                            </button>
                            <button onClick={() => openProductSheet(row)} className="btn-view">
                              <MdVisibility size={16} />
                              Fiche
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="no-products-row">
                    Aucun produit ne correspond à la recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
