import React, { useState, useEffect, useRef } from 'react';
import { productService } from '../../../service/Product';
import './ProductSearch.css';

const ProductSearch = ({ onSearch }) => {
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [searchParams, setSearchParams] = useState({
    name: '',
    category: '',
    minPrice: '',
    maxPrice: ''
  });
  const [selectedCategoryName, setSelectedCategoryName] = useState('Toutes les catégories');
  
  // Controls dropdown visibilities
  const [openDropdown, setOpenDropdown] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const cats = await productService.getCategories();
      
      const getText = (val) => (val && typeof val === 'object' && val['#text'] !== undefined) ? val['#text'] : val;
      const getLang = (nameObj) => {
        if (!nameObj) return 'Catégorie';
        if (Array.isArray(nameObj.language)) return getText(nameObj.language[0]);
        if (typeof nameObj.language === 'object') return getText(nameObj.language);
        return getText(nameObj);
      };

      const map = {};
      const tree = [];
      
      cats.forEach(c => {
        const id = getText(c.id);
        map[id] = { ...c, id, nameStr: getLang(c.name), children: [] };
      });

      cats.forEach(c => {
        const id = getText(c.id);
        const parentId = getText(c.id_parent);
        const nameLowerCase = map[id]?.nameStr.toLowerCase();
        
        // Exclude root and home categories from being displayed as options
        if (id === "1" || id === "2" || nameLowerCase === "racine" || nameLowerCase === "accueil" || nameLowerCase === "root" || nameLowerCase === "home") {
          return;
        }

        // If it's a child of root/home, or if fallback doesn't have parent, it's a main category
        if (parentId === "1" || parentId === "2" || parentId === "0" || !parentId || map[parentId]?.nameStr.toLowerCase() === "racine" || map[parentId]?.nameStr.toLowerCase() === "accueil") {
          tree.push(map[id]);
        } else if (map[parentId]) {
          map[parentId].children.push(map[id]);
        } else {
          // Fallback if parent not found or parent is not showing
          tree.push(map[id]);
        }
      });

      // Filter out duplicate or missing entries if any
      const finalTree = tree.filter(Boolean);
      
      setCategoriesTree(finalTree);
    };
    fetchCategories();

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategorySelect = (id, name, childrenIds = []) => {
    let catParam = id;
    if (childrenIds && childrenIds.length > 0) {
      catParam = `${id}|${childrenIds.join('|')}`;
    }
    setSearchParams(prev => ({ ...prev, category: catParam, _categoryId: id }));
    setSelectedCategoryName(name || 'Toutes les catégories');
    setOpenDropdown(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchParams);
  };

  return (
    <div className="product-search-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className="product-search-form">
        
        {/* Nom du produit */}
        <div className="search-field-group">
          <label className="search-label">Nom</label>
          <input 
            type="text" 
            name="name" 
            placeholder="Ex: T-shirt noir..." 
            value={searchParams.name} 
            onChange={handleChange} 
            className="search-input"
          />
        </div>
        
        {/* Catégorie personnalisée */}
        <div className="search-field-group category-group">
          <label className="search-label">Catégorie</label>
          <div className="custom-categories-container">
            <button 
                type="button" 
                className={`dropdown-btn reset-cat-btn ${!searchParams.category ? 'active-cat' : ''}`}
                onClick={() => handleCategorySelect('', 'Toutes les catégories')}
            >
                Tout
            </button>
            {categoriesTree.map(parentCat => (
              <div 
                className="dropdown" 
                key={parentCat.id}
                onMouseEnter={() => setOpenDropdown(parentCat.id)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  type="button" 
                  className={`dropdown-btn ${searchParams._categoryId === parentCat.id || parentCat.children.some(c => c.id === searchParams._categoryId) ? 'active-cat' : ''}`}
                  onClick={() => handleCategorySelect(parentCat.id, parentCat.nameStr, parentCat.children.map(c => c.id))}
                >
                  {parentCat.nameStr}
                </button>
                {parentCat.children.length > 0 && openDropdown === parentCat.id && (
                  <div className="dropdown-content">
                    {parentCat.children.map(childCat => (
                      <a 
                        key={childCat.id} 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleCategorySelect(childCat.id, childCat.nameStr); }}
                        className={searchParams._categoryId === childCat.id ? 'active-child' : ''}
                      >
                        {childCat.nameStr}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Différence de Prix */}
        <div className="search-field-group">
          <label className="search-label">Différence de prix</label>
          <div className="price-inputs">
            <input 
              type="number" 
              name="minPrice" 
              placeholder="Prix min" 
              value={searchParams.minPrice} 
              onChange={handleChange} 
              className="search-input"
            />
            <span className="price-separator">-</span>
            <input 
              type="number" 
              name="maxPrice" 
              placeholder="Prix max" 
              value={searchParams.maxPrice} 
              onChange={handleChange} 
              className="search-input"
            />
          </div>
        </div>

        <div className="search-action-group">
          <button type="submit" className="search-submit-btn">Rechercher</button>
        </div>

      </form>
    </div>
  );
};

export default ProductSearch;