
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registro do Service Worker para PWA (Apenas em origens seguras e fora de sandbox)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    /**
     * Detecção aprimorada de sandbox e ambientes de desenvolvimento.
     * Em ambientes como AI Studio, o hostname (ex: usercontent.goog) difere da base (ai.studio),
     * causando erro de "origin mismatch" ao tentar registrar o sw.js relativo.
     */
    const isSandbox = 
      window.location.hostname.includes('goog') || 
      window.location.hostname.includes('ai.studio') ||
      window.location.hostname.includes('scf.usercontent') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol !== 'https:';
    
    if (!isSandbox) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker registrado com sucesso no escopo:', reg.scope);
        })
        .catch(err => {
          console.error('Falha ao registrar Service Worker:', err);
        });
    } else {
      console.log('Service Worker ignorado: Ambiente de sandbox, local ou inseguro detectado (evitando Origin Mismatch).');
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
