**English**

You can view the webpage of this project at: https://joyeria-e-commerce-web.vercel.app/

# 💍 Jewelry E-commerce Store

This project implements a modern e-commerce platform built with **React, TypeScript, Vite, and Supabase** for selling jewelry products.  
The system includes a complete **shopping cart**, **secure payments via Stripe**, **user authentication**, and **real-time synchronization** with a **PostgreSQL** database.

---

### ✨ Features
- Modern **React + TypeScript** frontend with **Tailwind CSS**.
- Fully functional e-commerce solution:
  - Product catalog with variants and categories.
  - Shopping cart with quantity adjustment and item removal.
  - User authentication and authorization.
  - Secure payment processing with **Stripe** integration.
- **Supabase backend** with PostgreSQL database.
- Real-time cart synchronization between JSON storage and relational tables.
- Responsive design optimized for desktop and mobile.
- **Meta Pixel** integration for analytics and conversion tracking.
- **Admin panel** for product and order management.

---

### 🛠️ Technologies

- Frontend: React 18, TypeScript, Tailwind CSS, React Router
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- Payments: Stripe Checkout
- Tools: Vite, ESLint, Meta Pixel

---

### 📑 Supabase Database Schema
```bash
-- Addresses
create table public.addresses (
  id bigserial primary key,
  user_id uuid null references auth.users (id),
  name varchar(255),
  address_line1 varchar(255),
  address_line2 varchar(255),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100),
  phone varchar(30),
  created_at timestamptz default now(),
  order_id bigint null references orders (id) on update cascade on delete cascade
);

-- Carts
create table public.carts (
  user_id uuid primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  items json
);

-- Cart Items
create table public.cart_items (
  id bigserial primary key,
  cart_user_id uuid references carts (user_id) on delete cascade,
  product_id bigint references products (id) on delete cascade,
  variant_id bigint references product_variants (id),
  quantity integer not null default 1,
  price numeric(10,2) not null,
  added_at timestamptz default now()
);

-- Categories
create table public.categories (
  id serial primary key,
  name varchar(100) not null,
  description text
);

-- Products
create table public.products (
  id bigserial primary key,
  name varchar(255) not null,
  price numeric(10,2) not null,
  original_price numeric(10,2),
  image varchar(500) not null,
  description text,
  material varchar(255),
  in_stock boolean default true,
  is_new boolean default false,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  category_id int not null references categories (id),
  stock int default 0
);

-- Product Variants
create table public.product_variants (
  id bigserial primary key,
  product_id bigint references products (id) on delete cascade,
  name varchar(100) not null,
  price numeric(10,2) not null,
  image varchar(500),
  model varchar,
  size varchar,
  stock int default 0,
  original_price numeric
);

-- Orders
create table public.orders (
  id bigserial primary key,
  user_id uuid references auth.users (id),
  total numeric(10,2) not null,
  status varchar(50) default 'pending',
  created_at timestamptz default now(),
  tracking_code varchar(100),
  updated_at timestamptz default now()
);

-- Order Items
create table public.order_items (
  id bigserial primary key,
  order_id bigint references orders (id) on delete cascade,
  product_id bigint references products (id),
  variant_id bigint references product_variants (id),
  quantity int not null default 1,
  price numeric(10,2) not null
);

-- Reviews
create table public.reviews (
  id bigserial primary key,
  product_id bigint references products (id) on delete cascade,
  user_id uuid not null,
  user_name varchar(255) not null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Interested Clients
create table public.interested_clients (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  interests text[] default array[]::text[],
  created_at timestamptz default now(),
  is_subscribed boolean default true,
  metadata jsonb,
  unsubscribe_token text unique default gen_random_uuid()
);

-- Emails
create table public.emails (
  id bigint generated always as identity primary key,
  to_email text not null,
  from_email text not null,
  subject text not null,
  html_content text not null,
  status text default 'pending',
  created_at timestamptz default now(),
  sent_at timestamptz
);
```

---

### API Keys Used in the Backend

<img aling=center width="336" height="508" alt="image" src="https://github.com/user-attachments/assets/70c25074-c0e7-4f04-b767-8c51779b34b2" />

---

### Installation

```env
# Clone repository
git clone https://github.com/your-user/jewelry-ecommerce.git
cd jewelry-ecommerce/project

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit `.env` with your Supabase credentials

# Run the proyect and access at the localhost
npm run dev
```

