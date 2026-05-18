# Schémas XML pour les requêtes API PrestaShop (POST / PUT)

Ce document liste la structure de base des fichiers XML requis pour créer (`POST`) ou modifier (`PUT`) des données via le Webservice natif de PrestaShop. 
*Note importante pour les mises à jour (PUT) : Vous devez toujours inclure l'attribut `<id>` de la ressource visée !*

---

## 👤 Clients (Customers)
**Endpoint : `/api/customers`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <customer>
    <!-- Mettre l'ID uniquement s'il s'agit d'un PUT (mise à jour) -->
    <!-- <id>5</id> -->
    <id_default_group>3</id_default_group> <!-- 3 = Client standard -->
    <id_lang>1</id_lang>
    <id_gender>1</id_gender> <!-- 1 = Mr, 2 = Mme -->
    <passwd>VotreMotDePasseEnClair</passwd> <!-- Sera haché automatiquement par PrestaShop -->
    <lastname>Doe</lastname>
    <firstname>John</firstname>
    <email>john.doe@example.com</email>
    <active>1</active> <!-- 1 = activé, 0 = désactivé -->
    <newsletter>0</newsletter>
    <optin>0</optin>
    
    <!-- (Optionnel) Ajout aux groupes de clients -->
    <associations>
      <groups>
        <group>
          <id>3</id>
        </group>
      </groups>
    </associations>
  </customer>
</prestashop>
```

---

## 📍 Adresses (Addresses)
**Endpoint : `/api/addresses`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <!-- <id>12</id> -->
    <id_customer>5</id_customer>
    <id_country>8</id_country> <!-- 8 = France (dépend de votre db) -->
    <id_state>0</id_state> <!-- ID de la région/état, obligatoire si le pays l'exige (ex: USA) -->
    <alias>Mon Domicile</alias> <!-- Titre de l'adresse -->
    <lastname>Doe</lastname>
    <firstname>John</firstname>
    <company>Mon Entreprise (Optionnel)</company>
    <address1>12 rue de la Paix</address1>
    <address2>Appartement 4B (Optionnel)</address2>
    <postcode>75000</postcode>
    <city>Paris</city>
    <phone>0102030405</phone>
    <phone_mobile>0601020304</phone_mobile>
    <vat_number>FR12345678 (Optionnel)</vat_number>
    <dni>Numéro d'identité pour Espagne/Italie (Optionnel)</dni>
  </address>
</prestashop>
```

---

## 🛒 Paniers (Carts)
**Endpoint : `/api/carts`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <!-- <id>42</id> -->
    <id_customer>5</id_customer>
    <id_address_delivery>12</id_address_delivery>
    <id_address_invoice>12</id_address_invoice>
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_carrier>2</id_carrier>
    <!-- <id_guest>0</id_guest>  Seulement si le client n'a pas de compte (id_customer = 0) -->

    <associations>
      <cart_rows>
        <!-- Ligne d'un article dans le panier -->
        <cart_row>
          <id_product>10</id_product>
          <id_product_attribute>0</id_product_attribute> <!-- 0 s'il n'y a pas de déclinaison -->
          <id_address_delivery>12</id_address_delivery> <!-- Doit correspondre à l'id_address_delivery du panier -->
          <quantity>2</quantity>
        </cart_row>
      </cart_rows>
    </associations>
  </cart>
