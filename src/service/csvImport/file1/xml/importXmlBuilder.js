/**
 * XML builders for CSV Import module
 * Includes: categories, taxes, tax_rules_groups, tax_rules, products
 */

import { escapeXml, normalizeNumber, convertDateFormat, createLinkRewrite } from './xmlBuilderUtils';

const ID_LANG = 1; // FR
const ID_COUNTRY = 8; // France
const ID_SHOP_DEFAULT = 1;
const ID_PARENT_CATEGORY = 2; // Root

const convertTTCtoHT = (priceTTC, taxRate) => {
  const rate = normalizeNumber(taxRate);
  const ttc = normalizeNumber(priceTTC);
  const ht = ttc / (1 + (rate / 100));
  return Math.round(ht * 1000000) / 1000000; // roundDecimal(ht, 6)
};

/**
 * Build XML for category
 */
export const buildCategoryXML = (name, idParent = ID_PARENT_CATEGORY) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <category>
    <active>1</active>
    <id_parent>${idParent}</id_parent>
    <name>
      <language id="${ID_LANG}"><![CDATA[${name}]]></language>
    </name>
    <link_rewrite>
      <language id="${ID_LANG}"><![CDATA[${createLinkRewrite(name)}]]></language>
    </link_rewrite>
  </category>
</prestashop>`;
};

/**
 * Build XML for tax
 */
export const buildTaxXML = (name, rate) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <tax>
    <rate>${normalizeNumber(rate)}</rate>
    <active>1</active>
    <name>
      <language id="${ID_LANG}"><![CDATA[${name}]]></language>
    </name>
  </tax>
</prestashop>`;
};

/**
 * Build XML for tax rules group
 */
export const buildTaxRulesGroupXML = (name) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <tax_rules_group>
    <name><![CDATA[${name}]]></name>
    <active>1</active>
  </tax_rules_group>
</prestashop>`;
};

/**
 * Build XML for tax rule
 */
export const buildTaxRuleXML = (idTaxRulesGroup, idTax) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <tax_rule>
    <id_tax_rules_group>${idTaxRulesGroup}</id_tax_rules_group>
    <id_country>${ID_COUNTRY}</id_country>
    <id_tax>${idTax}</id_tax>
    <behavior>0</behavior>
  </tax_rule>
</prestashop>`;
};

/**
 * Build XML for product
 */
export const buildProductXML = (productData, idCategoryDefault, idTaxRulesGroup) => {
  const priceHT = convertTTCtoHT(productData.prix_ttc, productData.Taxe);
  const wholesalePrice = normalizeNumber(productData.prix_achat);

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <product>
    <id_shop_default>${ID_SHOP_DEFAULT}</id_shop_default>
    <id_category_default>${idCategoryDefault}</id_category_default>
    <id_tax_rules_group>${idTaxRulesGroup}</id_tax_rules_group>
    <reference><![CDATA[${productData.reference}]]></reference>
    <name>
      <language id="${ID_LANG}"><![CDATA[${productData.nom}]]></language>
    </name>
    <price>${priceHT}</price>
    <wholesale_price>${wholesalePrice}</wholesale_price>
    <available_date><![CDATA[${convertDateFormat(productData.date_availability_produit)}]]></available_date>
    <active>1</active>
    <state>1</state>
    <associations>
      <categories>
        <category>
          <id>${idCategoryDefault}</id>
        </category>
      </categories>
    </associations>
  </product>
</prestashop>`;
};
