# Comprendre les Totaux et les Calculs de Prix d'une Commande (PrestaShop)

## Note projet
Le checkout calcule `total_paid`, `total_products` et `total_shipping` avant creation de commande via l'API.

Dans PrestaShop, la gestion comptable est très précise. Une commande décompose chaque centime pour séparer les produits, les frais de port, les emballages, les réductions, et bien sûr la Taxe sur la Valeur Ajoutée (TVA).

Voici comment décrypter les champs de prix retournés par l'API (et stockés dans la table `ps_orders`).

---

## 1. 📖 Le Vocabulaire fondamental (Suffixes)
PrestaShop utilise des suffixes dans le nom de ses variables pour que l'on sache toujours de quoi on parle :
*   **`_tax_excl`** : Prix **Hors Taxes (HT)**.
*   **`_tax_incl`** : Prix **Toutes Taxes Comprises (TTC)**.
*   **`_wt`** : Signifie *With Taxes* (C'est un ancien alias de PrestaShop qui veut dire **TTC**).

C'est la règle d'or pour la comptabilité : PrestaShop stocke toujours les prix HT, puis calcule le TTC selon le paramétrage des taxes appliqué au client (selon son pays d'adresse de livraison).

---

## 2. 🧮 Décomposition des champs (L'exemple décrypté)

Si l'on prend votre exemple, voici ce que signifie chaque bloc de données :

### A. Les Produits (Ce que le client achète)
*   **`total_products`** : Le total absolu des produits, **Hors Taxes**. *(Ici: 59.80)*
*   **`total_products_wt`** : Le total absolu des produits, **Avec Taxes (TTC)**. *(Ici: 59.80 - Ce qui indique qu'aucune taxe n'est appliquée sur les produits pour cette commande, par exemple client étranger ou B2B).*

### B. La Livraison (Le transport)
*   **`total_shipping_tax_excl`** : Frais de port **HT**. *(Ici: 7.00)*
*   **`total_shipping_tax_incl`** : Frais de port **TTC**. *(Ici: 8.40)*
*   **`total_shipping`** : L'équivalent textuel classique affiché au client (généralement égal au TTC, ici 7.00 semblerait être le HT affiché sans la taxe selon la config, mais c'est bien le prix de la livraison).
*   **`carrier_tax_rate`** : Le taux de TVA appliqué. *(Ex: 20.000 pour 20% de TVA. Ici il vaut "0.000", ce qui est une ancienne convention quand les impôts complexes calculent la taxe à part, mais la différence 8.40 - 7.00 = 1.40 indique mathématiquement qu'il y a 20% de taxe sur le port)*.

### C. L'Emballage cadeau
*   **`total_wrapping_tax_excl`** : Frais d'emballage cadeau **HT**.
*   **`total_wrapping_tax_incl`** : Frais d'emballage cadeau **TTC**.
*(Ici tout est à 0.00 car le client n'a pas pris l'option papier cadeau).*

### D. Les Réductions (Bons de réduction / Codes Promo)
*   **`total_discounts_tax_excl`** : Le montant total déduit via des bons, en **HT**.
*   **`total_discounts_tax_incl`** : Le même montant en **TTC**.
*(Ici: 0.00)*

---

## 3. 🎯 L'Équation Globale et le Total Final

PrestaShop effectue deux calculs parallèles très stricts. Un pour la comptabilité (HT), un pour la facturation client (TTC).

### 📐 L'équation Hors Taxe (HT) :
`total_paid_tax_excl` = `total_products` + `total_shipping_tax_excl` + `total_wrapping_tax_excl` - `total_discounts_tax_excl`
> **Vérification de l'exemple :** 59.80 + 7.00 + 0 - 0 = **66.80** ✅

### 📐 L'équation Toutes Taxes Comprises (TTC) :
`total_paid_tax_incl` = `total_products_wt` + `total_shipping_tax_incl` + `total_wrapping_tax_incl` - `total_discounts_tax_incl`
> **Vérification de l'exemple :** 59.80 + 8.40 + 0 - 0 = **68.20** ✅

### 💰 Ce que le Client paie : Les champs `total_paid`
1.  **`total_paid_tax_incl`** : C'est le prix comptable TTC réel que la commande vaut.
2.  **`total_paid`** : C'est la variable "simplifiée" historique standard. Elle doit généralement être égale à `total_paid_tax_incl`.
3.  **`total_paid_real`** (Le plus important en SAV) : C'est la somme d'argent **réellement encaissée** (ce qui est rentré sur le compte bancaire, table `ps_order_payment`). Ce champ est alimenté une fois que la carte bleue est passée.
   * *Si `total_paid_real` < `total_paid_tax_incl`* : Le client a fait un paiement partiel / Il reste un montant à payer.
   * *Si `total_paid_real` = `total_paid_tax_incl`* : La commande est intégralement payée. (Dans votre exemple, le client a bien été débité de 68.20 ✅).

---

## ⚠️ Notes pour les développeurs API
Lorsque vous insérez une commande en base de données ou via le XML de l'API (Ressource `/api/orders`), PrestaShop vérifiera que **l'équation mathématique est exacte**. Si la somme de vos produits et livraisons ne correspond pas à la variable `total_paid`, la commande sera créée avec un statut visuel d'alarme : *"Erreur de paiement"*.