/**
 * XML builders for Order module
 * Includes: order, order_row, order_state, order_history
 */

import { escapeXml, ensureMd5Like } from './xmlBuilderUtils';

const DEFAULT_PAYMENT_MODULE = 'ps_cashondelivery';
const DEFAULT_PAYMENT_LABEL = 'Paiement a la livraison';

/**
 * Build XML for a single order row (line item)
 */
export const buildOrderRowXML = (row) => {
  return `      <order_row>
        <id><![CDATA[${row.id ?? ''}]]></id>
        <product_id><![CDATA[${row.productId ?? ''}]]></product_id>
        <product_attribute_id><![CDATA[${row.productAttributeId ?? ''}]]></product_attribute_id>
        <product_quantity><![CDATA[${row.productQuantity ?? ''}]]></product_quantity>
        <product_name><![CDATA[${row.productName || ''}]]></product_name>
        <product_reference><![CDATA[${row.productReference || ''}]]></product_reference>
        <product_ean13><![CDATA[]]></product_ean13>
        <product_isbn><![CDATA[]]></product_isbn>
        <product_upc><![CDATA[]]></product_upc>
        <product_price><![CDATA[${row.productPrice ?? ''}]]></product_price>
        <id_customization><![CDATA[${row.customizationId ?? ''}]]></id_customization>
        <unit_price_tax_incl><![CDATA[${row.unitPriceTaxIncl ?? ''}]]></unit_price_tax_incl>
        <unit_price_tax_excl><![CDATA[${row.unitPriceTaxExcl ?? ''}]]></unit_price_tax_excl>
      </order_row>`;
};

/**
 * Build XML for complete order with order rows
 */
