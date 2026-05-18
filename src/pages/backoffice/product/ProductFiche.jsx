import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { productService } from '../../../service/Product';
import './ProductFiche.css';

const getTextVal = (value) => {
  if (value && typeof value === 'object' && value['#text'] !== undefined) {
    return value['#text'];
  }
  return value;
};

const formatDate = (dateKey) => {
  if (!dateKey) return '—';
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('fr-FR');
};

const renderMovementDetails = (items, toneClass, sign = '') => {
  if (!items || !items.length) {
    return <span className="movement-empty">—</span>;
  }

  return (
    <div className={`movement-list ${toneClass}`}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="movement-line">
          <strong className="movement-qty">{sign}{item.quantity}</strong>
          <span className="movement-label">({item.label})</span>
        </span>
      ))}
    </div>
  );
};

export default function ProductFiche() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [selectedDeclinationId, setSelectedDeclinationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [evolutionRows, setEvolutionRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError('');

        const rawProduct = await productService.getProductById(id);
        if (!rawProduct) {
          setProduct(null);
          return;
        }

        const formattedProduct = productService.formatProduct(rawProduct);
        const description = (() => {
          const rawDescription = rawProduct?.description;
          if (!rawDescription) return '';
          if (Array.isArray(rawDescription.language)) {
            return getTextVal(rawDescription.language[0]);
          }
          if (rawDescription.language) {
            return getTextVal(rawDescription.language);
          }
          return getTextVal(rawDescription);
        })();

        const stockBreakdown = Array.isArray(rawProduct.stock_breakdown) ? rawProduct.stock_breakdown : [];
        const defaultDeclinationId = stockBreakdown[0]?.idProductAttribute !== undefined
          ? String(stockBreakdown[0].idProductAttribute)
          : '0';

        setProduct({
          ...formattedProduct,
          reference: getTextVal(rawProduct.reference),
          description,
          stock_breakdown: stockBreakdown,
          raw: rawProduct
        });
        setSelectedDeclinationId(defaultDeclinationId);
      } catch (loadError) {
        console.error(loadError);
        setError('Impossible de charger la fiche produit.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const selectedStock = useMemo(() => {
    if (!product) return null;
    const stockRows = Array.isArray(product.stock_breakdown) ? product.stock_breakdown : [];
    return stockRows.find((row) => String(row.idProductAttribute) === String(selectedDeclinationId)) || stockRows[0] || null;
  }, [product, selectedDeclinationId]);

  useEffect(() => {
    let isActive = true;

    const loadEvolution = async () => {
      if (!id || !startDate || !endDate) {
        if (isActive) {
          setEvolutionRows([]);
        }
        return;
      }

      try {
        if (isActive) {
          setEvolutionLoading(true);
        }
        const result = await productService.getStockEvolutionBetweenDates({
          productId: id,
          productAttributeId: selectedDeclinationId,
          startDate,
          endDate
        });
        // Mode produit global (décommente si tu veux revenir au produit parent)
        // const result = await productService.getStockEvolutionBetweenDates({
        //   productId: id,
        //   startDate,
        //   endDate
        // });
        if (isActive) {
          setEvolutionRows(result.rows || []);
        }
      } catch (loadError) {
        console.error(loadError);
        if (isActive) {
          setEvolutionRows([]);
        }
      } finally {
        if (isActive) {
          setEvolutionLoading(false);
        }
      }
    };

    loadEvolution();

    return () => {
      isActive = false;
    };
  }, [id, startDate, endDate, selectedDeclinationId]);

  if (loading) {
    return (
      <div className="product-sheet loading">
        <div className="spinner" />
        <p>Chargement de la fiche produit...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-sheet">
        <div className="error-banner">{error}</div>
        <button className="back-button" onClick={() => navigate('/mystore/admin/stock')}>
          <MdArrowBack size={18} /> Retour
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-sheet">
        <div className="error-banner">Produit introuvable.</div>
        <button className="back-button" onClick={() => navigate('/mystore/admin/stock')}>
          <MdArrowBack size={18} /> Retour
        </button>
      </div>
    );
  }

  return (
    <div className="product-sheet">
      <div className="sheet-header">
        <div>
          <h1 className="sheet-title">Fiche produit</h1>
          <p className="sheet-subtitle">Stock par déclinaison et évolution journalière sur la période choisie.</p>
        </div>
        <button className="back-button" onClick={() => navigate('/mystore/admin/stock')}>
          <MdArrowBack size={18} /> Retour aux stocks
        </button>
      </div>

      <div className="sheet-overview">
        <div className="sheet-card sheet-product-card">
          <img src={product.image} alt={product.name} className="sheet-image" />
          <div className="sheet-product-meta">
            <h2>{product.name}</h2>
            <p className="sheet-reference">Référence : {product.reference || '—'}</p>
            <div
              className="sheet-description"
              dangerouslySetInnerHTML={{
                __html: product.description || '<p>Aucune description disponible.</p>'
              }}
            />
          </div>
        </div>

        <div className="sheet-card sheet-stock-card">
          <div className="sheet-card-title">Stock disponible par déclinaison</div>
          <div className="stock-breakdown-list">
            {product.stock_breakdown?.length ? product.stock_breakdown.map((row) => (
              <button
                key={row.idProductAttribute}
                className={`breakdown-item ${String(row.idProductAttribute) === String(selectedDeclinationId) ? 'active' : ''}`}
                onClick={() => setSelectedDeclinationId(String(row.idProductAttribute))}
              >
                <span>{row.label || 'Produit'}</span>
                <strong>{row.quantity}</strong>
              </button>
            )) : (
              <div className="no-stock-breakdown">Aucune déclinaison trouvée pour ce produit.</div>
            )}
          </div>
          <div className="selected-stock-box">
            <span>Stock sélectionné</span>
            <strong>{selectedStock ? selectedStock.quantity : 0}</strong>
            <small>{selectedStock?.label || 'Produit'}</small>
          </div>
        </div>
      </div>

      <div className="sheet-card sheet-filter-card">
        <div className="sheet-card-title">Évolution du stock</div>
        <div className="date-grid">
          <label>
            <span>Date de début</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            <span>Date de fin</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>
        <p className="sheet-hint">
          La table se reconstruit à partir du stock actuel du produit mère et des mouvements `stock_deltas`, avec le détail des déclinaisons concernées.
        </p>
      </div>

      <div className="sheet-card sheet-table-card">
        {evolutionLoading ? (
          <div className="evolution-loading">Chargement de l'évolution...</div>
        ) : startDate && endDate ? (
          <div className="table-wrapper">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Stock initiale</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Disponibles</th>
                </tr>
              </thead>
              <tbody>
                {evolutionRows.length ? evolutionRows.map((row) => (
                  <tr key={row.date}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.stockInitial}</td>
                    <td>{renderMovementDetails(row.entreeDetails, 'movement-green', '+')}</td>
                    <td>{renderMovementDetails(row.sortiDetails, 'movement-red', '-')}</td>
                    <td><strong>{row.disponibles}</strong></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="no-data-row">Aucun mouvement sur cette période.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="evolution-empty">
            Sélectionnez deux dates pour afficher l'évolution du stock.
          </div>
        )}
      </div>
    </div>
  );
}
