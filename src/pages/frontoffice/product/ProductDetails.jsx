import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { productService } from '../../../service/Product';
import { localCartService } from '../../../service/Cart';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const rawProduct = await productService.getProductById(id);
        const formatted = productService.formatProduct(rawProduct);

        // Add additional details from rawProduct if needed (e.g. description)
        if (formatted) {
          const getText = (val) => (val && typeof val === 'object' && val['#text'] !== undefined) ? val['#text'] : val;

          let desc = "Aucune description";
          if (rawProduct?.description) {
              if (Array.isArray(rawProduct.description.language)) {
                  desc = getText(rawProduct.description.language[0]);
              } else if (rawProduct.description.language) {
                  desc = getText(rawProduct.description.language);
              } else {
                  desc = getText(rawProduct.description);
              }
          }

          formatted.description = desc;
          formatted.stock = parseInt(formatted.stock, 10) || 0;
        }

        setProduct(formatted);
      } catch (error) {
        console.error('Error fetching product', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleAddToCart = () => {
    const currentUser = JSON.parse(localStorage.getItem('client_session'));
    const customerId = currentUser?.id || 0;

    localCartService.addToCart(customerId, product, quantity);
    setAddedToCart(true);

    setTimeout(() => {
      setAddedToCart(false);
    }, 2000);
  };

  if (loading) return <div>Chargement...</div>;
  if (!product) return <div>Produit non trouvé</div>;

  const priceTTC = product?.priceTTC ?? product?.price ?? '0.00';
  const priceHT = product?.priceHT ?? '0.00';

  return (
    <>
      <Header />
      <div className="product-details-container">
        <Link to="/mystore/fr" className="back-link">← Retour aux produits</Link>
        <div className="product-details-card">
          <div className="product-details-image">
            <img src={product.image} alt={product.name} />
          </div>
          <div className="product-details-info">
            <h1>{product.name}</h1>
            <p className="product-price">
              {priceTTC} € <span className="product-price-ht">( {priceHT} € HT)</span>
            </p>
            {product.isNew && <span className="badge badge-new">Nouveau</span>}
            
            {/* Affichage du stock */}
            <div className={`stock-badge ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}`}>
              {product.stock > 0 ? (
                <>
                  <span className="stock-status">En stock</span>
                  <span className="stock-quantity">{product.stock} article{product.stock > 1 ? 's' : ''} disponible{product.stock > 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <span className="stock-status">Rupture de stock</span>
                  <span className="stock-quantity">Actuellement indisponible</span>
                </>
              )}
            </div>

            <div className="product-description" dangerouslySetInnerHTML={{ __html: product.description || 'Aucune description disponible.' }} />

            <div className="product-actions">
              <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={product.stock === 0}>−</button>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" disabled={product.stock === 0} />
                <button onClick={() => setQuantity(quantity + 1)} disabled={product.stock === 0}>+</button>
              </div>

              <button
                className={`add-to-cart-btn ${addedToCart ? 'success' : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? 'Rupture de stock' : addedToCart ? '✓ Ajouté au panier' : 'Ajouter au panier'}
              </button>
            </div>

            <button
              className="view-cart-link"
              onClick={() => navigate('/mystore/fr/cart')}
            >
              Voir le panier →
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;
