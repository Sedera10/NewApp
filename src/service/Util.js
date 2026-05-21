import { XMLBuilder, XMLParser } from 'fast-xml-parser';

// methode pour verifier url 
export const urlContains = (pathname, value) => {
  return pathname.includes(value);
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export const xmlToJson = (xml) => {
  return parser.parse(xml);
};

export function isAnonymeUser() {
  const user = JSON.parse(
    localStorage.getItem('client_session')
  );
  return String(user?.id) === '0' && user?.type === 2;
}

export const jsonToXml = (jsonObj) => {
  return builder.build(jsonObj);
};

// Creates a properly formatted XML string for Prestashop POST/PUT requests
export const buildPrestashopXml = (resourceName, dataObj) => {
  const jsonObj = {
    prestashop: {
      [resourceName]: dataObj
    }
  };
  // Prepend XML declaration
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(jsonObj);
};

/**
 * Extrait les fichiers d'une archive ZIP
 * @param {File} zipFile - Le fichier ZIP à extraire
 * @returns {Promise<File[]>} - Tableau des fichiers extraits
 */
