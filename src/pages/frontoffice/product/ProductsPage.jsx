import React, { useEffect, useState } from 'react';
import Header from '../../../components/layout/Header';
import HeroSection from '../../../components/layout/HeroSection';
import ProductGridSection from '../../../components/UI/product/ProductGridSection';
import ProductSearch from '../../../components/UI/product/ProductSearch';
import HomePage from '../home/HomePage';
import { productService } from '../../../service/Product';
import { Divide } from 'lucide-react';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [session, setSession] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const currentSession = localStorage.getItem('client_session');
    if (currentSession) {
      setSession(JSON.parse(currentSession));
    }
  }, []);

  const handleUserSelected = () => {
    const currentSession = localStorage.getItem('client_session');
    if (currentSession) {
      setSession(JSON.parse(currentSession));
    }
  };

  const fetchProducts = async (filters = {}) => {
    setSearching(true);
    try {
      const rawProducts = await productService.getAllProducts(filters);
      const formatted = rawProducts.map(p => productService.formatProduct(p));
      setFilteredProducts(formatted);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      console.error('Error fetching products', error);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchProducts();
  }, [session]);

  const handleSearch = (params) => {
    fetchProducts(params);
  };

  if (!session) {
    return <HomePage onUserSelected={handleUserSelected} />;
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <>
      <Header />
      
      <HeroSection /> 
      
      <ProductSearch onSearch={handleSearch}/>

      {searching ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="text-center fs-5 fw-bold text-muted">
            Chargement des produits depuis la base de données...
          </div>
        </div>
      ) : (
        <>
          <ProductGridSection 
            title="Catalogue des produits" 
            products={currentProducts} 
          />
          
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4 mb-5 pb-5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`btn mx-1 ${currentPage === pageNum ? 'btn-success' : 'btn-outline-success'}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ProductsPage;