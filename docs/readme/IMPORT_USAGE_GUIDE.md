# Guide d'Utilisation - Import ZIP Transactionnel

## Notes projet (18 mai 2026)
- Evolution stock par declinaison activee dans la fiche produit.
- Panier: reprise possible depuis la page commandes.
- Checkout: `secure_key` inclus a la creation de commande.

## 🎯 Objectif

Importer des données en 4 étapes avec garantie **"TOUT OU RIEN"** :
- File1: Produits & Catégories (.csv)
- File2: Variantes & Stock (.csv)
- File3: Commandes & Clients (.csv)
- File4: Images des produits (.zip)

En cas d'erreur **à n'importe quelle étape**, **TOUTES les données importées sont supprimées** automatiquement (rollback).

---

## 📋 Prérequis

### 1. Fichiers CSV Valides

**File1.csv** (Produits & Catégories)
```csv
reference,nom,prix_ttc,Taxe,categorie,description
T_01,T-Shirt Bleu,25000,20,Vêtements,T-Shirt de qualité
P_01,Pantalon Noir,50000,20,Vêtements,Pantalon élégant
```

**File2.csv** (Variantes & Stock)
```csv
reference,specificité,karazany,stock_initial,prix_vente_ttc
T_01,taille,M,50,
T_01,taille,L,30,
T_01,couleur,bleu,0,
```

**File3.csv** (Commandes & Clients)
```csv
email,nom,pwd,adresse,achat,date,etat
client1@test.com,Jean,pass123,123 Rue Paris,[("T_01";2;""),("P_01";1;"")],20/05/2026,Payée
client2@test.com,Marie,pass456,456 Rue Lyon,[("T_01";1;"M")],21/05/2026,Livrée
```

### 2. Archive ZIP d'Images

Créer un fichier `images.zip` contenant:
```
images.zip
├── T_01.jpg     (pour produit T_01)
├── P_01.jpg     (pour produit P_01)
├── T_01.png     (variante alternative)
└── ...
```

**Règles importantes:**
- Le nom du fichier image doit correspondre à la **référence du produit**
- Extensions supportées: `.jpg`, `.jpeg`, `.png`
- Exemple: Produit avec référence "T_01" → fichier "T_01.jpg"
- Les dossiers et fichiers système (`.DS_Store`, `__MACOSX`) sont ignorés automatiquement

---

## 🚀 Tutoriel d'Import

### Étape 1: Accéder à la Page Import

```
URL: http://localhost:5173/dashboard/import
```

Vous verrez:
- Icon nuage bleu
- Texte: "Importez vos fichiers CSV pour les données et ZIP pour les images"
- Trois sections: Fichiers CSV + Images

### Étape 2: Sélectionner les Fichiers CSV

**Fichier 1: Produits & Catégories**
```
1️⃣ Cliquez sur le champ input
2️⃣ Sélectionnez File1.csv
3️⃣ Confirmation: ✓ File1.csv
```

**Fichier 2: Variantes & Stock**
```
1️⃣ Cliquez sur le champ input
2️⃣ Sélectionnez File2.csv
3️⃣ Confirmation: ✓ File2.csv
```

**Fichier 3: Commandes & Clients**
```
1️⃣ Cliquez sur le champ input
2️⃣ Sélectionnez File3.csv
3️⃣ Confirmation: ✓ File3.csv
```

### Étape 3: Sélectionner le ZIP d'Images

```
1️⃣ Cliquez sur le champ "Images des produits (.zip)"
2️⃣ Sélectionnez images.zip
3️⃣ Confirmation: ✓ images.zip sélectionné
```

### Étape 4: Lancer l'Import

```
1️⃣ Cliquez sur le bouton bleu "TRAITER ET IMPORTER LES DONNÉES"
2️⃣ Le bouton devient: "⏳ IMPORTATION EN COURS..."
3️⃣ Suivi de la progression:
   - (1/4) Parsing du CSV...
   - (1/4) Création des catégories... (3/3)
   - (1/4) Création des taxes... (1/1)
   - ...
   - (4/4) Extraction du ZIP des images...
   - (4/4) Importation des 6 image(s)...
```

