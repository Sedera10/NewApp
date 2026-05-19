import api from "./api";
import { xmlToJson, jsonToXml } from "./Util";

export const customerService = {
  getCustomers: async () => {
    const response = await api.get('/customers?display=full');
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop.customers.customer; 
  },

  getCustomerById: async (id) => {
    if (!id || String(id) === '0') return null;
    const response = await api.get(`/customers?display=full&filter[id]=[${id}]`);
    const jsonObj = xmlToJson(response.data);
    const customers = jsonObj?.prestashop?.customers?.customer || [];
    if (Array.isArray(customers)) return customers[0] || null;
    return customers || null;
  },

  getCustomerByEmail: async (email) => {
    const response = await api.get(`/customers?filter[email]=${email}&display=full`);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop.customers.customer;
  }
};