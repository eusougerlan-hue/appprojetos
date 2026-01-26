
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Para resolver o erro de "origin mismatch" no AI Studio, construímos a URL
    // explicitamente a partir da localização da janela atual.
    try {
      const swUrl = new URL('sw.js', window.location.href);
      // Usar o pathname absoluto garante que o registro ocorra na origem do sandbox
      const swPath = swUrl.pathname;
      
      navigator.serviceWorker.register(swPath)
        .then(reg => {
          console.log('Service Worker registrado com sucesso no escopo:', reg.scope);
        })
        .catch(err => {
          console.error('Falha ao registrar Service Worker (Tentativa 1):', err);
          // Fallback para caminho relativo simples caso a estrutura de pastas seja diferente
          navigator.serviceWorker.register('sw.js').catch(e => {
            console.error('Falha crítica no Service Worker:', e);
          });
        });
    } catch (e) {
      console.error('Erro na construção da URL do Service Worker:', e);
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
