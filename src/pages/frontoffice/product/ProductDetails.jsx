import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { productService } from '../../../service/Product';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Chargement...</div>;
  if (!product) return <div>Produit non trouvé</div>;

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
            <p className="product-price">{product.price} €</p>
            {product.isNew && <span className="badge badge-new">Nouveau</span>}
            <div className="product-description" dangerouslySetInnerHTML={{ __html: product.description || 'Aucune description disponible.' }} />
            <button className="add-to-cart-btn">Ajouter au panier</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;
