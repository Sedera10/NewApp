# 🔄 Guide : Bien utiliser `useEffect` en React

Le Hook `useEffect` permet de **synchroniser ton composant avec un système externe** (appeler une API, modifier le DOM directement, gérer des abonnements ou des timers).

---

## 1. Comment l'écrire ? (La syntaxe)

Il prend deux paramètres :
1. **La fonction à exécuter** (le code de ton effet).
2. **Le tableau de dépendances** (quand est-ce que ce code doit s'exécuter ?).

```javascript
import { useEffect } from 'react';

useEffect(() => {
  // 1. Le code à exécuter (l'effet)
  console.log("Le composant est monté !");

  // 2. (Optionnel) La fonction de nettoyage
  return () => {
    console.log("Le composant est démonté !");
  };
}, /* 3. Tableau de dépendances */ []);
```

---

## 2. Le secret : Le tableau de dépendances `[ ]`

C'est lui qui dicte **quand** ton code doit s'exécuter. 

| Tableau | Que se passe-t-il ? | Quand l'utiliser ? |
|---------|--------------------|-------------------|
| **Absent**<br/>`useEffect(...)` | S'exécute à **CHAQUE** rendu du composant (très dangereux !). | ❌ Quasiment jamais. Risque de boucle infinie. |
| **Vide**<br/>`useEffect(..., [])` | S'exécute **UNE SEULE FOIS** au montage du composant (quand il apparaît). | ✅ Pour charger des données initiales (Fetch API "genders", "roles"). |
| **Avec variables**<br/>`useEffect(..., [userId])` | S'exécute au montage **ET** à chaque fois que `userId` change. | ✅ Pour re-charger les données quand l'ID change. |

---

## 3. Le cas classique : Les appels API (Fetch)

C'est l'erreur la plus commune chez les débutants : faire un `fetch` ou appeler un service directement dans le corps du composant !

**❌ À NE PAS FAIRE (Boucle Infinie)**
```javascript
export default function Users() {
  const [data, setData] = useState([]);
  
  // DANGER : Le fetch modifie le State, ce qui relance le composant, 
  // ce qui refait le fetch, ce qui modifie le state... BOUCLE INFINIE !
  fetch('/api/users').then(res => setData(res.data)); 
}
```

**✅ LA BONNE MÉTHODE (Avec useEffect)**
```javascript
export default function Users() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Le fetch ne s'exécutera qu'une seule fois grâce au []
    fetch('/api/users')
      .then(res => setData(res.data));
  }, []); 
}
```

---

## 4. La fonction de nettoyage (Cleanup)

Si ton effet crée quelque chose qui continue de tourner en arrière-plan (un `setInterval` ou un écouteur d'événement), tu DOIS le nettoyer pour éviter les fuites de mémoire.

```javascript
useEffect(() => {
  const timer = setInterval(() => {
    console.log("Tic Tac");
  }, 1000);

  // Exécutée quand le composant disparaît de l'écran
  return () => {
    clearInterval(timer);
    console.log("Timer arrêté");
  };
}, []);
```

## 🎯 En résumé
`useEffect` est ton meilleur ami pour **charger la donnée au chargement de la page** (via `[]`). Ne fais jamais de calculs complexes ou d'appels API directement dans ton composant en dehors d'un useEffect (ou d'une fonction onClick).