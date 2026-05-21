/**
 * XML builders for Cart module
 * Includes: cart, cart_rows
 */

/**
 * Build XML for complete cart with cart rows
 */
export const buildCartXML = (cartData) => {
  const rowsXML = (cartData.items || []).map(item => `      <cart_row>
        <id_product>${item.id_product}</id_product>
        <id_product_attribute>${item.id_product_attribute || 0}</id_product_attribute>
        <id_customization>0</id_customization>
        <quantity>${item.quantity}</quantity>
      </cart_row>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <cart>
    <id_address_delivery>${cartData.id_address_delivery}</id_address_delivery>
    <id_address_invoice>${cartData.id_address_invoice}</id_address_invoice>
    <id_currency>${cartData.id_currency || 1}</id_currency>
    <id_customer>${cartData.id_customer}</id_customer>
    <id_lang>${cartData.id_lang || 1}</id_lang>
    <id_shop_group>${cartData.id_shop_group || 1}</id_shop_group>
    <id_shop>${cartData.id_shop || 1}</id_shop>
    <id_carrier>${cartData.id_carrier || 1}</id_carrier>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <mobile_theme>0</mobile_theme>
    <secure_key><![CDATA[${cartData.secure_key || ''}]]></secure_key>
    <allow_separated_package>0</allow_separated_package>
    <date_add>${cartData.date_add}</date_add>
    <date_upd>${cartData.date_add}</date_upd>
    <associations>
      <cart_rows>
${rowsXML}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`;
};