<a href="#"><img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif"></a>

**Español**

Puedes ver como quedo la Pagina Web de este proyecto en: https://joyeria-e-commerce-web.vercel.app/

# 💍 Tienda Online de Joyería

Este proyecto implementa una plataforma de comercio electrónico moderna construida con **React, TypeScript, Vite y Supabase** para la venta de productos de joyería.  
El sistema incluye un **carrito de compras completo**, **pagos seguros vía Stripe**, **autenticación de usuarios** y **sincronización en tiempo real** con una base de datos **PostgreSQL**.

---

### ✨ Características
- Frontend moderno con **React + TypeScript** y **Tailwind CSS**.
- Solución de e-commerce completamente funcional:
  - Catálogo de productos con variantes y categorías.
  - Carrito de compras con ajuste de cantidades y eliminación de productos.
  - Autenticación y autorización de usuarios.
  - Procesamiento seguro de pagos con integración de **Stripe**.
- **Backend con Supabase** y base de datos PostgreSQL.
- Sincronización en tiempo real del carrito entre almacenamiento JSON y tablas relacionales.
- Diseño responsivo optimizado para escritorio y móviles.
- Integración de **Meta Pixel** para análisis y seguimiento de conversiones.
- **Panel de administración** para gestión de productos y órdenes.

---

### 🛠️ Tecnologías Utilizadas

- Frontend: React 18, TypeScript, Tailwind CSS, React Router
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- Pagos: Stripe Checkout
- Herramientas: Vite, ESLint, Meta Pixel

---

### 📑 Esquema de Base de Datos en Supabase

```bash
-- Direcciones de envío de los usuarios
create table public.addresses (
  id bigserial primary key,
  user_id uuid null references auth.users (id),
  name varchar(255),
  address_line1 varchar(255),
  address_line2 varchar(255),
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100),
  phone varchar(30),
  created_at timestamptz default now(),
  order_id bigint null references orders (id) on update cascade on delete cascade
);

-- Carritos de compra de cada usuario
create table public.carts (
  user_id uuid primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  items json
);

-- Items dentro de cada carrito
create table public.cart_items (
  id bigserial primary key,
  cart_user_id uuid references carts (user_id) on delete cascade,
  product_id bigint references products (id) on delete cascade,
  variant_id bigint references product_variants (id),
  quantity integer not null default 1,
  price numeric(10,2) not null,
  added_at timestamptz default now()
);

-- Categorías de productos (ejemplo: anillos, collares, pulseras)
create table public.categories (
  id serial primary key,
  name varchar(100) not null,
  description text
);

-- Productos principales
create table public.products (
  id bigserial primary key,
  name varchar(255) not null,
  price numeric(10,2) not null,
  original_price numeric(10,2),
  image varchar(500) not null,
  description text,
  material varchar(255),
  in_stock boolean default true,
  is_new boolean default false,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  category_id int not null references categories (id),
  stock int default 0
);

-- Variantes de productos (ejemplo: diferentes tallas, modelos o precios)
create table public.product_variants (
  id bigserial primary key,
  product_id bigint references products (id) on delete cascade,
  name varchar(100) not null,
  price numeric(10,2) not null,
  image varchar(500),
  model varchar,
  size varchar,
  stock int default 0,
  original_price numeric
);

-- Órdenes de compra
create table public.orders (
  id bigserial primary key,
  user_id uuid references auth.users (id),
  total numeric(10,2) not null,
  status varchar(50) default 'pendiente',
  created_at timestamptz default now(),
  tracking_code varchar(100),
  updated_at timestamptz default now()
);

-- Detalles de los productos en cada orden
create table public.order_items (
  id bigserial primary key,
  order_id bigint references orders (id) on delete cascade,
  product_id bigint references products (id),
  variant_id bigint references product_variants (id),
  quantity int not null default 1,
  price numeric(10,2) not null
);

-- Reseñas y calificaciones de productos
create table public.reviews (
  id bigserial primary key,
  product_id bigint references products (id) on delete cascade,
  user_id uuid not null,
  user_name varchar(255) not null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

-- Clientes interesados (para marketing o newsletters)
create table public.interested_clients (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  interests text[] default array[]::text[],
  created_at timestamptz default now(),
  is_subscribed boolean default true,
  metadata jsonb,
  unsubscribe_token text unique default gen_random_uuid()
);

-- Correos enviados desde el sistema
create table public.emails (
  id bigint generated always as identity primary key,
  to_email text not null,
  from_email text not null,
  subject text not null,
  html_content text not null,
  status text default 'pendiente',
  created_at timestamptz default now(),
  sent_at timestamptz
);
```