</prestashop>
```

---

## 💳 Commandes (Orders)
**Endpoint : `/api/orders`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_cart>42</id_cart> <!-- Le MAÎTRE de la commande. Les autres données seront écrasées par celles du panier -->
        
    <id_customer>5</id_customer>
    <id_address_delivery>12</id_address_delivery>
    <id_address_invoice>12</id_address_invoice>
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_carrier>2</id_carrier>
        
    <!-- Etat initial. Note: Forcé à "Paiement à distance accepté" par l'API quoiqu'il arrive -->
    <current_state>1</current_state> 
        
    <module>ps_checkpayment</module>
    <payment>Paiement par chèque</payment>
    <secure_key><![CDATA[CLIENT_SECURE_KEY]]></secure_key>
        
    <conversion_rate>1.000000</conversion_rate>
    <total_paid>150.000000</total_paid>
    <total_paid_real>150.000000</total_paid_real>
    <total_products>125.000000</total_products>
    <total_products_wt>150.000000</total_products_wt>
    <total_shipping>0.000000</total_shipping>
    <total_shipping_tax_incl>0.000000</total_shipping_tax_incl>
    <total_shipping_tax_excl>0.000000</total_shipping_tax_excl>
    <total_discounts>0.000000</total_discounts>
    <total_discounts_tax_incl>0.000000</total_discounts_tax_incl>
    <total_discounts_tax_excl>0.000000</total_discounts_tax_excl>
    <total_wrapping>0.000000</total_wrapping>
    <total_wrapping_tax_incl>0.000000</total_wrapping_tax_incl>
    <total_wrapping_tax_excl>0.000000</total_wrapping_tax_excl>
  </order>
</prestashop>
```

---

## 🏷️ Mises à jour de Statut de Commande (Order Histories)
**Endpoint : `/api/order_histories`** (Utilisé pour changer l'état d'une commande)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order>3</id_order> <!-- L'identifiant de la commande dont on veut changer le statut -->
    <id_order_state>4</id_order_state> <!-- Le nouvel état (ex: 4 = Expédié) -->
  </order_history>
</prestashop>
```

---

## 📦 Produits (Products)
**Endpoint : `/api/products`**

*Note : Les balises avec `<language id="1">` sont obligatoires car ce sont des champs traduisibles.*

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id_category_default>2</id_category_default> <!-- Catégorie Accueil par défaut = 2 -->
    <id_tax_rules_group>1</id_tax_rules_group> <!-- TVA applicable (ex: 1 = Taux Standard 20%) -->
    <type>1</type> <!-- 1 = Produit Standard, 2 = Produit Dématérialisé (Pack) -->
    
    <price>20.000000</price> <!-- Prix HORS TAXE ! -->
    <active>1</active>
    <available_for_order>1</available_for_order>
    <show_price>1</show_price>
    <condition>new</condition> <!-- new, used, refurbished -->
    
    <reference>REF-12345</reference>
    <ean13></ean13>
    <weight>0.500000</weight> <!-- En KG -->
    
    <!-- Champs multilingues obligatoires -->
    <name>
      <language id="1"><![CDATA[Mon Super T-shirt]]></language>
    </name>
    <link_rewrite> <!-- C'est l'URL SEO amicale (slug) -->
      <language id="1"><![CDATA[mon-super-t-shirt]]></language>
    </link_rewrite>
    
    <!-- (Optionnel) Descriptions -->
    <description_short>
      <language id="1"><![CDATA[<p>T-shirt en coton bio.</p>]]></language>
    </description_short>
    <description>
      <language id="1"><![CDATA[<p>Description longue du t-shirt rouge en coton bio avec toutes ses spécificités.</p>]]></language>
    </description>

    <!-- Associer le produit à plusieurs catégories -->
    <associations>
      <categories>
        <category><id>2</id></category>
        <category><id>5</id></category>
      </categories>
    </associations>
  </product>
</prestashop>
```

---

## 📁 Catégories (Categories)
**Endpoint : `/api/categories`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <category>
    <id_parent>2</id_parent> <!-- A accrocher à la catégorie "Accueil" (ID 2). Ne jamais remplacer la catégorie Root (ID 1) -->
    <active>1</active>
    
    <name>
      <language id="1"><![CDATA[Vêtements Homme]]></language>
    </name>
    <link_rewrite>
      <language id="1"><![CDATA[vetements-homme]]></language>
    </link_rewrite>
    <description>
      <language id="1"><![CDATA[Découvrez notre gamme pour homme.]]></language>
    </description>
  </category>
</prestashop>
```

---

## 🏭 Fournisseurs (Suppliers)
**Endpoint : `/api/suppliers`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <supplier>
    <active>1</active>
    <name>Mon Super Fournisseur</name>
    <description>
      <language id="1"><![CDATA[<p>Description du fournisseur</p>]]></language>
    </description>
  </supplier>
</prestashop>
```