### Étape 5: Résultat

#### ✅ Succès
```
Alert: "Fichiers importés avec succès !"

Le formulaire se réinitialise:
- Tous les champs deviennent vides
- Les confirmations ✓ disparaissent
- Prêt pour un nouvel import
```

#### ❌ Erreur
```
Message de progression: "Erreur lors de l'import du Fichier X, rollback en cours..."

Puis:
Alert: "Une erreur s'est produite lors de l'import : [détails de l'erreur]"

Résultat du rollback:
✓ TOUTES les données importées ont été supprimées
✓ Base de données retournée à l'état initial
✓ Prêt pour réessayer avec des fichiers corrigés
```

---

## 🔄 Scénarios Réels

### Scénario 1: Import Parfait

**Action utilisateur:**
- Sélectionne 3 CSV valides + 1 ZIP valide
- Clique "IMPORTER"

**Résultat:**
```
(1/4) Parsing du CSV File1...
(1/4) Création des catégories... (5/5)
(1/4) Création des taxes... (2/2)
(1/4) Création des produits... (50/50)
✓ Fichier 1 terminé

(2/4) Parsing du CSV File2...
(2/4) Création des groupes d'attributs... (3/3)
(2/4) Création des attributs... (12/12)
(2/4) Création des combinaisons... (25/25)
(2/4) Mise à jour des stocks... (25/25)
✓ Fichier 2 terminé

(3/4) Parsing du CSV File3...
(3/4) Création des clients... (100/100)
(3/4) Création des adresses... (100/100)
(3/4) Création des commandes... (100/100)
✓ Fichier 3 terminé

(4/4) Extraction du ZIP des images...
✓ Total de fichiers extraits: 25
(4/4) Importation des 25 image(s)...
✓ Image importée: T_01.jpg
✓ Image importée: P_01.jpg
...
✓ Fichier 4 terminé

Alert: "Fichiers importés avec succès !"
```

### Scénario 2: Erreur au File2 (Variantes)

**Action utilisateur:**
- Sélectionne File1.csv (valide), File2.csv (référence manquante), File3.csv
- Clique "IMPORTER"

**Résultat:**
```
(1/4) Parsing du CSV File1...
✓ Fichier 1 terminé (50 produits créés)

(2/4) Parsing du CSV File2...
(2/4) Création des attributs...
❌ ERREUR: Produit 'T_99' non trouvé

Message de progression: "Erreur lors de l'import du Fichier 2, rollback en cours..."

🔄 ROLLBACK:
Suppression de order_payments... (0)
Suppression de customers... (0)
Suppression de products... (50) ← Les 50 produits du File1
Suppression de categories... (5)
Suppression de taxes... (2)
...
✓ Rollback terminé - Toutes les données ont été supprimées

Alert: "Une erreur s'est produite lors de l'import : Fichier 2 échoué: Produit 'T_99' non trouvé"

💡 Utilisateur peut maintenant:
1. Corriger le CSV File2
2. Réessayer l'import
```

### Scénario 3: Erreur ZIP Corrompu

**Action utilisateur:**
- Sélectionne 3 CSV valides + 1 ZIP corrompu
- Clique "IMPORTER"

**Résultat:**
```
(1/4) Parsing du CSV File1...
✓ Fichier 1 terminé (50 produits)

(2/4) Parsing du CSV File2...
✓ Fichier 2 terminé (25 variantes)

(3/4) Parsing du CSV File3...
✓ Fichier 3 terminé (100 commandes)

(4/4) Extraction du ZIP des images...
❌ ERREUR: Impossible d'extraire le fichier ZIP: Unexpected end of data

Message de progression: "Erreur lors de l'import du Fichier 4, rollback en cours..."

🔄 ROLLBACK:
✓ TOUTES les données (produits, variantes, commandes) sont supprimées

Alert: "Une erreur s'est produite lors de l'import : Fichier 4 (images) échoué: Impossible d'extraire le fichier ZIP..."

💡 Utilisateur crée un nouveau ZIP valide et réessaye
```

