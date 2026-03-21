import { useEffect } from 'react';

const SITE_NAME = 'D Luxury Black';
const BASE_URL = 'https://dluxuryblack.com';
const DEFAULT_IMAGE = `${BASE_URL}/images/hero-jewelry.jpg`;
const DEFAULT_DESCRIPTION =
  'Joyería artesanal de alta calidad en Tijuana y Mexicali. Anillos, collares, pulseras, aretes y diamantes con garantía. Envío seguro a todo México.';

interface SEOOptions {
  title?: string;           // Sin el sufijo "| D Luxury Black", se agrega automáticamente
  description?: string;
  image?: string;           // URL absoluta o relativa a la raíz del sitio
  path?: string;            // Ruta relativa, ej: "/producto/123"
  type?: 'website' | 'product';
  schema?: object | null;   // JSON-LD adicional inyectado dinámicamente
}

function setMeta(selector: string, content: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    // Derivar el atributo correcto del selector
    if (selector.startsWith('meta[property=')) {
      el.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] ?? '');
    } else {
      el.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] ?? '');
    }
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function setDynamicSchema(data: object | null) {
  const id = 'seo-dynamic-schema';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * useSEO — actualiza title, meta description, Open Graph, Twitter Card y JSON-LD
 * dinámicamente en cada página de la SPA.
 *
 * Uso:
 *   useSEO({ title: 'Anillo de Oro', description: '...', path: '/producto/42' });
 */
export function useSEO({ title, description, image, path, type = 'website', schema }: SEOOptions = {}) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const pageDesc = description ?? DEFAULT_DESCRIPTION;
    const pageImage = image
      ? image.startsWith('http') ? image : `${BASE_URL}${image}`
      : DEFAULT_IMAGE;
    const pageUrl = path ? `${BASE_URL}${path}` : BASE_URL;

    // <title>
    document.title = pageTitle;

    // Canonical
    setCanonical(pageUrl);

    // Primary meta
    setMeta('meta[name="description"]', pageDesc);

    // Open Graph
    setMeta('meta[property="og:title"]', pageTitle);
    setMeta('meta[property="og:description"]', pageDesc);
    setMeta('meta[property="og:image"]', pageImage);
    setMeta('meta[property="og:url"]', pageUrl);
    setMeta('meta[property="og:type"]', type);

    // Twitter Card
    setMeta('meta[name="twitter:title"]', pageTitle);
    setMeta('meta[name="twitter:description"]', pageDesc);
    setMeta('meta[name="twitter:image"]', pageImage);

    // JSON-LD dinámico
    setDynamicSchema(schema ?? null);

    return () => {
      // Resetear al desmontar para que el siguiente render parta limpio
      document.title = SITE_NAME;
      setDynamicSchema(null);
    };
  }, [title, description, image, path, type, schema]);
}
