import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import PrivacidadePage from './PrivacidadePage.tsx';
import TermosPage from './TermosPage.tsx';
import AdminApp from './admin/AdminApp.tsx';
import { PainelApp } from './painel/PainelApp.tsx';
import { ClienteApp } from './cliente/ClienteApp.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/privacidade" element={<PrivacidadePage />} />
        <Route path="/termos" element={<TermosPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/painel/*" element={<PainelApp />} />
        <Route path="/cliente/*" element={<ClienteApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
