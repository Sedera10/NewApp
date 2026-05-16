/**
 * XML builders for generic resources
 * Used for dynamic resource creation based on schema
 */

import { escapeXml } from './xmlBuilderUtils';
import { getResourceSchema, getMultilingualFields } from '../schemaService';

/**
 * Build generic XML for any PrestaShop resource
 * Automatically handles multilingual fields based on schema
 */
export const buildResourceXML = async (resource, resourceSingular, data) => {
  try {
    const schema = await getResourceSchema(resource);
    const multilingualFields = getMultilingualFields(schema, resourceSingular);

    console.log('Schema:', schema);
    console.log('Champs multilingues détectés:', multilingualFields);
    console.log('Données:', data);

    const fields = Object.entries(data)
      .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => {
        if (multilingualFields.includes(key)) {
          return `<${key}><language id="1">${escapeXml(value)}</language></${key}>`;
        }
        return `<${key}>${escapeXml(value)}</${key}>`;
      })
      .join('\n        ');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
    <${resourceSingular}>
        ${fields}
    </${resourceSingular}>
</prestashop>`;

    console.log('XML généré:', xml);

    return xml;

  } catch (error) {
    throw new Error(`Erreur lors de la construction du XML: ${error.message}`, { cause: error });
  }
};
