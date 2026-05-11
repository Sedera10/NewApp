import React from 'react';
import Header from '../../../components/layout/Header';
import HeroSection from '../../../components/layout/HeroSection'; // À garder si tu veux l'en-tête sombre avec l'image
import ProductGridSection from '../../../components/UI/product/ProductGridSection';

// Fausses données pour simuler ton futur XML PrestaShop
const mockProductsPopulaires = [
  { id: 1, name: 'Fauteuil Gris', price: 155, isNew: true, discount: null, image: 'https://picsum.photos/300' },
  { id: 2, name: 'Table d\'appoint', price: 85, isNew: false, discount: null, image: 'https://picsum.photos/300' },
  { id: 3, name: 'Chaise Orange', price: 125, isNew: false, discount: 15, oldPrice: 145, image: 'https://picsum.photos/300' },
  { id: 4, name: 'Table en bois', price: 95, isNew: true, discount: null, image: 'https://picsum.photos/300' },
];

const mockProductsPromo = [
  { id: 5, name: 'Étagère Minimaliste', price: 65, isNew: false, discount: 35, oldPrice: 100, image: 'https://picsum.photos/300' },
  { id: 6, name: 'Lampe de bureau', price: 45, isNew: false, discount: 10, oldPrice: 50, image: 'https://picsum.photos/300' },
  { id: 7, name: 'Canapé 3 places', price: 450, isNew: false, discount: 20, oldPrice: 560, image: 'https://picsum.photos/300' },
  { id: 8, name: 'Tapis design', price: 120, isNew: true, discount: 5, oldPrice: 126, image: 'https://picsum.photos/300' },
];

const HomePage = () => {
  return (
    <>
      <Header />
      
      {/* Ton composant HeroSection existant va ici */}
      <HeroSection /> 
      
      {/* On utilise notre composant Grid réutilisable autant de fois qu'on veut */}
      <ProductGridSection 
        title="Les plus populaires" 
        products={mockProductsPopulaires} 
      />
      
      <ProductGridSection 
        title="En Promotion" 
        products={mockProductsPromo} 
      />
      
      <ProductGridSection 
        title="Nouveautés" 
        products={mockProductsPopulaires.filter(p => p.isNew)} 
      />

      {/* Et ainsi de suite... La page peut être très longue ! */}
    </>
  );
};

export default HomePage;