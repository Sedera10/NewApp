import api from '../../api';
import { xmlToJson } from '../../Util';

export const prestashopApi = {
  createResource: async (resource, xml) => {
    const response = await api.post(`/${resource}`, xml);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop;
  },
  updateResource: async (resource, id, xml) => {
    const response = await api.put(`/${resource}/${id}`, xml);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop;
  },
  getResources: async (resource, id = null, filter = null, params = {}) => {
    let url = `/${resource}`;
    if (id) {
      url += `/${id}`;
    }
    const response = await api.get(url, { params });
    const jsonObj = xmlToJson(response.data);
    
    if (id) {
      const key = Object.keys(jsonObj.prestashop).find(k => k !== 'xmlns' && k !== 'xlink');
      return [jsonObj.prestashop[key]]; 
    }
    
    const resourceKey = Object.keys(jsonObj.prestashop).find(k => k !== 'xmlns' && k !== 'xlink');
    if (!resourceKey) return [];
    
    const itemsGroup = jsonObj.prestashop[resourceKey];
    if (!itemsGroup) return [];
    
    const itemKey = Object.keys(itemsGroup)[0];
    if (!itemKey) return [];
    
    const items = itemsGroup[itemKey];
    return Array.isArray(items) ? items : [items];
  }
};

export const createValidationError = (message) => {
  const error = new Error(message);
  error.isValidationError = true;
  return error;
};