export const buildOrderXML = (orderData) => {
  const orderId = orderData.id_order || orderData.id || '';
  const idCustomer = orderData.id_customer || 1;
  const idAddressDelivery = orderData.id_address || orderData.id_address_delivery || 1;
  const idAddressInvoice = orderData.id_address || orderData.id_address_invoice || idAddressDelivery;
  const idCart = orderData.id_cart || 1;
  const idCarrier = orderData.id_carrier || 1;
  const idShopGroup = orderData.id_shop_group || 1;
  const dateAdd = orderData.date_add || new Date().toISOString().split('T')[0];
  const dateUpd = orderData.date_upd || dateAdd;
  const totalPaid = parseFloat(orderData.total_paid) || 0;
  const totalProducts = parseFloat(orderData.total_products) || 0;
  const totalProductsWT = parseFloat(orderData.total_products_wt) || totalPaid;
  const secureKey = ensureMd5Like(orderData.secure_key);

  const currentStateNode = orderData.current_state !== undefined && orderData.current_state !== null && String(orderData.current_state).trim() !== ''
    ? `    <current_state><![CDATA[${orderData.current_state}]]></current_state>\n`
    : '';
  const idNode = orderId && String(orderId).trim() !== ''
    ? `    <id><![CDATA[${orderId}]]></id>\n`
    : '';

  // IMPORTANT: Les order_rows ne doivent PAS être incluses lors de la création
  // PrestaShop créé automatiquement les order_rows à partir du panier (id_cart)
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
${idNode}    <id_address_delivery><![CDATA[${idAddressDelivery}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddressInvoice}]]></id_address_invoice>
    <id_cart><![CDATA[${idCart}]]></id_cart>
    <id_currency><![CDATA[1]]></id_currency>
    <id_lang><![CDATA[${orderData.id_lang || 1}]]></id_lang>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_carrier><![CDATA[${idCarrier}]]></id_carrier>
  ${currentStateNode}    <module><![CDATA[${orderData.module || DEFAULT_PAYMENT_MODULE}]]></module>
    <invoice_number><![CDATA[${orderData.invoice_number || ''}]]></invoice_number>
    <invoice_date><![CDATA[${orderData.invoice_date || ''}]]></invoice_date>
    <delivery_number><![CDATA[${orderData.delivery_number || ''}]]></delivery_number>
    <delivery_date><![CDATA[${orderData.delivery_date || ''}]]></delivery_date>
    <valid><![CDATA[${orderData.valid ?? 1}]]></valid>
    <date_add><![CDATA[${dateAdd}]]></date_add>
    <date_upd><![CDATA[${dateUpd}]]></date_upd>
    <shipping_number><![CDATA[${orderData.shipping_number || ''}]]></shipping_number>
    <note><![CDATA[${orderData.note || ''}]]></note>
    <id_shop_group><![CDATA[${idShopGroup}]]></id_shop_group>
    <id_shop><![CDATA[${orderData.id_shop || 1}]]></id_shop>
    <secure_key><![CDATA[${secureKey}]]></secure_key>
    <payment><![CDATA[${orderData.payment || DEFAULT_PAYMENT_LABEL}]]></payment>
    <recyclable><![CDATA[${orderData.recyclable ?? 0}]]></recyclable>
    <gift><![CDATA[${orderData.gift ?? 0}]]></gift>
    <gift_message><![CDATA[${orderData.gift_message || ''}]]></gift_message>
    <mobile_theme><![CDATA[${orderData.mobile_theme ?? 0}]]></mobile_theme>
    <total_discounts><![CDATA[${orderData.total_discounts ?? 0}]]></total_discounts>
    <total_discounts_tax_incl><![CDATA[${orderData.total_discounts_tax_incl ?? 0}]]></total_discounts_tax_incl>
    <total_discounts_tax_excl><![CDATA[${orderData.total_discounts_tax_excl ?? 0}]]></total_discounts_tax_excl>
    <total_paid><![CDATA[${totalPaid.toFixed(2)}]]></total_paid>
    <total_paid_tax_incl><![CDATA[${totalPaid.toFixed(2)}]]></total_paid_tax_incl>
    <total_paid_tax_excl><![CDATA[${totalProducts.toFixed(2)}]]></total_paid_tax_excl>
    <total_paid_real><![CDATA[${totalPaid.toFixed(2)}]]></total_paid_real>
    <total_products><![CDATA[${totalProducts.toFixed(2)}]]></total_products>
    <total_products_wt><![CDATA[${totalProductsWT.toFixed(2)}]]></total_products_wt>
    <total_shipping><![CDATA[${orderData.total_shipping ?? 0}]]></total_shipping>
    <total_shipping_tax_incl><![CDATA[${orderData.total_shipping_tax_incl ?? 0}]]></total_shipping_tax_incl>
    <total_shipping_tax_excl><![CDATA[${orderData.total_shipping_tax_excl ?? 0}]]></total_shipping_tax_excl>
    <carrier_tax_rate><![CDATA[${orderData.carrier_tax_rate ?? 0}]]></carrier_tax_rate>
    <total_wrapping><![CDATA[${orderData.total_wrapping ?? 0}]]></total_wrapping>
    <total_wrapping_tax_incl><![CDATA[${orderData.total_wrapping_tax_incl ?? 0}]]></total_wrapping_tax_incl>
    <total_wrapping_tax_excl><![CDATA[${orderData.total_wrapping_tax_excl ?? 0}]]></total_wrapping_tax_excl>
    <round_mode><![CDATA[${orderData.round_mode ?? 2}]]></round_mode>
    <round_type><![CDATA[${orderData.round_type ?? 1}]]></round_type>
    <conversion_rate><![CDATA[${orderData.conversion_rate ?? 1}]]></conversion_rate>
    <reference><![CDATA[${orderData.reference || ''}]]></reference>
  </order>
</prestashop>`;
};

/**
 * Build XML for order state (status)
 */
export const buildOrderStateXML = (stateName) => `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <order_state>
    <unremovable>0</unremovable>
    <delivery>0</delivery>
    <hidden>0</hidden>
    <send_email>0</send_email>
    <module_name><![CDATA[]]></module_name>
    <invoice>0</invoice>
    <color><![CDATA[]]></color>
    <logable>0</logable>
    <shipped>0</shipped>
    <paid>0</paid>
    <pdf_delivery>0</pdf_delivery>
    <pdf_invoice>0</pdf_invoice>
    <deleted>0</deleted>
    <name>
      <language id="1"><![CDATA[${stateName}]]></language>
    </name>
    <template>
      <language id="1"><![CDATA[]]></language>
    </template>
  </order_state>
</prestashop>`;

/**
 * Build XML for order history (status change)
 */
export const buildOrderHistoryXML = ({ id_order, id_order_state, date_add }) => `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>${id_order}</id_order>
    <id_order_state>${id_order_state}</id_order_state>
    <id_employee>0</id_employee>
    <date_add>${date_add}</date_add>
  </order_history>
</prestashop>`;
