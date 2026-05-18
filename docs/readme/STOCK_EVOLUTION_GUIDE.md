# Guide - Evolution du Stock

## Objectif
Afficher l'evolution journaliere du stock sur une periode donnee.

## Sources de donnees
- `stock_deltas` : mouvements de stock (entree/sortie)
- `stock_availables` : stock courant

## Calcul
- Agrégation des mouvements par date.
- Reconstruction d'un tableau journalier entre deux dates.

## Mode declinaison vs produit global
- Mode declinaison: filtre sur `id_product_attribute`.
- Mode produit global: inclut tous les mouvements.

## Activer / desactiver
- Front-end: passer ou non `productAttributeId` dans `ProductFiche`.
- Service: filtrer ou non les `stock_deltas`.

## Indices cles
- `productService.getStockEvolutionBetweenDates()`
- `ProductFiche.jsx` (tableau de stock)

## Notes
- Le tableau d'evolution affiche + pour entree et - pour sortie.
- Les dates sont calculees en UTC pour eviter les gels navigateur.
