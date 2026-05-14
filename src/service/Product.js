import api from './api';
import { xmlToJson } from './Util';

export const productService = {
  // Fetch all products with full details and optional filters
  getAllProducts: async (filters = {}) => {
    try {
      let url = `/products?display=full`;
      
      if (filters.name) url += `&filter[name]=%[${filters.name}]%`;

      // fetch a large amount to fix "invisible" products, limit will be managed by UI
      url += `&limit=500`;

      const response = await api.get(url);
      const jsonObj = xmlToJson(response.data);
      let products = jsonObj?.prestashop?.products?.product || [];
      if (!Array.isArray(products)) products = products ? [products] : [];
      
      // Post-fetch filtering for categories (using all associated categories, not just the default one)
      if (filters.category) {
        const catIds = String(filters.category).split('|');
        products = products.filter(p => {
          // Extract all category IDs associated with this product
          let productCatIds = [];
          
          if (p.associations && p.associations.categories && p.associations.categories.category) {
            let cats = p.associations.categories.category;
            if (!Array.isArray(cats)) cats = [cats];
            
            cats.forEach(c => {
              if (c === null || c === undefined) return;
              if (typeof c === 'object' && c.id !== undefined) {
                if (typeof c.id === 'object' && c.id['#text'] !== undefined) {
                  productCatIds.push(String(c.id['#text']));
                } else {
                  productCatIds.push(String(c.id));
                }
              } else if (typeof c === 'number' || typeof c === 'string') {
                productCatIds.push(String(c));
              }
            });
          }
          
          // Also fallback to default category just in case
          if (p.id_category_default) {
            const defCat = typeof p.id_category_default === 'object' ? String(p.id_category_default['#text']) : String(p.id_category_default);
            if (defCat && !productCatIds.includes(defCat)) {
              productCatIds.push(defCat);
            }
          }

          // Check if any of the requested category IDs match the product's categories
          return catIds.some(id => productCatIds.includes(String(id)));
        });
      }

      // Post-fetch filtering for price (Prestashop XML API price ranges are harder to query directly)
      if (filters.minPrice) {
        products = products.filter(p => parseFloat(p.price || 0) >= parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        products = products.filter(p => parseFloat(p.price || 0) <= parseFloat(filters.maxPrice));
      }

      return products;
    } catch (error) {
      console.error("Error fetching products", error);
      return [];
    }
  },

  // Fetch product by ID
  getProductById: async (id) => {
    try {
      const response = await api.get(`/products/${id}?display=full`);
      const jsonObj = xmlToJson(response.data);
      return jsonObj?.prestashop?.product || null;
    } catch (error) {
      console.error(`Error fetching product ${id}`, error);
      return null;
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/categories?display=full');
      const jsonObj = xmlToJson(response.data);
      const categories = jsonObj?.prestashop?.categories?.category || [];
      return Array.isArray(categories) ? categories : [categories];
    } catch (error) {
      console.error("Error fetching categories", error);
      return [];
    }
  },

  // Helper to format prestashop product for UI
  formatProduct: (p) => {
    if (!p) return null;
    
    const getText = (val) => (val && typeof val === 'object' && val['#text'] !== undefined) ? val['#text'] : val;

    const id = getText(p.id);
    
    let name = 'Unnamed Product';
    if (p.name) {
      if (Array.isArray(p.name.language)) {
        name = getText(p.name.language[0]);
      } else if (p.name.language) {
        name = getText(p.name.language);
      } else {
        name = getText(p.name);
      }
    }

    const price = p.price ? parseFloat(getText(p.price)).toFixed(2) : 0;
    
    // Get image specific from prestashop
    const defaultImageId = getText(p.id_default_image);
    // Construct prestashop image url (assuming images endpoint layout)
    // /api/images/products/{id}/{id_default_image}/
    const image = defaultImageId ? `${api.defaults.baseURL}/images/products/${id}/${defaultImageId}/?ws_key=${api.defaults.params.ws_key}` : 'https://picsum.photos/300';

    const rawDateAvailability = getText(p.available_date) || getText(p.date_add) || getText(p.date_upd);
    let marker = null;
    let isNew = false;
    
    if (rawDateAvailability && rawDateAvailability !== '0000-00-00 00:00:00') {
      const parsedDate = new Date(rawDateAvailability);
      const now = new Date();
      const diffMs = now - parsedDate;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) {
        marker = 'HOT';
        isNew = true;
      } else if (diffDays <= 7) {
        marker = 'NEW';
        isNew = true;
      }
    } else {
      isNew = getText(p.condition) === 'new';
    }

    return {
      id,
      name,
      price,
      isNew,
      marker,
      discount: null, // Depending on specific fields
      image,
      id_category_default: getText(p.id_category_default)
    };
  }
};
