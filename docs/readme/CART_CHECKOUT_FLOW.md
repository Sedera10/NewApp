# Flux Panier et Checkout

## Objectif
Garantir un panier continu entre navigation, login et creation de commande.

## Vue rapide
1. Ajout panier local (localStorage)
2. Creation / update panier PrestaShop
3. Checkout -> creation commande
4. Nettoyage apres succes

## Details

### 1) Ajout au panier
- `localCartService.addToCart()` stocke les items en local.
- `cartService.createCart()` cree un panier API si absent.
- `cartService.updateCart()` met a jour les lignes si panier API existe.

### 2) Synchronisation apres login
- `authService.loginFO()` verifie un panier anonyme.
- Si panier anonyme existe, il est rattache au client.
- Si aucun panier anonyme, recuperation du dernier panier API.
- `localCartService.setCart()` reconstruit le panier local pour l'UI.

### 3) Reprise d'un panier
- Depuis la page commandes, bouton "Reprendre".
- Synchronise le panier API -> local, puis navigation vers `/cart`.

### 4) Checkout et commande
- Reutilise `current_cart_id` si present.
- Si absent, creation d'un panier API.
- Creation de commande avec `secure_key` client.
- Nettoyage: `localCartService.clearCart()` et suppression de `current_cart_id`.

## Points de controle
- `current_cart_id_{customerId}` dans localStorage.
- Compteur panier mis a jour via l'evenement `local-cart-updated`.

## Depannage rapide
- Panier vide apres login: verifier `localCartService.setCart()`.
- Compteur panier ne bouge pas: verifier l'event `local-cart-updated`.
- Panier persiste apres commande: verifier suppression de `current_cart_id`.
