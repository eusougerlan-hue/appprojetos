
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registro do Service Worker para PWA (Apenas em origens seguras e fora de sandbox)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Evita erro de origin mismatch em sandboxes do Google/AI Studio
    const isSandbox = window.location.hostname.includes('goog') || window.location.hostname === 'localhost';
    
    if (!isSandbox) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker registrado com sucesso no escopo:', reg.scope);
        })
        .catch(err => {
          console.error('Falha ao registrar Service Worker:', err);
        });
    } else {
      console.log('Service Worker ignorado neste ambiente de desenvolvimento/sandbox.');
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
