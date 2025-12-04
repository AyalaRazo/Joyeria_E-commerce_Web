import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

const loadFacebookPixel = () => {
  const pixelId = import.meta.env.VITE_FB_PIXEL_ID;
  
  if (!pixelId) {
    console.warn('Facebook Pixel ID no encontrado');
    return;
  }

  // Script principal
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  // Fallback para usuarios sin JavaScript
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `
    <img height="1" width="1" style="display:none" 
      src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" 
    />
  `;
  document.body.appendChild(noscript);
};

const queryClient = new QueryClient();

// Cargar el Pixel solo en el cliente
if (typeof window !== 'undefined') {
  loadFacebookPixel();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);