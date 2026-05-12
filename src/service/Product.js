import api from './api';
import { xmlToJson } from './Util';

export const productService = {
  // Fetch all products with full details
  getAllProducts: async (limit = 10) => {
    try {
      const response = await api.get(`/products?display=full&limit=${limit}`);
      const jsonObj = xmlToJson(response.data);
      const products = jsonObj?.prestashop?.products?.product || [];
      // If single product returned, convert to array
      return Array.isArray(products) ? products : [products];
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

    return {
      id,
      name,
      price,
      isNew: p.condition === 'new',
      discount: null, // Depending on specific fields
      image
    };
  }
};
