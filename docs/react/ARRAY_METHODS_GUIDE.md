# 🧰 Guide : Les méthodes de tableau incontournables 

En React, nous ne pouvons pas utiliser les boucles `for` ou `while` directement dans notre code HTML (JSX). Nous devons utiliser les méthodes javascript de manipulation de tableaux (`Array Methods`).

Elles sont extrêmement puissantes car elles ne "cassent" pas le tableau d'origine, elles en renvoient un nouveau (principe d'immutabilité).

---

## 1. `.map()` : Transformer et Afficher
**Le but :** Prendre un tableau, modifier chaque élément et renvoyer un nouveau tableau de la même taille.
**En React :** Utilisé à 99% pour transformer un tableau de données en une liste de balises HTML !

**Exemple :**
```javascript
// La donnée venant du Backend
const roles = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'User' }
];

// L'affichage React :
<select>
  {roles.map((role) => (
    <option key={role.id} value={role.id}>
      {role.name}
    </option>
  ))}
</select>
```
⚠️ *Note : N'oublie jamais la propriété `key` sur l'élément parent retourné par un `.map()`. Cela aide React à optimiser l'affichage.*

---

## 2. `.filter()` : Trier et Supprimer
**Le but :** Garder uniquement les éléments qui répondent à une condition. S'il renvoie `true`, on le garde, s'il renvoie `false`, on le jette.
**En React :** Parfait pour supprimer un élément d'une liste cliquée, ou cocher/décocher des options.

**Exemples :**
```javascript
const numbers = [1, 2, 3, 4, 5];

// Garder uniquement les plus grands que 2
const bigNumbers = numbers.filter(num => num > 2);
// Résultat : [3, 4, 5]

// Exemple React (tiré de ton formulaire pour décocher un skill) :
// formData.skills = ['react', 'css', 'node']
const newSkills = formData.skills.filter(skill => skill !== 'css');
// Résultat : ['react', 'node'] 
```

---

## 3. `.find()` : Trouver UN élément précis
**Le but :** Identique à filter, mais s'arrête de chercher dès qu'il a trouvé le PREMIER élément qui répond à la condition, et renvoie l'élément (pas un tableau).

**Exemple :**
```javascript
const users = [
  { id: '10', name: 'John' },
  { id: '20', name: 'Jane' }
];

const selectedUser = users.find(user => user.id === '20');
// Résultat : { id: '20', name: 'Jane' }
```

---

## 4. `.includes()` : Vérifier si ça existe
**Le but :** Renvoie `true` ou `false` selon si une valeur spécifique se trouve dans un tableau.
**En React :** Parfait pour savoir si une case checkbox doit être cochée ou non.

**Exemple :**
```javascript
// Ton state React
const userSkills = ['react', 'node'];

<input 
  type="checkbox" 
  checked={userSkills.includes('react')} // Renvoie true, donc sera coché !
/>
```

---

## 5. `.reduce()` : L'accumulateur final (Avancé)
**Le but :** Prendre tout le tableau et le "réduire" en une seule grosse valeur. Très utilisé pour calculer des sommes.

**Exemple Calcul de prix :**
```javascript
const cart = [
  { product: 'T-shirt', price: 20 },
  { product: 'Pantalon', price: 50 },
  { product: 'Casquette', price: 10 }
];

// Le "total" commence à 0 (le paramètre à la fin).
// A chaque tour, on ajoute le prix de l'item au "total".
const totalPrice = cart.reduce((total, item) => total + item.price, 0);

console.log(totalPrice); // 80
```

---

## 💡 En Résumé !

| Opération voulue | Méthode à utiliser | Ce qu'elle retourne |
|------------------|--------------------|---------------------|
| Afficher une liste en JSX | `.map()` | Un tableau de JSX |
| Supprimer un item | `.filter()` | Un tableau filtré |
| Chercher le profil ID:5 | `.find()` | Un Objet `{}` |
| Vérifier si une case est cochée | `.includes()` | Un Booléen `true`/`false` |
| Faire la somme du panier | `.reduce()` | Un nombre final |

---

## Exemples projet

### Filtrer les paniers non commandes
```javascript
const orderedIds = new Set(orders.map(o => String(o.id_cart)));
const unordered = carts.filter(c => !orderedIds.has(String(c.id)));
```

### Trouver une declinaison selectionnee
```javascript
const selected = stockRows.find(row => String(row.idProductAttribute) === selectedId);
```
