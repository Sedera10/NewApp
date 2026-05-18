# Documentation: Logique Transactionnelle d'Import

## Notes projet (18 mai 2026)
- Evolution stock: calculs en UTC pour eviter les gels navigateur.
- Panier: synchronisation locale apres login et reprise panier.
- Checkout: commande creee avec `secure_key` et nettoyage du panier local apres succes.

## Vue d'ensemble

Le système d'import de données fonctionne selon un modèle **"TOUT OU RIEN"** (All-or-Nothing Transaction):
- Si tous les imports réussissent → Les données sont conservées
- Si une erreur se produit à n'importe quel stade → **TOUTES les données importées sont supprimées** (rollback complet)

## Architecture

### 1. Flux d'Import Standard

```
ImportPage.jsx (UI)
    ↓
handleSubmit() → Orchestrateur d'import
    ├─→ importFile1() → Produits & Catégories
    ├─→ importFile2() → Variantes & Stock (dépend de File1)
    ├─→ importFile3() → Commandes & Clients (dépend de File1 + File2)
    └─→ importFile4() → Images (extrait ZIP, dépend de File1)
```

### 2. Gestion des Erreurs avec Rollback

Chaque étape d'import est enrobée dans un bloc try-catch :

```javascript
if (file1) {
    try {
        file1Results = await importFile1(file1, ...);
    } catch (error) {
        // Erreur détectée
        await rollbackAllImports();  // ← Supprime TOUT
        throw error;  // Affiche le message d'erreur à l'utilisateur
    }
}
```

### 3. Processus de Rollback

La fonction `rollbackAllImports()` :
1. Appelle `resetAllData()` depuis `resetService.js`
2. Récupère la liste des ressources à vider depuis `VITE_RESOURCES_TO_WIPE`
3. Supprime individuellement chaque enregistrement de chaque ressource
4. Gère les erreurs 404 (ressources non trouvées) gracieusement

```javascript
export const rollbackAllImports = async () => {
  try {
    console.warn('⚠️ ROLLBACK EN COURS - Suppression de toutes les données importées...');
    await resetAllData((resourceName, status, completedCount, meta = {}) => {
      console.log(`  → Suppression de ${resourceName}... (${status})`);
    });
    console.log('✓ Rollback terminé');
  } catch (error) {
    throw new Error(`Erreur lors du rollback: ${error.message}`);
  }
};
```

## Implémentation du Dézipage

### 1. Extraction ZIP dans Util.js

```javascript
export const extractZipFiles = async (zipFile) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const contents = await zip.loadAsync(zipFile);
  
  const extractedFiles = [];
  for (const [path, file] of Object.entries(contents.files)) {
    if (file.dir || path.includes('__MACOSX') || path.includes('.DS_Store')) {
      continue;  // Ignorer dossiers et fichiers système
    }
    
    const fileName = path.split('/').pop();
    const blob = await file.async('blob');
    const extractedFile = new File([blob], fileName, { type: blob.type });
    extractedFiles.push(extractedFile);
  }
  return extractedFiles;
};
```

### 2. Utilisation dans ImportPage.jsx

```javascript
if (imageFiles.length > 0 && file1Results) {
    try {
        setProgressMsg('(4/4) Extraction du ZIP des images...');
        const extractedImages = await extractZipFiles(imageFiles[0]);
        
        if (extractedImages.length === 0) {
            throw new Error('Le fichier ZIP ne contient aucune image');
        }
        
        setProgressMsg(`(4/4) Importation des ${extractedImages.length} image(s)...`);
        await importFile4(extractedImages, file1Results, ...);
    } catch (error) {
        await rollbackAllImports();  // Rollback en cas d'erreur
        throw error;
    }
}
```

## Configuration Requise

### Variables d'Environnement (.env)

```env
VITE_RESOURCES_TO_WIPE=order_payments,customers,products,categories,addresses,combinations,carts,orders,order_details,taxes,tax_rules,tax_rule_groups,product_options,product_option_values,images,order_histories,customer_messages
```

Cette liste définit les ressources à supprimer lors d'un rollback.

## Scénarios de Test

### Scénario 1: Import Complet Réussi
1. ✅ File1 (Produits) → Succès
2. ✅ File2 (Variantes) → Succès
3. ✅ File3 (Commandes) → Succès
4. ✅ File4 (Images ZIP) → Succès
5. ✅ **RÉSULTAT**: Toutes les données conservées

### Scénario 2: Erreur au File2 (Variantes)
1. ✅ File1 (Produits) → Succès
2. ❌ File2 (Variantes) → ERREUR
3. 🔄 **ROLLBACK DÉCLENCHÉ**: Suppression de tous les produits du File1
4. ❌ **RÉSULTAT**: Base de données retour à l'état initial

### Scénario 3: Erreur au File4 (Images)
1. ✅ File1, File2, File3 → Tous réussis
2. ❌ File4 (Images ZIP) → ERREUR extraction ou import
3. 🔄 **ROLLBACK DÉCLENCHÉ**: Suppression de tous produits, variantes, commandes
4. ❌ **RÉSULTAT**: Base de données retour à l'état initial

### Scénario 4: ZIP Invalide
1. L'utilisateur sélectionne un fichier ZIP corrompu
2. `extractZipFiles()` lève une exception
3. 🔄 **ROLLBACK DÉCLENCHÉ** (si autre import déjà complété)
4. ❌ Message d'erreur: "Impossible d'extraire le fichier ZIP: ..."

## Flux d'Erreur Utilisateur

```
User selects files and clicks "IMPORTER"
         ↓
Import starts with progress display
         ↓
(1/4) File1 processing...
(2/4) File2 processing...
(3/4) File3 processing...
(4/4) Extraction du ZIP des images...
         ↓
ERROR DETECTED
         ↓
setProgressMsg shows: "Erreur lors de l'import du Fichier X, rollback en cours..."
         ↓
rollbackAllImports() executes
         ↓
All data deleted
         ↓
alert("Une erreur s'est produite lors de l'import : [error message]")
         ↓
Form reset, ready for retry
```

## Avantages de cette Approche

1. **Intégrité des données**: Pas de données partielles ou corrompues
2. **Prévisibilité**: L'utilisateur sait que soit TOUT est importé, soit RIEN
3. **Récupération facile**: L'utilisateur peut corriger les fichiers et réessayer
4. **Traçabilité**: Logs complets de ce qui a échoué et pourquoi
5. **Pas de dépendances manquantes**: Les rollbacks ne laissent pas de données orphelines

## Limitations Actuelles

1. **Performances**: Le rollback supprime tout individuellement (peut être lent pour de grandes quantités)
2. **Pas d'annulation partielle**: Impossible d'annuler au milieu du File4
3. **Pas de point de sauvegarde**: Impossible de reprendre à partir du File3 si File4 échoue

## Améliorations Futures

1. Implémenter des points de sauvegarde intermédiaires
2. Ajouter une "transaction réversible" par ressource
3. Batch delete optimisé pour le rollback
4. Système de log détaillé par ressource

