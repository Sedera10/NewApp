# Ordre de Suppression des Entités (Hard Reset via API)

## Note projet
Ce flux est utilise par l'import transactionnel pour rollback complet en cas d'erreur.

Pour développer un bouton "Reset Data" dans une application connectée à l'API PrestaShop, la méthode `DELETE` doit être scrupuleusement séquencée.

L'API ne possédant pas de système de "Cascade Delete Sql" strict, si vous supprimez un produit avant une commande, l'API risque de rejeter la suppression pour cause d'intégrité de la base de données.

Voici **l'ordre chronologique exact** que votre code asynchrone (`await`) doit respecter pour vider proprement une installation de Prestashop.

---

### Phase 1 : Les Transactions et Paniers (Le nettoyage commercial)
*Détruisez toujours les transactions finalisées, puis l'historique, puis la commande, et enfin le panier.*

1.  `DELETE /api/order_payments/[...]` (Les paiements réalisés)
2.  `DELETE /api/order_histories/[...]` (L'historique des changements d'état)
3.  `DELETE /api/order_carriers/[...]` (Les numéros de suivi)
4.  `DELETE /api/order_details/[...]` (Le contenu figé de la commande)
5.  `DELETE /api/orders/[...]` (L'entête de la commande)
6.  `DELETE /api/carts/[...]` (Les paniers des visiteurs)
7.  `DELETE /api/customer_messages/[...]` (Les messages du SAV liés aux commandes)

### Phase 2 : Le Catalogue (Le nettoyage des offres)
*Maintenant que plus aucune commande ou panier n'existe, les produits "récupèrent leur liberté" et peuvent être supprimés sans lever d'alerte de stock ou de facturation.*

8.  `DELETE /api/images/products/[...]` (Permet de libérer l'espace disque du serveur)
9.  `DELETE /api/specific_prices/[...]` (Règles de réductions)
10. `DELETE /api/combinations/[...]` (Les déclinaisons des produits - très important avant le produit final)
11. `DELETE /api/products/[...]` (Les fiches produits)
12. `DELETE /api/categories/[...]` 
    * **⚠️ ATTENTION EXTRÊME** : Demandez la liste des catégories, puis filtrez pour ne supprimer que les ID > 2. Ne supprimez jamais l'ID 1 (Racine) et l'ID 2 (Accueil) sous peine de casser définitivement tout le système PrestaShop.
13. `DELETE /api/product_features/[...]` (Caractéristiques)
14. `DELETE /api/product_options/[...]` (Attributs/Taille,Couleur)
15. `DELETE /api/manufacturers/[...]` (Marques)
16. `DELETE /api/suppliers/[...]` (Fournisseurs)

### Phase 3 : Les Utilisateurs et CRM (Le nettoyage des comptes)
*Maintenant qu'ils n'ont plus de paniers et plus de commandes, on peut détruire les comptes.*

17. `DELETE /api/addresses/[...]` (Les adresses de livraison)
18. `DELETE /api/customers/[...]` (Les clients finaux)
19. `DELETE /api/guests/[...]` (Les cookies des visiteurs anonymes)

### Phase 4 : Configuration Locale (Les Taxes)
*Puisque l'import gère la création des taxes à la volée, on nettoie les règles créées. Toujours effacer dans cet ordre pour respecter les dépendances, et toujours après les produits.*

20. `DELETE /api/tax_rules/[...]` (Liaisons entre groupe et pays)
21. `DELETE /api/tax_rule_groups/[...]` (Les groupes de taxes, ex: "TVA 20%")
22. `DELETE /api/taxes/[...]` (Les valeurs pures, ex: 20.000)

---

### Exemple de script asynchrone React recommandable :

```javascript
const resourcesToWipe = [
    // Phase 1 : Transactions et Paniers
    "order_payments", "order_histories", "order_carriers", "order_details", 
    "orders", "carts", "customer_messages",
    
    // Phase 2 : Catalogue
    "specific_prices", "combinations", "products", "categories", 
    "product_features", "product_feature_values", "product_options", "product_option_values", 
    "manufacturers", "suppliers",
    
    // Phase 3 : Utilisateurs et CRM
    "addresses", "customers", "guests",

    // Phase 4 : Configuration Locale (Taxes)
    "tax_rules", "tax_rule_groups", "taxes"
];

async function resetAllData(wsKey) {
    for (const resource of resourcesToWipe) {
        
        // 1. Demander tous les IDs de la ressource
        const getRes = await fetch(`/api/${resource}?display=[id]&ws_key=${wsKey}&output_format=JSON`);
        const data = await getRes.json();
        
        // 2. Extraire la liste des IDs (Attention au formatage du JSON retourné)
        let idArray = [];
        if (data[resource]) {
            idArray = data[resource].map(item => item.id);
        }
        
        // 3. Procéder au Bulk-Delete (Suppression par lot par requête unique)
        if (idArray.length > 0) {
            
            // Protection de la Base Catalogue
            if (resource === 'categories') {
                idArray = idArray.filter(id => parseInt(id) > 2); // Conserve Accueil et Root
            }
            if (idArray.length === 0) continue;
            
            const idsString = `[${idArray.join(',')}]`;
            await fetch(`/api/${resource}/${idsString}?ws_key=${wsKey}`, {
                method: 'DELETE'
            });
            console.log(`${resource} vidée.`);
        }
    }
}
```