---

## 🖼️ Images (Images)
**Endpoint : `/api/images/products/{id_product}`**
*ATTENTION : Les images ne s'envoient pas avec un payload XML de type application/xml.*
*L'API PrestaShop exige une requête HTTP POST de type `multipart/form-data`.*
- **Paramètre Clé :** `image` (Type: File) => Le binaire de votre image (.jpg, .png).
- **Pas de XML Body nécessaire** pour uploader l'image.

---

## 🚦 Statuts de commande (Order_states)
**Endpoint : `/api/order_states`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_state>
    <unremovable>0</unremovable>
    <delivery>0</delivery> <!-- 1 si ce statut est vu comme un statut de livraison -->
    <hidden>0</hidden> <!-- 1 pour le cacher du client -->
    <send_email>1</send_email>
    <module_name></module_name>
    <color><![CDATA[#4169E1]]></color> <!-- Code hex de couleur -->
    <logable>1</logable> <!-- 1 pour dire que ce statut est une étape valide (ex: commande payée) -->
    <invoice>0</invoice> <!-- 1 pour forcer la génération de facture à ce stade -->
    <shipped>0</shipped> <!-- 1 pour forcer la génération du bon de livraison -->
    <paid>0</paid> <!-- 1 pour marquer financièrement comme payé -->
    <name>
      <language id="1"><![CDATA[Paiement en cours de vérification]]></language>
    </name>
    <template>
      <language id="1"><![CDATA[payment]]></language> <!-- Nom du fichier email (sans l'extension) -->
    </template>
  </order_state>
</prestashop>
```

---

## 🧾 Factures de commande (Order_invoices)
**Endpoint : `/api/order_invoices`**
*Note: Il est extrêmement rare d'écrire une facture manuellement : normallement, l'ajout d'un `<order_history>` avec un statut `<invoice>1</invoice>` génère cette entité pour vous.*

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_invoice>
    <id_order>45</id_order>
    <number>102</number> <!-- Facture N° 102 -->
    <total_discount_tax_excl>0.000000</total_discount_tax_excl>
    <total_discount_tax_incl>0.000000</total_discount_tax_incl>
    <total_paid_tax_excl>100.000000</total_paid_tax_excl>
    <total_paid_tax_incl>120.000000</total_paid_tax_incl>
    <total_products_tax_excl>100.000000</total_products_tax_excl>
    <total_products_tax_incl>120.000000</total_products_tax_incl>
    <total_shipping_tax_excl>0.000000</total_shipping_tax_excl>
    <total_shipping_tax_incl>0.000000</total_shipping_tax_incl>
    <total_wrapping_tax_excl>0.000000</total_wrapping_tax_excl>
    <total_wrapping_tax_incl>0.000000</total_wrapping_tax_incl>
    <note><![CDATA[Message interne pour cette facture]]></note>
  </order_invoice>
</prestashop>
```

---

## 🚚 Transporteurs (Carriers)
**Endpoint : `/api/carriers`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <carrier>
    <id_reference>0</id_reference>
    <id_tax_rules_group>1</id_tax_rules_group>
    <name>Livraison Express 24h</name>
    <active>1</active>
    <is_free>0</is_free>
    <url><![CDATA[https://www.mon-transporteur.com/tracking?id=@]]></url> <!-- Le @ sera remplacé par le numéro de suivi -->
    <shipping_handling>1</shipping_handling>
    <shipping_external>0</shipping_external>
    <range_behavior>0</range_behavior>
    <shipping_method>2</shipping_method> <!-- 1 = Selon le poids, 2 = Selon le prix Total -->
    <max_width>0</max_width>
    <max_height>0</max_height>
    <max_depth>0</max_height>
    <max_weight>0</max_weight>
    <grade>3</grade> <!-- "Vitesse" / Pertinence -->
    <delay>
      <language id="1"><![CDATA[Livraison en 24h ouvrées]]></language>
    </delay>
  </carrier>
</prestashop>
```

---

## 📦 Numeros de Suivis (Order_carriers)
**Endpoint : `/api/order_carriers`**
C'est ici qu'on met à jour le numéro de suivi pour le client.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_carrier>
    <!-- Mettre l'ID uniquement s'il s'agit d'un PUT (mise à jour) -->
    <!-- <id>5</id> -->
    <id_order>3</id_order>
    <id_carrier>2</id_carrier>
    <id_order_invoice>0</id_order_invoice>
    <weight>1.500</weight>
    <tracking_number><![CDATA[XYZ123456789FR]]></tracking_number>
  </order_carrier>
</prestashop>
```

---

## 💶 Taxes (Taxes)
**Endpoint : `/api/taxes`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <tax>
    <rate>20.000</rate>
    <active>1</active>
    <deleted>0</deleted>
    <name>
      <language id="1"><![CDATA[TVA FR 20%]]></language>
    </name>
  </tax>
</prestashop>
```

---

## 📊 Quantités Standards (Stock_availables)
**Endpoint : `/api/stock_availables`**
*PrestaShop modifie cette ressource, il est TRÈS recommandé de toujours faire un un "PUT" sur l'id_stock_available existant plutôt qu'un "POST".*

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id>15</id> <!-- Indispensable en mode PUT -->
    <id_product>10</id_product>
    <id_product_attribute>0</id_product_attribute> <!-- 0 = Produit simple, sans déclinaisons -->
    <id_shop>1</id_shop>
    <id_shop_group>0</id_shop_group>
    <quantity>250</quantity> <!-- Nouvelle quantité courante -->
    <depends_on_stock>0</depends_on_stock> <!-- 1 si le module 'Advanced Stock Management' gère la quantité -->
    <out_of_stock>2</out_of_stock> <!-- 0 = Refuser les commandes hors stock, 1 = Accepter, 2 = Se fier aux réglages globaux -->
  </stock_available>
</prestashop>
```

---

## 🏢 Entrepots et gestion avancée (Stocks, Deliveries, Stock_movements)
*Ressources du "Advanced Stock Management" (Obsolète sur les boutiques standards depuis PrestaShop 1.7. On ne devrait l'utiliser que pour des configurations B2B très spécifiques !)*

```xml
<!-- Deliveries (Frais de port d'un Transporteur par Zone) -->
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <delivery>
    <id_carrier>2</id_carrier>
    <id_range_price>1</id_range_price> <!-- La tranche de prix (ou de poids) -->
    <id_range_weight>0</id_range_weight>
    <id_zone>1</id_zone> <!-- 1 = Europe -->
    <id_shop>1</id_shop>
    <price>5.500000</price>
  </delivery>
</prestashop>
```

---

## 👥 Administrateurs / Employés (Employees)
**Endpoint : `/api/employees`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <employee>
    <id_profile>1</id_profile> <!-- 1 = SuperAdmin, 2 = Traducteur, 3 = Logisticien, etc. -->
    <id_lang>1</id_lang> <!-- Langue de l'interface admin -->
    <lastname>Dupont</lastname>
    <firstname>Alice</firstname>
    <email>alice.dupont@entreprise.com</email>
    <passwd>SonMotDePasse123!</passwd> <!-- Haché à l'insertion -->
    <active>1</active>
    <optin>0</optin>
    <default_tab>1</default_tab> <!-- Page par défaut dans le BO (1 = Tableau de bord) -->
  </employee>
</prestashop>
```

---

## 🏪 Boutiques physiques (Stores)
**Endpoint : `/api/stores`**
Affiche les points de vente physiques de l'entreprise sur la carte du site (Store Locator).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <store>
    <id_country>8</id_country>
    <id_state>0</id_state>
    <name>
      <language id="1"><![CDATA[Boutique Paris Centre]]></language>
    </name>
    <address1>
      <language id="1"><![CDATA[10 rue de Rivoli]]></language>
    </address1>
    <address2>
      <language id="1"><![CDATA[]]></language>
    </address2>
    <city>Paris</city>
    <postcode>75001</postcode>
    <latitude>48.8566</latitude>
    <longitude>2.3522</longitude>
    <phone>01 02 03 04 05</phone>
    <email>paris@entreprise.com</email>
    <active>1</active>
  </store>
</prestashop>
```