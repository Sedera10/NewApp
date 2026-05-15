// services/api.js
import axios from 'axios';
import { xmlToJson } from './Util';

const API_KEY = '	7V798TDQKI1Q1S988IE2HKVR6EXA2Z4B';
// const API_KEY = 'VMSAS9H1RSPCGH7E3IYRIZP8D6LMBBTN'; --- 1er instance ---
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