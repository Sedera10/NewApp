# Vue d'ensemble du projet NewApp

## Objectif
Application React connectee a PrestaShop (API XML) pour gerer un front-office client et un back-office admin.

## Structure principale
- `src/pages/frontoffice` : pages client (produits, panier, checkout, commandes)
- `src/pages/backoffice` : pages admin (stock, import, dashboard, commandes)
- `src/components` : composants UI reutilisables
- `src/service` : services d'appel API PrestaShop + logique metier
- `docs/readme` : documentation projet
- `docs/presta_docs` : reference API PrestaShop
- `docs/react` : guides React

## Flux cles
- Auth client -> panier local -> synchronisation panier API
- Checkout -> creation panier PrestaShop -> creation commande
- Stock -> evolution journaliere basee sur `stock_deltas`
- Import CSV/ZIP -> import transactionnel (rollback en cas d'erreur)

## Services principaux
- `productService` : produits, stock, declinaisons, evolution
- `cartService` / `localCartService` : paniers API + localStorage
- `commandeService` : commandes, statuts, carriers, paiements
- `authService` : login client, synchronisation panier

## Routes principales
- Front-office
  - `/mystore/fr/products`
  - `/mystore/fr/cart`
  - `/mystore/fr/checkout`
  - `/mystore/fr/commandes`
- Back-office
  - `/mystore/admin/stock`
  - `/mystore/admin/import`
  - `/mystore/admin/dashboard`

## Notes importantes
- PrestaShop utilise des payloads XML. Toujours inclure `id` pour les PUT.
- Le panier local est la source UI. L'API est synchronisee lors des actions.
- L'evolution du stock peut se faire par produit global ou par declinaison.
