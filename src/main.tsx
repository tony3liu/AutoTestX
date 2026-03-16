/**
 * React Application Entry Point
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/globals.css';
import { initializeDefaultTransports } from './lib/api-client';
import { initHostApi } from './lib/host-api';

initializeDefaultTransports();
void initHostApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
