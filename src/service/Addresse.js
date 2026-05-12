import api from "./api";
import { xmlToJson, jsonToXml } from "./Util";

export const getAddresses = async () => {
  const response = await api.get('/addresses?display=full');
  const jsonObj = xmlToJson(response.data);
  return jsonObj.prestashop.addresses.address;
};

export const getAddresseById = async (id) => {
  const response = await api.get(`/addresses/${id}?display=full`);
  const jsonObj = xmlToJson(response.data);
  return jsonObj.prestashop.address;
};