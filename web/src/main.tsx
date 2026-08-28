import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Store from './store/Store'
import Admin from './admin/Admin'
import Privacy from './legal/Privacy'
import Terms from './legal/Terms'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dat-hang" replace />} />
        <Route path="/dat-hang" element={<Store />} />
        <Route path="/quan-tri" element={<Admin />} />
        {/* Hai trang pháp lý: địa chỉ khai vào bản khai báo ứng dụng Teams. */}
        <Route path="/quyen-rieng-tu" element={<Privacy />} />
        <Route path="/dieu-khoan-su-dung" element={<Terms />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