---

### API Keys Usadas en el Backend

<img width="336" height="508" alt="image" src="https://github.com/user-attachments/assets/18accde4-56c9-4c1f-a825-a9b5189ecd03" />

---

### 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/joyeria-ecommerce.git
cd joyeria-ecommerce/project

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar `.env` con tus credenciales de Supabase

# Ejecutar el proyecto y acceder en localhost
npm run dev
```

# Images

<div align=center >
  <img width="1676" height="916" alt="image" src="https://github.com/user-attachments/assets/ac9bc89d-7111-4bd7-80a8-82edba0b79a1" />

  #

  <img width="1679" height="965" alt="image" src="https://github.com/user-attachments/assets/28a3e960-db51-4ab3-8aa7-92bc9916a38e" />

  #

  <img width="1677" height="963" alt="image" src="https://github.com/user-attachments/assets/92c747a4-a034-491c-85b8-2b817be55b05" />

  #

  <img width="1678" height="965" alt="image" src="https://github.com/user-attachments/assets/b280486b-9dd3-4882-87b0-ada1de60982c" />

  #

  <img width="1677" height="855" alt="image" src="https://github.com/user-attachments/assets/56dc6714-56af-4ebc-918a-776da23bcebb" />

  
  #
  
  <img width="1677" height="965" alt="image" src="https://github.com/user-attachments/assets/e7b24663-8d82-4162-9e94-959df91ad82b" />

  #

  <img width="1677" height="971" alt="image" src="https://github.com/user-attachments/assets/76eaa535-3bb9-49a4-ab08-669b6e38b924" />

  #

  <img width="1677" height="953" alt="image" src="https://github.com/user-attachments/assets/34130d70-692e-4065-a5e6-1fab8d8ac54e" />

  #

  <img width="1678" height="969" alt="image" src="https://github.com/user-attachments/assets/171af049-5b73-4f7c-9faf-e4d59d8a90c8" />

  #

  <img width="1675" height="955" alt="image" src="https://github.com/user-attachments/assets/470bb43a-94c0-4470-baa3-0c04bec9a879" />

  #

  <img width="1675" height="965" alt="image" src="https://github.com/user-attachments/assets/a7b0c0f2-488e-4ff2-b857-abf7147c0dff" />

  #

  <img width="1676" height="965" alt="image" src="https://github.com/user-attachments/assets/2511e0f0-248d-45ef-b6e0-d0c3696f02a5" />

  #

  <img width="1678" height="964" alt="image" src="https://github.com/user-attachments/assets/5bf6dd4e-2430-40da-8045-c612b69a0be6" />
  
  #

  <img width="1679" height="957" alt="image" src="https://github.com/user-attachments/assets/cff12cc0-a9ec-43fe-b05d-fb56590306e2" />


  #

  <img width="1679" height="970" alt="image" src="https://github.com/user-attachments/assets/e8e93db9-76e4-438a-9509-6731e7f11c8d" />

  #

  <img width="1678" height="956" alt="image" src="https://github.com/user-attachments/assets/57ed522d-8fa8-4cc3-bd2b-27e523260386" />
    
  #

  <img width="1676" height="951" alt="image" src="https://github.com/user-attachments/assets/87239ae7-688d-481e-9918-9e058e46dc53" />

  #

  <img width="1675" height="958" alt="image" src="https://github.com/user-attachments/assets/4b45ce16-05c1-4afe-b0c6-8f2445e41d92" />

  #

  <img width="1676" height="958" alt="image" src="https://github.com/user-attachments/assets/10a18c79-bbfd-40be-bd26-e812c314a948" />

  #

  <img width="1675" height="964" alt="image" src="https://github.com/user-attachments/assets/8196da59-823a-4b0f-b271-9bd0077099e9" />

  #

  <img width="1678" height="959" alt="image" src="https://github.com/user-attachments/assets/c56e7e15-254f-44e3-8ee1-aeb747891640" />

  #

  <img width="1679" height="966" alt="image" src="https://github.com/user-attachments/assets/1cfb0409-28ef-4805-a2a9-186f0ce10f0a" />

</div>
