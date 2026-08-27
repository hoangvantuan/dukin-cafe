import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Store from './store/Store'
import Admin from './admin/Admin'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dat-hang" replace />} />
        <Route path="/dat-hang" element={<Store />} />
        <Route path="/quan-tri" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
