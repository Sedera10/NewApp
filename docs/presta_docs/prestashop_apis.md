# API REST PrestaShop (Webservice)

PrestaShop dispose d'une API REST native intégrée appelée le **Webservice**.

## 1. Où se trouvent les fichiers de l'API ?

Le Webservice de PrestaShop est principalement géré par les dossiers et fichiers suivants :

* **`webservice/dispatcher.php`** : C'est le point d'entrée unique de toutes les requêtes API (ex: `http://localhost/prestashop/api/...`).
* **`classes/webservice/`** : Contient toute la logique du moteur API :
  * `WebserviceRequest.php` : Gère le routage des ressources, la validation des clés API et définit les endpoints disponibles.
  * `WebserviceOutputXML.php` / `WebserviceOutputJSON.php` : Les formateurs qui gèrent le rendu des données.
  * `WebserviceKey.php` : Modèle gérant les permissions des clés API accordées.
* **`classes/` (Les ObjectModels)** : L'API repose presque entièrement sur le système d'ORM natif (`ObjectModel`). Les propriétés interrogeables sont définies dans le tableau `$webserviceParameters` de chaque classe (ex: `classes/Product.php`, `classes/Customer.php`).

---

## 2. Liste complète des Endpoints (Ressources API)

Voici la liste des ressources exposées par défaut par le Webservice PrestaShop, classées par grands modules (endpoints accessibles via `/api/{ressource}`) :

### 📦 Produits & Catalogue (Products & Catalog)
* `products` : Les produits de la boutique.
* `categories` : Les catégories de produits.
* `manufacturers` : Les marques / fabricants.
* `suppliers` : Les fournisseurs.
* `combinations` : Les déclinaisons de produits.
* `product_options` : Les groupes d'attributs (options).
* `product_option_values` : Les valeurs d'attributs.
* `product_features` : Les caractéristiques de produits.
* `product_feature_values` : Les valeurs des caractéristiques.
* `specific_prices` & `specific_price_rules` : Les réductions et règles de prix spécifiques.
* `tags` : Les mots-clés (tags) associés aux produits.
* `images` & `image_types` : Gestion des images et leurs formats.
* `attachments` : Les documents joints aux produits.
* `product_customization_fields` & `customizations` : La personnalisation des produits.
* `product_suppliers` : L'association Produit-Fournisseur.

### 👤 Clients & CRM (Customers & CRM)
* `customers` : Les clients de la boutique.
* `addresses` : Les adresses (des clients, marques, etc.).
* `groups` : Les groupes de clients.
* `guests` : Les visiteurs (non connectés).
* `contacts` : Les contacts de la boutique.
* `customer_messages` & `customer_threads` : Les messages et fils de discussion SAV.

### 🛒 Commandes & Paniers (Orders & Carts)
* `orders` : Les commandes passées.
* `order_details` : Le détail des produits commandés.
* `order_states` : Les statuts possibles des commandes.
* `order_histories` : L'historique des changements de statut des commandes.
* `order_invoices` : Les factures.
* `order_payments` : Les paiements effectués.
* `order_slip` : Les avoirs.
* `carts` : Les paniers en cours.
* `cart_rules` & `order_cart_rules` : Les codes promo / bons de réduction.
* `messages` : Les messages de commande.

### 🚚 Transports & Livraisons (Shippings & Carriers)
* `carriers` : Les transporteurs.
* `order_carriers` : Les transporteurs assignés aux commandes.
* `deliveries` : Les règles de livraison.
* `price_ranges` & `weight_ranges` : Les tranches de prix et de poids pour le calcul des frais.

### 🌍 Localisation & Taxes (Localization & Taxes)
* `countries` : Les pays.
* `states` : Les états / provinces / régions.
* `zones` : Les zones géographiques.
* `currencies` : Les devises.
* `languages` : Les langues.
* `taxes` : Les taux de taxes.
* `tax_rules` & `tax_rule_groups` : Les règles de taxes.

### 🏭 Stocks & Logistique Avancée (Stocks & Logistics)
*(Attention : L'API restreint souvent les requêtes de création/suppression sur ces ressources)*
* `stocks` & `stock_availables` : Le stock disponible (quantités).
* `stock_deltas` : Mouvements de stock (entree/sortie) utilises pour l'evolution journaliere.
* `stock_movements` & `stock_movement_reasons` : Les mouvements de stock.
* `warehouses` : Les entrepôts.
* `warehouse_product_locations` : L'emplacement des produits dans l'entrepôt.
* `supply_orders`, `supply_order_details`, `supply_order_states`, `supply_order_histories`, `supply_order_receipt_histories` : Gestion des commandes fournisseurs de réapprovisionnement.

### ⚙️ Paramètres, Multi-boutique & Admin (Settings & Admin)
* `configurations` & `translated_configurations` : Les paramètres / réglages de la boutique (table `ps_configuration`).
* `shops` : Les boutiques (mode multi-boutique).
* `shop_groups` : Les groupes de boutiques.
* `shop_urls` : Les URLs des boutiques.
* `employees` : Les employés (utilisateurs du back-office).
* `stores` : Les magasins physiques de la marque.
* `content_management_system` : Les pages CMS.
* `search` : Endpoint pour la recherche.

> **Note :** Les modules tiers installés dans `modules/` peuvent également ajouter de nouveaux endpoints à cette liste grâce au hook `addWebserviceResources`.
