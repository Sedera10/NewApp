import React, { useEffect, useState } from 'react';
import Header from '../../../components/layout/Header';
import HeroSection from '../../../components/layout/HeroSection';
import ProductGridSection from '../../../components/UI/product/ProductGridSection';
import { productService } from '../../../service/Product';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const rawProducts = await productService.getAllProducts(12);
        const formatted = rawProducts.map(p => productService.formatProduct(p));
        setProducts(formatted);
      } catch (error) {
        console.error('Error fetching products', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <>
      <Header />
      
      <HeroSection /> 
      
      <ProductGridSection 
        title="Tous les produits" 
        products={products} 
      />
      
      <ProductGridSection 
        title="Nouveautés" 
        products={products.filter(p => p.isNew)} 
      />
    </>
  );
};

export default HomePage;