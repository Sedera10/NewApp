import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from './pages/frontoffice/home/HomePage'
import ProductsPage from './pages/frontoffice/product/ProductsPage'
import ProductDetails from './pages/frontoffice/product/ProductDetails'
import CartPage from './pages/frontoffice/cart/CartPage'
import CheckoutPage from './pages/frontoffice/checkout/CheckoutPage'
import CommandePage from './pages/frontoffice/commande/Commande'
import CommandeDetail from './pages/frontoffice/commande/CommandeDetail'
import Login from './pages/backoffice/login/Login'
import ImportPage from './pages/backoffice/importFix/ImportPage'
import LogOut from './pages/backoffice/login/LogOut'
import ResetDataPage from './pages/backoffice/reset/ResetDataPage'
import StockPage from './pages/backoffice/stock/StockPage'
import ProductFiche from './pages/backoffice/product/ProductFiche'
import CommandePageAdmin from './pages/backoffice/commande/Commande'
import Dashboard from './pages/backoffice/dashboard/Dashboard'
import StatsPage from './pages/backoffice/stats/StatsPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './pages/backoffice/layout/Layout'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/mystore/fr" replace/>} />
        <Route path="/mystore" element={<Navigate to="/mystore/fr" replace/>} />
        <Route path="/mystore/fr" element={<HomePage />} />
        <Route path="/mystore/fr/products" element={<ProductsPage />} />
        <Route path="/mystore/fr/product/:id" element={<ProductDetails />} />
        <Route path="/mystore/fr/cart" element={<CartPage />} />
        <Route path="/mystore/fr/checkout" element={<CheckoutPage />} />
        <Route path="/mystore/fr/commandes" element={<CommandePage />} />
        <Route path="/mystore/fr/commandes/:orderId" element={<CommandeDetail />} />
        <Route path="/mystore/fr/login"element={<Login />} />
        {/* Backoffice */}
        <Route path="/mystore/admin/login" element={<Login />} />
        <Route path="/mystore/admin" element={<Layout/>}>
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
            element={
              <ProtectedRoute>
                <ImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mystore/admin/dashboard"
            index
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mystore/admin/statistiques"
            element={
              <ProtectedRoute>
                <StatsPage />
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
            path="/mystore/admin/stock"
            element={
              <ProtectedRoute>
                <StockPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mystore/admin/stock/:id"
            element={
              <ProtectedRoute>
                <ProductFiche />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mystore/admin/commandes"
            element={
              <ProtectedRoute>
                <CommandePageAdmin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>

    </BrowserRouter>
  )
}

export default App
