# Flux enfant -> parent (React)

## Objectif
Permettre a un composant enfant de remonter une action ou une valeur vers son parent.

## Pattern de base
1. Le parent declare un state.
2. Le parent passe une fonction callback en prop.
3. L'enfant appelle la callback avec la nouvelle valeur.

```jsx
// Parent.jsx
import { useState } from 'react';
import Child from './Child';

export default function Parent() {
  const [value, setValue] = useState('');

  return (
    <Child value={value} onChange={setValue} />
  );
}

// Child.jsx
export default function Child({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

## Variantes utiles
- `onSelect(id)` pour une selection.
- `onSubmit(payload)` pour un formulaire.
- `onToggle(isOpen)` pour un etat booleen.

## Bonnes pratiques
- Garder la logique metier dans le parent.
- L'enfant ne fait que notifier.
- Utiliser `useCallback` si l'enfant est memoise.

## Exemple projet
- La selection de declinaison dans la fiche produit met a jour l'evolution du stock.
