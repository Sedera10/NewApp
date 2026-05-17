import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const priceTTC = product?.priceTTC ?? product?.price ?? '0.00';
  const priceHT = product?.priceHT ?? '0.00';

  return (
    <div className="product-card">
      <div className="image-container">
        {/* Badges */}
        <div className="badges">
          {product.marker && <span className={`badge badge-${product.marker.toLowerCase()}`}>{product.marker}</span>}
          {!product.marker && product.isNew && <span className="badge badge-new">NEW</span>}
          {product.discount && <span className="badge badge-discount">-{product.discount}%</span>}
        </div>

        <Link to={`/mystore/fr/product/${product.id}`}>
          <img src={product.image} alt={product.name} />
        </Link>
      </div>

      <div className="product-info">
        <Link to={`/mystore/fr/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <div className="price-container">
          <span className="product-price">
            {priceTTC} € <span className="product-price-ht">( {priceHT} € HT )</span>
          </span>
          {product.oldPrice && <span className="old-price">{product.oldPrice} €</span>}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;