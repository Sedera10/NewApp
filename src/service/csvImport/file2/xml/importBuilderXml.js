const CONSTANTS = {
  ID_LANG: 1, // FR
  ID_COUNTRY: 8, // France
  ID_SHOP_DEFAULT: 1,
  ID_SHOP_GROUP: 1,
};


export const buildAttributeGroupXML = (name) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <product_option>
    <name>
      <language id="${CONSTANTS.ID_LANG}"><![CDATA[${name}]]></language>
    </name>
    <public_name>
      <language id="${CONSTANTS.ID_LANG}"><![CDATA[${name}]]></language>
    </public_name>
    <group_type>select</group_type>
    <position>0</position>
  </product_option>
</prestashop>`;
};

/**
 * Construit le XML pour une valeur d'attribut
 */
export const buildAttributeXML = (name, idAttributeGroup) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <product_option_value>
    <id_attribute_group>${idAttributeGroup}</id_attribute_group>
    <name>
      <language id="${CONSTANTS.ID_LANG}"><![CDATA[${name}]]></language>
    </name>
    <position>0</position>
  </product_option_value>
</prestashop>`;
};

/**
 * Construit le XML pour une combinaison (variante)
 */
export const buildCombinationXML = (productData, attributeIds, priceImpact = 0) => {
  // Structure correcte pour Prestashop: associations avec product_option_values
  const productOptionValuesXML = attributeIds
    .map(id => `      <product_option_value>
        <id>${id}</id>
      </product_option_value>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <combination>
    <id_product>${productData.id_product}</id_product>
    <reference><![CDATA[${productData.reference}]]></reference>
    <price>${priceImpact}</price>
    <minimal_quantity>1</minimal_quantity>
    <associations>
      <product_option_values>
${productOptionValuesXML}
      </product_option_values>
    </associations>
  </combination>
</prestashop>`;
};