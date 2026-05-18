// services/api.js
import axios from 'axios';
import { xmlToJson } from './Util';

const API_KEY = import.meta.env.VITE_API;
const BASE_URL = '/prestashop/api';

const api = axios.create({
  baseURL: BASE_URL,
  params: { ws_key: API_KEY },
  headers: { 'Content-Type': 'application/xml' }
});

export default api;

export const getProducts = async () => {
  const response = await api.get('/products?display=full');
  const jsonObj = xmlToJson(response.data);
  return jsonObj.prestashop.products.product;
};