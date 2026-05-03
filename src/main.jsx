import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './navbar';
import HomePage from './pages/HomePage';
import DepotPage from './pages/DepotPage';
import EtagePage from './pages/EtagePage';
import SearchPage from './pages/SearchPage';
import './globals.css';
import './index.css';

const Layout = () => (
  <>
    <Outlet />
    <Navbar />
  </>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/depot/:depotId" element={<DepotPage />} />
          <Route path="/depot/:depotId/etage/:etageId" element={<EtagePage />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
