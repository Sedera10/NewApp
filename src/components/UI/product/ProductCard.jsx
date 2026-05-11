import React, { useState } from 'react';
import { Heart } from 'lucide-react';
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

        <img src={product.image} alt={product.name} />
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="price-container">
          <span className="product-price">{product.price} €</span>
          {product.oldPrice && <span className="old-price">{product.oldPrice} €</span>}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;