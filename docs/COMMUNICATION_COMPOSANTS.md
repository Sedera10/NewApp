# 📡 Guide Complet : Passage de Données entre Composants React

## 📋 Table des matières
1. [Parent → Enfant (Props)](#1-parent--enfant-props)
2. [Enfant → Parent (Callbacks)](#2-enfant--parent-callbacks)
3. [Props + State Lifting](#3-props--state-lifting)
4. [Context API](#4-context-api)
5. [URL Params](#5-url-params)
6. [Local Storage](#6-local-storage)
7. [Tableau Récapitulatif](#-tableau-récapitulatif)
8. [Cas Pratiques](#-cas-pratiques)

---

## 1. Parent → Enfant (Props)

### Utilisation
- ✅ Passer des **données simples** du parent à l'enfant
- ✅ Configuration, paramètres, valeurs
- ✅ **Direction unique** (unidirectionnelle)

### Exemple
```jsx
// Parent.jsx
export default function Parent() {
  const userName = 'John';
  const userAge = 25;

  return (
    <Child name={userName} age={userAge} />
  );
}

// Child.jsx
export default function Child({ name, age }) {
  return (
    <div>
      <p>Nom: {name}</p>
      <p>Âge: {age}</p>
    </div>
  );
}
```

### Avantages
- 🟢 Très simple et intuitif
- 🟢 Performance bonne
- 🟢 Facile à debugger

### Inconvénients
- 🔴 Unidirectionnel seulement
- 🔴 Pas de retour d'information

---

## 2. Enfant → Parent (Callbacks)

### Utilisation
- ✅ Enfant **envoie des données** au parent
- ✅ Notifier le parent d'un événement
- ✅ Modifier l'état du parent depuis l'enfant

### Exemple
```jsx
// Parent.jsx
import { useState } from 'react';
import Child from './Child';

export default function Parent() {
  const [message, setMessage] = useState('Pas de message');

  // Fonction callback que l'enfant va appeler
  const handleChildClick = (dataFromChild) => {
    setMessage(dataFromChild);
  };

  return (
    <div>
      <p>Message du parent: {message}</p>
      {/* Passer la fonction en prop */}
      <Child onSendMessage={handleChildClick} />
    </div>
  );
}

// Child.jsx
export default function Child({ onSendMessage }) {
  return (
    <button onClick={() => onSendMessage('Bonjour du enfant!')}>
      Envoyer un message au parent
    </button>
  );
}
```

### Avantages
- 🟢 Enfant peut communiquer avec le parent
- 🟢 Parent garde le contrôle de l'état
- 🟢 Simple et reactif

### Inconvénients
- 🔴 Besoin d'une fonction callback
- 🔴 Communication limitée à parent direct

---

## 3. Props + State Lifting

### Utilisation
- ✅ Composants **avec parent commun**
- ✅ Communication **enfant → parent → enfant**
- ❌ Pas idéal pour les composants loin dans l'arborescence

### Exemple
```jsx
// Parent.jsx
import { useState } from 'react';
import ComponentA from './ComponentA';
import ComponentB from './ComponentB';

export default function Parent() {
  const [sharedData, setSharedData] = useState('');

  return (
    <>
      {/* ComponentA envoie les données */}
      <ComponentA onSendData={setSharedData} />
      {/* ComponentB reçoit les données */}
      <ComponentB data={sharedData} />
    </>
  );
}

// ComponentA.jsx
export default function ComponentA({ onSendData }) {
  return (
    <button onClick={() => onSendData('Bonjour de A')}>
      Envoyer données
    </button>
  );
}

// ComponentB.jsx
export default function ComponentB({ data }) {
  return <p>{data}</p>;
}
```

### Avantages
- 🟢 Très simple
- 🟢 React way classique
- 🟢 Pas de dépendances externes

### Inconvénients
- 🔴 "Prop drilling" si nombreux niveaux
- 🔴 Parent doit gérer l'état

---

## 4. Context API

### Utilisation
- ✅ Composants **sans parent commun**
- ✅ Partage de **données globales** (utilisateur, thème, etc.)
- ✅ **Structure Outlet** (Router avec Outlet)
- ✅ Évite le "prop drilling"

### Quand l'utiliser
- Données **globales** (utilisateur, thème)
- Structure **Outlet** (Router)
- Éviter le "prop drilling"

### Exemple Simple
```jsx
// DataContext.jsx
import { createContext, useState } from 'react';

export const DataContext = createContext();

export function DataProvider({ children }) {
  const [data, setData] = useState('');

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
}

// ComponentA.jsx
import { useContext } from 'react';
import { DataContext } from './DataContext';

export default function ComponentA() {
  const { setData } = useContext(DataContext);

  return (
    <button onClick={() => setData('Message de A')}>
      Envoyer
    </button>
  );
}

// ComponentB.jsx
import { useContext } from 'react';
import { DataContext } from './DataContext';

export default function ComponentB() {
  const { data } = useContext(DataContext);
  return <p>{data}</p>;
}

// App.jsx - Envelopper avec le Provider
<DataProvider>
  <ComponentA />
  <ComponentB />
</DataProvider>
```

### Cas d'usage : Structure Outlet

```jsx
// Layout.jsx avec Router
import { Outlet } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import Header from './components/Header';

export default function Layout() {
  return (
    <DataProvider>
      <div>
        <Header />  {/* Peut accéder au context */}
        <Outlet />  {/* Profile ou autres pages peuvent aussi accéder */}
      </div>
    </DataProvider>
  );
}

// Profile.jsx (sous Outlet)
import { useContext } from 'react';
import { DataContext } from './context/DataContext';

export default function Profile() {
  const { setData } = useContext(DataContext);

  return (
    <button onClick={() => setData('Données du profil')}>
      Mettre à jour
    </button>
  );
}

// Header.jsx
import { useContext } from 'react';
import { DataContext } from './context/DataContext';

export default function Header() {
  const { data } = useContext(DataContext);
  return <h1>{data}</h1>;
}
```

### Avantages
- 🟢 Pas de parent commun requis
- 🟢 Parfait pour les données globales
- 🟢 Évite le "prop drilling"
- 🟢 Idéal pour les structures avec Outlet

### Inconvénients
- 🔴 Plus de code
- 🔴 Context != State management (pour gros projets, utiliser Redux)

---

## 5. URL Params

### Utilisation
- ✅ Passer des données **via l'URL**
- ✅ Données qui doivent être **bookmarkable**
- ✅ Communication **entre pages**

### Exemple
```jsx
// ComponentA.jsx
import { useNavigate } from 'react-router-dom';

export default function ComponentA() {
  const navigate = useNavigate();

  return (
    <>
      {/* Query params */}
      <button onClick={() => navigate('/profile?username=john&age=25')}>
        Vers Profile
      </button>

      {/* Route params */}
      <button onClick={() => navigate(`/product/123`)}>
        Vers Produit
      </button>
    </>
  );
}

// ComponentB.jsx - Lire les données
import { useSearchParams, useParams } from 'react-router-dom';

export default function ComponentB() {
  // Query params : ?username=john&age=25
  const [params] = useSearchParams();
  const username = params.get('username');
  const age = params.get('age');

  // Route params : /product/:id
  const { id } = useParams();

  return (
    <div>
      <p>Utilisateur: {username}</p>
      <p>Age: {age}</p>
      <p>Produit ID: {id}</p>
    </div>
  );
}

// Routes
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/profile" element={<ComponentB />} />
      <Route path="/product/:id" element={<ComponentB />} />
    </Routes>
  );
}
```

### Avantages
- 🟢 Bookmarkable
- 🟢 Partageable (URL complète)
- 🟢 Historique navigateur

### Inconvénients
- 🔴 Données visibles dans l'URL
- 🔴 Pas idéal pour données sensibles
- 🔴 Limitation de longueur

---

## 6. Local Storage

### Utilisation
- ✅ Garder les données après **refresh**
- ✅ Persistance **client-side**
- ✅ Données qui ne changent pas souvent

### Exemple
```jsx
// ComponentA.jsx
export default function ComponentA() {
  const handleSave = () => {
    const data = {
      username: 'john',
      preferences: { theme: 'dark' }
    };
    // Sauvegarder comme JSON
    localStorage.setItem('userData', JSON.stringify(data));
  };

  return <button onClick={handleSave}>Sauvegarder</button>;
}

// ComponentB.jsx
import { useEffect, useState } from 'react';

export default function ComponentB() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) {
      setUserData(JSON.parse(stored));
    }
  }, []);

  return <p>{userData?.username}</p>;
}
```

### Avantages
- 🟢 Persiste après fermeture/refresh
- 🟢 Très simple à utiliser
- 🟢 Pas de backend requis

### Inconvénients
- 🔴 Limité en espace (~5-10MB)
- 🔴 Client-side uniquement
- 🔴 Pas synchronisé entre onglets automatiquement

---

## 📊 Tableau Récapitulatif

| Cas d'usage | Méthode | Complexité | Quand l'utiliser |
|-------------|---------|-----------|------------------|
| Parent → Enfant | Props | ⭐ Simple | Passer des données au child |
| Enfant → Parent | Callbacks | ⭐ Simple | Enfant notifie le parent |
| Bidirectionnel Parent ↔ Enfant | Props + State Lifting | ⭐ Simple | Petit arbre de composants |
| Composants sans lien | Context API | ⭐⭐ Moyen | Données globales, Outlet structure |
| Via l'URL | useParams / useSearchParams | ⭐⭐ Moyen | Navigation, shareable data |
| Persistance | Local Storage | ⭐ Simple | Préférences, données locales |
| Très complexe | Redux / Zustand | ⭐⭐⭐ Expert | Grand projet, logique complexe |

---

## 💡 Cas Pratiques

### Cas 1 : Breadcrumb Dynamique dans le Header
**Structure** : Header + Outlet (Dashboard, Profile, etc.)

```jsx
// BreadcrumbContext.jsx
import { createContext, useState } from 'react';

export const BreadcrumbContext = createContext();

export function BreadcrumbProvider({ children }) {
  const [breadcrumb, setBreadcrumb] = useState({
    path: 'Pages / Dashboard',
    title: 'Dashboard'
  });

  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// Layout.jsx
import { BreadcrumbProvider } from './context/BreadcrumbContext';

export default function Layout() {
  return (
    <BreadcrumbProvider>
      <div>
        <Header /> {/* Lit le breadcrumb */}
        <Outlet />  {/* Dashboard/Profile définit le breadcrumb */}
      </div>
    </BreadcrumbProvider>
  );
}

// Header.jsx
import { useContext } from 'react';
import { BreadcrumbContext } from './context/BreadcrumbContext';

export default function Header() {
  const { breadcrumb } = useContext(BreadcrumbContext);

  return (
    <nav>
      <span>{breadcrumb.path}</span>
      <h6>{breadcrumb.title}</h6>
    </nav>
  );
}

// Dashboard.jsx (sous Outlet)
import { useEffect, useContext } from 'react';
import { BreadcrumbContext } from './context/BreadcrumbContext';

export default function Dashboard() {
  const { setBreadcrumb } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumb({
      path: 'Pages / Dashboard',
      title: 'Dashboard'
    });
  }, [setBreadcrumb]);

  return <div>Contenu Dashboard</div>;
}
```

### Cas 2 : Profil Utilisateur (Profile → Header)
```jsx
// ProfileContext.jsx
import { createContext, useState } from 'react';

export const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState({
    username: '',
    avatar: '',
    email: ''
  });

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

// Layout.jsx - Ajouter le Provider
<ProfileProvider>
  <div>
    <Header />
    <Outlet />
  </div>
</ProfileProvider>

// Profile.jsx - Met à jour le profil
const { setProfile } = useContext(ProfileContext);

// Header.jsx - Affiche le profil
const { profile } = useContext(ProfileContext);
```

### Cas 3 : Naviguer vers détail d'un produit
```jsx
// ProductList.jsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate(`/product/${productId}`);

// ProductDetail.jsx
import { useParams } from 'react-router-dom';

const { id } = useParams();
```

---

## 🎯 Recommandations

| Situation | Recommandation |
|-----------|---|
| Passer une valeur au child | **Props (Parent → Enfant)** |
| Enfant notifie le parent | **Callbacks (Enfant → Parent)** |
| Petit projet, composants proches | **Props + State Lifting** |
| Outlet + données globales | **Context API** |
| Besoin de persistance | **Local Storage** |
| URL bookmarkable | **URL Params** |
| Très gros projet complexe | **Redux / Zustand** |

---

## 📚 Résumé Quick Reference

```jsx
// 1. Parent → Enfant (Props)
<Child data={myData} />

// 2. Enfant → Parent (Callbacks)
<Child onEvent={(data) => setParentState(data)} />

// 3. Bidirectionnel (Controlled Component)
<Input value={state} onChange={(e) => setState(e.target.value)} />

// 4. Context
const { data } = useContext(MyContext);

// 5. URL
useSearchParams() / useParams()

// 6. Local Storage
localStorage.setItem('key', JSON.stringify(data));
```

---

*Créé le 4 Mai 2026*
