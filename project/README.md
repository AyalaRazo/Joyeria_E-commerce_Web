## Configuración

### 1. Variables de Entorno

Archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_FUNCTIONS_URL
VITE_FB_PIXEL_ID
```

### 2. Instalación de Dependencias

```bash
npm install
```

### 3. Ejecutar el Proyecto

```bash
npm run dev
```

## Estructura del Proyecto

### Tablas de Supabase

El proyecto está configurado para trabajar con las siguientes tablas principales:

## Usuarios y Autenticación

- `auth.users` Usuarios autenticados (Supabase Auth)
- `user_profiles` Información extendida del usuario
- `user_roles` Roles de usuario (customer, admin)
- `user_addresses` Direcciones de envío

---

## Catálogo de Productos

- `categories` Categorías de productos
- `products` Productos principales
- `product_variants` Variantes de producto (metal, talla, quilataje, stock)
- `metal_types` Tipos de metal
- `product_images` Imágenes de producto
- `variant_images` Imágenes por variante
- `reviews` Reseñas de productos

El catálogo soporta productos de alto valor, garantías y reglas especiales de envío.

---

## Inventario y Reservas

- `reservations` Sistema de reservas temporales para evitar sobreventa durante el checkout

---

## Carrito y Favoritos

- `carts` Carrito de compras por usuario
- `cart_items` Productos en el carrito
- `favorites` Productos marcados como favoritos
- `cart_reminders` Recordatorios de carrito abandonado

---

## Órdenes y Pagos

- `orders` Órdenes de compra
- `order_items` Detalle de productos comprados
- `transactions` Transacciones de pago con Stripe
- `checkout_quotes` Cotizaciones de envío durante el checkout

El sistema soporta pagos confirmados, pendientes y reembolsos parciales o totales.

---

## Envíos y Logística

- `shipping_providers` Proveedores de envío
- `couriers` Paqueterías
- `shipping_packages` Tipos de paquetes
- `shipping_labels` Etiquetas de envío generadas

Incluye cálculo de peso volumétrico, seguros de envío y soporte para productos que requieren manejo especial.

---

## Devoluciones y Post-venta

- `returns` Solicitudes de devolución
- `return_items` Productos devueltos

Soporta devoluciones parciales, reembolsos vía Stripe y seguimiento administrativo.

---

## Marketing y Comunicación

- `interested_clients` Leads y suscriptores de newsletter
- `emails` Historial de correos enviados

---

## Hooks Principales

- `useAuth` Manejo de autenticación y sesión
- `useProducts` Catálogo y variantes
- `useCart` Carrito, stock y reservas
- `useOrders` Órdenes, pagos y devoluciones

---

## Componentes Principales

- `Header` Navegación y acceso al carrito
- `AuthModal` Login y registro
- `ProductGrid` Listado de productos
- `ProductPage` Página de detalle de producto
- `Cart` Carrito de compras
- `Checkout` Proceso de checkout

---

## Funcionalidades

- Autenticación de usuarios y roles
- Catálogo con variantes avanzadas
- Gestión de stock y reservas
- Carrito persistente
- Checkout con cotización de envío
- Pagos con Stripe
- Gestión de órdenes
- Envíos con seguro
- Reseñas de productos
- Devoluciones parciales
- Newsletter y sistema de emails
- Búsqueda y filtros
- Diseño responsive

---

## Tecnologías

- React 18
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- Lucide React
- React Router DOM
- TanStack Query 
