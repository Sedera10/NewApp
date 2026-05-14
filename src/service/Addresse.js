import api from "./api";
import { xmlToJson, buildPrestashopXml } from "./Util";

export const getAddresses = async () => {
  const response = await api.get('/addresses?display=full');
  const jsonObj = xmlToJson(response.data);
  return jsonObj.prestashop.addresses.address;
};

export const getAddresseById = async (id) => {
  // Avoid 404 errors for invalid IDs
  if (!id || id === '0' || id === 0) {
    console.warn('Invalid address ID:', id);
    return null;
  }
  try {
    const response = await api.get(`/addresses/${id}?display=full`);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop.address;
  } catch (error) {
    console.error("Error fetching address:", error);
    return null;
  }
};

export const getAddressesByCustomerId = async (customerId) => {
  try {
    const response = await api.get('/addresses?display=full');
    const jsonObj = xmlToJson(response.data);
    let addresses = jsonObj?.prestashop?.addresses?.address || [];
    if (!Array.isArray(addresses)) addresses = [addresses];

    const getTextVal = (val) => {
      if (val && typeof val === 'object' && val['#text'] !== undefined) {
        return val['#text'];
      }
      return val;
    };

    const customerIdStr = String(customerId).trim();
    const filtered = addresses.filter(addr => {
      const addrCustomerId = String(getTextVal(addr.id_customer)).trim();
      console.log(`Comparing: "${addrCustomerId}" === "${customerIdStr}" (addr.id = ${getTextVal(addr.id)})`);
      return addrCustomerId === customerIdStr;
    });

    console.log('Customer ID:', customerId, 'Type:', typeof customerId);
    console.log('All addresses:', addresses.map(a => ({
      id: getTextVal(a.id),
      id_customer: getTextVal(a.id_customer),
      firstname: getTextVal(a.firstname),
      lastname: getTextVal(a.lastname)
    })));
    console.log('Filtered addresses:', filtered.length, filtered);

    return filtered;
  } catch (error) {
    console.error("Error fetching addresses for customer:", error);
    return [];
  }
};

export const createAddress = async (addressData) => {
  try {
    console.log('Creating address with data:', addressData);
    const xmlPayload = buildPrestashopXml('address', addressData);
    console.log('XML Payload:', xmlPayload);

    const response = await api.post('/addresses', xmlPayload, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    const jsonObj = xmlToJson(response.data);
    console.log('Address created successfully:', jsonObj);
    return jsonObj?.prestashop?.address;
  } catch (error) {
    console.error("Error creating address:", error);
    console.error("Error response:", error.response?.data);
    throw error;
  }
};

export const updateAddress = async (addressId, addressData) => {
  try {
    const payload = { id: addressId, ...addressData };
    const xmlPayload = buildPrestashopXml('address', payload);
    const response = await api.put(`/addresses/${addressId}`, xmlPayload, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    const jsonObj = xmlToJson(response.data);
    return jsonObj?.prestashop?.address;
  } catch (error) {
    console.error("Error updating address:", error);
    throw error;
  }
};
