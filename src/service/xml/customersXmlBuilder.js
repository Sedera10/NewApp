/**
 * XML builders for Customers and Addresses
 * Includes: customer, address
 */

/**
 * Escape XML dangerous characters
 */
export const escapeXmlAttribute = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Build XML for customer
 * PrestaShop requires password in plaintext (will be hashed by API)
 */
export const buildCustomerXML = (customerData, idLang = 1) => {
  // Limit lengths according to PrestaShop constraints
  const firstname = (customerData.firstname || '').substring(0, 32).trim();
  const lastname = (customerData.lastname || customerData.firstname || '').substring(0, 32).trim();
  const email = (customerData.email || '').toLowerCase().trim();
  const passwd = (customerData.passwd || '').substring(0, 60).trim();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <customer>
    <firstname><![CDATA[${firstname}]]></firstname>
    <lastname><![CDATA[${lastname}]]></lastname>
    <email><![CDATA[${email}]]></email>
    <passwd><![CDATA[${passwd}]]></passwd>
    <id_default_group>1</id_default_group>
    <id_lang>${idLang}</id_lang>
    <newsletter>0</newsletter>
    <optin>0</optin>
    <active>1</active>
  </customer>
</prestashop>`;
};

/**
 * Build XML for address
 */
export const buildAddressXML = (addressData, idCountry = 8) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <address>
    <id_customer>${addressData.id_customer}</id_customer>
    <id_country>${addressData.id_country || idCountry}</id_country>
    <alias><![CDATA[${addressData.alias || 'Adresse'}]]></alias>
    <firstname><![CDATA[${addressData.firstname}]]></firstname>
    <lastname><![CDATA[${addressData.lastname || addressData.firstname}]]></lastname>
    <address1><![CDATA[${addressData.address1}]]></address1>
    <city><![CDATA[${addressData.city || 'Antananarivo'}]]></city>
    <postcode><![CDATA[${addressData.postcode || '101'}]]></postcode>
    <phone><![CDATA[]]></phone>
    <phone_mobile><![CDATA[]]></phone_mobile>
    <other><![CDATA[]]></other>
    <active>1</active>
  </address>
</prestashop>`;
};
