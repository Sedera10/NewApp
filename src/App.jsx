import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from './pages/frontoffice/home/HomePage'
import ProductDetails from './pages/frontoffice/product/ProductDetails'
import CartPage from './pages/frontoffice/cart/CartPage'
import CheckoutPage from './pages/frontoffice/checkout/CheckoutPage'
import Login from './pages/backoffice/login/Login'
import ImportPage from './pages/backoffice/import/ImportPage'
import LogOut from './pages/backoffice/login/LogOut'
import ResetDataPage from './pages/backoffice/reset/ResetDataPage'
import CommandePage from './pages/backoffice/commande/Commande'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './pages/backoffice/layout/Layout'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/mystore/fr" replace/>} />
        <Route path="/mystore/fr"element={<HomePage />} />
        <Route path="/mystore/fr/product/:id" element={<ProductDetails />} />
        <Route path="/mystore/fr/cart" element={<CartPage />} />
        <Route path="/mystore/fr/checkout" element={<CheckoutPage />} />
        <Route path="/mystore/fr/login"element={<Login />} />
        {/* Backoffice */}
        <Route path="/mystore/admin/login" element={<Login />} />
        <Route path="/mystore/admin" element={<Layout />}>
          {/* Routes protégées */}
          <Route
            path="/mystore/admin/logout"
            element={
              <ProtectedRoute>
                <LogOut />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mystore/admin/import"
            index element={
              <ProtectedRoute>
                <ImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mystore/admin/reset"
            element={
              <ProtectedRoute>
                <ResetDataPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mystore/admin/commandes"
            element={
              <ProtectedRoute>
                <CommandePage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>

    </BrowserRouter>
  )
}

export default App
