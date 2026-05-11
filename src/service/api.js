// services/api.js
import axios from 'axios';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

const API_KEY = 'VMSAS9H1RSPCGH7E3IYRIZP8D6LMBBTN';
const BASE_URL = '/prestashop/api';

const api = axios.create({
  baseURL: BASE_URL,
  params: { ws_key: API_KEY },
  headers: { 'Content-Type': 'application/xml' }
});

export default api;

// Outils pour convertir le XML
// const parser = new XMLParser();
// const builder = new XMLBuilder();

// export const getProducts = async () => {
//   const response = await api.get('/products?display=full');
//   const jsonObj = parser.parse(response.data);
//   return jsonObj.prestashop.products.product; // Retourne un tableau JS
// };