### Scénario 4: ZIP Vide

**Action utilisateur:**
- Crée un fichier ZIP vide
- Sélectionne 3 CSV valides + ZIP vide
- Clique "IMPORTER"

**Résultat:**
```
(1/4) Fichier 1 terminé
(2/4) Fichier 2 terminé
(3/4) Fichier 3 terminé

(4/4) Extraction du ZIP des images...
✓ Total de fichiers extraits: 0

❌ ERREUR: Le fichier ZIP ne contient aucune image

Message de progression: "Erreur lors de l'import du Fichier 4, rollback en cours..."

🔄 ROLLBACK automatique

Alert: "Fichier 4 (images) échoué: Le fichier ZIP ne contient aucune image"

💡 Ajouter des images au ZIP et réessayer
```

---

## 🛠️ Créer un ZIP de Test

Pour développer/tester facilement:

```bash
cd /path/to/NewApp
node scripts/create-test-zip.js
```

Cela crée un fichier `test-images.zip` avec 6 images test:
- T_01.jpg, C_03.jpg, P_01.jpg, T_02.jpg, P_02.jpg, T_03.png

---

## ⚙️ Configuration Backend

Vérifier le fichier `.env`:

```env
VITE_RESOURCES_TO_WIPE=order_payments,customers,products,categories,addresses,combinations,carts,orders,order_details,taxes,tax_rules,tax_rule_groups,product_options,product_option_values,images,order_histories,customer_messages
```

Cette liste définie les ressources supprimées lors du rollback. Vérifier que toutes vos ressources y sont incluses.

---

## 🐛 Dépannage

### Problème: "Le fichier ZIP ne contient aucune image"
**Solution:**
- Vérifier que le ZIP contient au moins une image
- Vérifier que le nom du fichier correspond à une référence de produit valide

### Problème: "Impossible d'extraire le fichier ZIP"
**Solution:**
- Vérifier que le ZIP n'est pas corrompu
- Créer un nouveau ZIP avec les bonnes images

### Problème: Produit 'REF_XX' non trouvé (File2/3)
**Solution:**
- Vérifier que la référence existe dans File1.csv
- Vérifier l'orthographe exacte (majuscules/minuscules)

### Problème: Certaines images ne se chargent pas
**Solution:**
- Vérifier que le nom du fichier correspond exactement à la référence
- S'assurer que le format est .jpg, .jpeg ou .png
- Recompresser le ZIP

---

## 📊 Logs de Debugging

Pour déboguer, ouvrir la console du navigateur (F12) et chercher:

```javascript
// Extraction ZIP
✓ Fichier extrait du ZIP: T_01.jpg
✓ Total de fichiers extraits: 25

// Import
DEBUG File3: Customer XML...
✓ Client créé: client@example.com (ID: 123)
✓ Commande créée: client@example.com (ID: 456)

// Erreur
❌ Erreur: Impossible d'extraire...
⚠️ ROLLBACK EN COURS
✓ Rollback terminé
```

---

## ✅ Checklist Avant Import

- [ ] File1.csv existe et est valide
- [ ] File2.csv existe et est valide
- [ ] File3.csv existe et est valide
- [ ] images.zip existe et contient des images
- [ ] Les références des images correspondent aux produits
- [ ] Les noms d'image ont les bonnes extensions (.jpg/.png)
- [ ] Les fichiers ne sont pas corrompus
- [ ] La connexion à PrestaShop est active
- [ ] Les variables d'environnement sont correctes
- [ ] Espace disque suffisant sur le serveur

