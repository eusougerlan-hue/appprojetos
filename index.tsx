
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registro do Service Worker para PWA com caminho relativo para evitar erros de origem
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Usamos './sw.js' em vez de '/sw.js' para garantir que o script seja buscado no diretório atual
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registrado com sucesso no escopo:', reg.scope);
      })
      .catch(err => {
        console.error('Falha ao registrar Service Worker:', err);
      });
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
