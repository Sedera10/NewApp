import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="product-card">
      <div className="image-container">
        {/* Badges */}
        <div className="badges">
          {product.isNew && <span className="badge badge-new">Nouveau</span>}
          {product.discount && <span className="badge badge-discount">-{product.discount}%</span>}
        </div>
        
        {/* Favoris */}
        <button 
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={() => setIsFavorite(!isFavorite)}
        >
          <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <Link to={`/mystore/fr/product/${product.id}`}>
          <img src={product.image} alt={product.name} />
        </Link>
      </div>

      <div className="product-info">
        <Link to={`/mystore/fr/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <div className="price-container">
          <span className="product-price">{product.price} €</span>
          {product.oldPrice && <span className="old-price">{product.oldPrice} €</span>}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;