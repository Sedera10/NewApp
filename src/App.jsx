import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from './pages/frontoffice/home/HomePage'
import Login from './pages/backoffice/login/Login'
import ImportPage from './pages/backoffice/import/ImportPage'
import LogOut from './pages/backoffice/login/LogOut'
import ResetDataPage from './pages/backoffice/reset/ResetDataPage' // Nouvelle page
import ProtectedRoute from './components/auth/ProtectedRoute' // Import du composant de protection

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/mystore/fr" replace/>} />
        <Route path="/mystore/fr"element={<HomePage />} />
        <Route path="/mystore/fr/login"element={<Login />} />
        {/* Backoffice */}
        <Route path="/mystore/admin" element={<Login />} />
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
          path="/mystore/admin/reset" 
          element={
            <ProtectedRoute>
              <ResetDataPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
      
    </BrowserRouter>
  )
}

export default App
