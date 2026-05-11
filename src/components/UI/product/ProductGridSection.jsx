import React from 'react';
import ProductCard from './ProductCard';
import './ProductGridSection.css';

const ProductGridSection = ({ title, products }) => {
  return (
    <section className="product-section">
      <div className="section-container">
        <h2 className="section-title">{title}</h2>
        
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGridSection;