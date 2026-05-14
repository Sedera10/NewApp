import api from "./api";
import { xmlToJson, jsonToXml } from "./Util";

export const customerService = {
  getCustomers: async () => {
    const response = await api.get('/customers?display=full');
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop.customers.customer; 
  },

  getCustomerById: async (id) => {
    const response = await api.get(`/customers/${id}?display=full`);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop.customer; 
  },

  getCustomerByEmail: async (email) => {
    const response = await api.get(`/customers?filter[email]=${email}&display=full`);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop.customers.customer;
  }
};