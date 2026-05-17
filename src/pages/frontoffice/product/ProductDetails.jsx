import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { productService } from '../../../service/Product';
import { localCartService, cartService } from '../../../service/Cart';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [declinaisons, setDeclinaisons] = useState([]);
  const [attributSelected, setAttributeSelected] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const rawProduct = await productService.getProductById(id);
        const formatted = productService.formatProduct(rawProduct);
        const decs = await productService.getProductCombinationsWithPrices(id);
        setDeclinaisons(decs);
        if (decs && decs.length > 0) {
          setAttributeSelected(decs[0]);
        }

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

  const handleAddToCart = async () => {
    const currentUser = JSON.parse(localStorage.getItem('client_session'));
    const customerId = currentUser?.id || 1; // 1 = anonyme par défaut

    const priceToAdd = (attributSelected && attributSelected.priceTTC !== '0.00') ? attributSelected.priceTTC : (product?.priceTTC || product?.price || '0.00');
    
    const productToAdd = {
      ...product,
      id_product_attribute: attributSelected?.idProductAttribute || 0,
      name: attributSelected?.name && attributSelected.idProductAttribute ? `${product.name} - ${attributSelected.name}` : product.name,
      price: priceToAdd
    };

    // 1. Mise à jour du panier local
    localCartService.addToCart(customerId, productToAdd, quantity);

    try {
      // 2. Logique API pour sauvegarder en BDD
      // Note: id_address_delivery par defaut à 0 dans ce stade
      const itemToApi = {
        id_product: productToAdd.id,
        id_product_attribute: productToAdd.id_product_attribute,
        quantity: quantity,
        id_address_delivery: 0
      };

      // Si vous stockez l'ID du panier en cours dans le local storage
      let currentCartId = localStorage.getItem(`current_cart_id_${customerId}`);
      
      if (!currentCartId) {
        // Création d'un nouveau panier
        const createdCart = await cartService.createCart(customerId, [itemToApi], 1, 1, 0);
        if (createdCart && createdCart.id) {
           const newId = typeof createdCart.id === 'object' ? createdCart.id['#text'] : createdCart.id;
           localStorage.setItem(`current_cart_id_${customerId}`, newId);
        }
      } else {
         // Le panier API existe déjà.
         // On récupère le contenu complet depuis le state local pour forcer une écrasement propre dans PrestaShop.
         const localItems = localCartService.getCart(customerId);
         
         const itemsToApi = localItems.map(item => ({
            id_product: item.id,
            id_product_attribute: item.idProductAttribute || item.id_product_attribute || 0,
            quantity: item.quantity,
            id_address_delivery: 0
         }));

         // On écrase les lignes du panier PrestaShop existant avec toutes les lignes du panier local.
         await cartService.updateCart(currentCartId, {
             id_customer: customerId,
             id_currency: 1,
             id_lang: 1,
             associations: {
                 cart_rows: {
                     cart_row: itemsToApi
                 }
             }
         });
      }
    } catch(e) {
      console.error("Erreur de sauvegarde API du panier :", e);
    }
    
    setAddedToCart(true);

    setTimeout(() => {
      setAddedToCart(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center fs-4 fw-bold">
          Chargement...
        </div>
      </div>
    );
  }
    if (!product) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center fs-4 fw-bold">
          Produit non trouvé
        </div>
      </div>
    );
  }

  const priceTTC = attributSelected?.priceTTC || product?.priceTTC || product?.price || '0.00';
  const priceHT = attributSelected?.priceHT || product?.priceHT || '0.00';

  return (
    <>
      <Header />
      <div className="product-details-container">
        <Link to="/mystore/fr/products" className="back-link">← Retour aux produits</Link>
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

            {declinaisons && declinaisons.length > 0 && (
              <div className="product-combinations">
                <label htmlFor="combination-select">Type :</label>
                <select 
                  id="combination-select"
                  className="combination-select" 
                  value={attributSelected?.idProductAttribute || ''}
                  onChange={(e) => {
                    const selected = declinaisons.find(d => d.idProductAttribute.toString() === e.target.value);
                    setAttributeSelected(selected || null);
                  }}
                >
                  {declinaisons.map((d) => (
                    <option key={d.idProductAttribute} value={d.idProductAttribute}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
