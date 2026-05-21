/**
 * XML builders for Order Details and Payments
 * Includes: order_detail, order_payment
 */

import { escapeXml } from './xmlBuilderUtils';

const ID_SHOP_DEFAULT = 1;

/**
 * Build XML for order detail (line item in order)
 */
export const buildOrderDetailXML = (detailData) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_detail>
    <id_order><![CDATA[${detailData.id_order}]]></id_order>
    <product_id><![CDATA[${detailData.id_product}]]></product_id>
    <product_attribute_id><![CDATA[${detailData.id_product_attribute || 0}]]></product_attribute_id>
    <product_quantity_reinjected><![CDATA[0]]></product_quantity_reinjected>
    <group_reduction><![CDATA[0]]></group_reduction>
    <discount_quantity_applied><![CDATA[0]]></discount_quantity_applied>
    <download_hash><![CDATA[]]></download_hash>
    <download_deadline><![CDATA[]]></download_deadline>
    <id_order_invoice><![CDATA[0]]></id_order_invoice>
    <id_warehouse><![CDATA[${detailData.id_warehouse ?? 0}]]></id_warehouse>
    <id_shop><![CDATA[${detailData.id_shop || ID_SHOP_DEFAULT}]]></id_shop>
    <id_customization><![CDATA[0]]></id_customization>
    <product_name><![CDATA[${detailData.product_name}]]></product_name>
    <product_quantity><![CDATA[${detailData.product_quantity}]]></product_quantity>
    <product_quantity_in_stock><![CDATA[0]]></product_quantity_in_stock>
    <product_quantity_return><![CDATA[0]]></product_quantity_return>
    <product_quantity_refunded><![CDATA[0]]></product_quantity_refunded>
    <product_price><![CDATA[${detailData.product_price}]]></product_price>
    <reduction_percent><![CDATA[0]]></reduction_percent>
    <reduction_amount><![CDATA[0]]></reduction_amount>
    <reduction_amount_tax_incl><![CDATA[0]]></reduction_amount_tax_incl>
    <reduction_amount_tax_excl><![CDATA[0]]></reduction_amount_tax_excl>
    <product_quantity_discount><![CDATA[0]]></product_quantity_discount>
    <product_ean13><![CDATA[]]></product_ean13>
    <product_isbn><![CDATA[]]></product_isbn>
    <product_upc><![CDATA[]]></product_upc>
    <product_mpn><![CDATA[]]></product_mpn>
    <product_reference><![CDATA[${detailData.product_name}]]></product_reference>
    <product_supplier_reference><![CDATA[]]></product_supplier_reference>
    <product_weight><![CDATA[0]]></product_weight>
    <tax_computation_method><![CDATA[]]></tax_computation_method>
    <id_tax_rules_group><![CDATA[]]></id_tax_rules_group>
    <ecotax><![CDATA[0]]></ecotax>
    <ecotax_tax_rate><![CDATA[0]]></ecotax_tax_rate>
    <download_nb><![CDATA[0]]></download_nb>
    <unit_price_tax_incl><![CDATA[${detailData.product_price_tax_incl}]]></unit_price_tax_incl>
    <unit_price_tax_excl><![CDATA[${detailData.product_price_tax_excl}]]></unit_price_tax_excl>
    <total_price_tax_incl><![CDATA[${Number.parseFloat(detailData.product_price_tax_incl) * detailData.product_quantity}]]></total_price_tax_incl>
    <total_price_tax_excl><![CDATA[${Number.parseFloat(detailData.product_price_tax_excl) * detailData.product_quantity}]]></total_price_tax_excl>
    <total_shipping_price_tax_excl><![CDATA[0]]></total_shipping_price_tax_excl>
    <total_shipping_price_tax_incl><![CDATA[0]]></total_shipping_price_tax_incl>
    <purchase_supplier_price><![CDATA[0]]></purchase_supplier_price>
    <original_product_price><![CDATA[0]]></original_product_price>
    <original_wholesale_price><![CDATA[0]]></original_wholesale_price>
    <total_refunded_tax_excl><![CDATA[0]]></total_refunded_tax_excl>
    <total_refunded_tax_incl><![CDATA[0]]></total_refunded_tax_incl>
    <associations>
      <taxes nodeType="tax" api="taxes">
        <tax>
          <id><![CDATA[]]></id>
        </tax>
      </taxes>
    </associations>
  </order_detail>
</prestashop>`;
};

/**
 * Build XML for order payment
 */
export const buildOrderPaymentXML = (paymentData) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_payment>
    <order_reference><![CDATA[${paymentData.order_reference}]]></order_reference>
    <id_currency>${paymentData.id_currency}</id_currency>
    <amount>${paymentData.amount}</amount>
    <payment_method><![CDATA[${paymentData.payment_method}]]></payment_method>
    <conversion_rate>${paymentData.conversion_rate}</conversion_rate>
    <transaction_id><![CDATA[]]></transaction_id>
    <card_number><![CDATA[]]></card_number>
    <card_brand><![CDATA[]]></card_brand>
    <card_expiration><![CDATA[]]></card_expiration>
    <card_holder><![CDATA[]]></card_holder>
    <date_add>${paymentData.date_add}</date_add>
    <id_employee><![CDATA[0]]></id_employee>
  </order_payment>
</prestashop>`;
};
