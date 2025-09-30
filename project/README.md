# D Luxury Black - E-commerce

Este es un proyecto de e-commerce construido con React, TypeScript, Vite y Supabase.

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
VITE_SUPABASE_SERVICE_ROLE_KEY=tu-clave-anonima-aqui
VITE_SUPABASE_FUNCTIONS_URL=https://tu-proyecto.functions.supabase.co
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

El proyecto está configurado para trabajar con las siguientes tablas:

- `users` - Usuarios autenticados
- `categories` - Categorías de productos
- `products` - Productos
- `product_variants` - Variantes de productos
- `product_images` - Imágenes de productos
- `variant_images` - Imágenes de variantes
- `cart_items` - Items del carrito
- `carts` - Carritos de compra
- `orders` - Órdenes
- `order_items` - Items de órdenes
- `addresses` - Direcciones
- `reviews` - Reseñas
- `interested_clients` - Clientes interesados
- `cart_reminders` - Recordatorios de carrito
- `emails` - Emails

Tablas creadas:

create table public.addresses (
  id bigserial not null,
  user_id uuid null,
  name character varying(255) null,
  address_line1 character varying(255) null,
  address_line2 character varying(255) null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  country character varying(100) null,
  phone character varying(30) null,
  created_at timestamp with time zone null default now(),
  order_id bigint null,
  constraint addresses_pkey primary key (id),
  constraint addresses_order_id_fkey foreign KEY (order_id) references orders (id) on update CASCADE on delete CASCADE,
  constraint addresses_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.cart_items (
  id bigserial not null,
  cart_user_id uuid null,
  product_id bigint null,
  variant_id bigint null,
  quantity integer not null default 1,
  price numeric(10, 2) not null,
  added_at timestamp with time zone null default now(),
  constraint cart_items_pkey primary key (id),
  constraint cart_items_cart_user_id_fkey foreign KEY (cart_user_id) references carts (user_id) on delete CASCADE,
  constraint cart_items_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint cart_items_variant_id_fkey foreign KEY (variant_id) references product_variants (id)
) TABLESPACE pg_default;

create index IF not exists idx_cart_items_cart_user_id on public.cart_items using btree (cart_user_id) TABLESPACE pg_default;

create index IF not exists idx_cart_items_product_id on public.cart_items using btree (product_id) TABLESPACE pg_default;

create table public.cart_reminders (
  id bigint generated always as identity not null,
  user_id uuid not null,
  sent_at timestamp with time zone not null default now(),
  cart_data jsonb not null,
  constraint cart_reminders_pkey primary key (id),
  constraint cart_reminders_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.carts (
  user_id uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  items json null,
  constraint carts_pkey primary key (user_id)
) TABLESPACE pg_default;


create table public.categories (
  id serial not null,
  name character varying(100) not null,
  description text null,
  constraint categories_pkey primary key (id)
) TABLESPACE pg_default;

create table public.emails (
  id bigint generated always as identity not null,
  to_email text not null,
  from_email text not null,
  subject text not null,
  html_content text not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone null,
  constraint emails_pkey primary key (id)
) TABLESPACE pg_default;

create table public.interested_clients (
  id uuid not null default gen_random_uuid (),
  email text not null,
  interests text[] null default array[]::text[],
  created_at timestamp with time zone not null default now(),
  is_subscribed boolean null default true,
  metadata jsonb null,
  unsubscribe_token text null default gen_random_uuid (),
  constraint interested_clients_pkey primary key (id),
  constraint interested_clients_email_key unique (email),
  constraint interested_clients_unsubscribe_token_key unique (unsubscribe_token)
) TABLESPACE pg_default;
 
create index IF not exists idx_interested_clients_email on public.interested_clients using btree (email) TABLESPACE pg_default;

create index IF not exists idx_interested_clients_created_at on public.interested_clients using btree (created_at) TABLESPACE pg_default;

View

create view public.vw_subscribers_management as
select
  email,
  interests,
  created_at,
  is_subscribed,
  case
    when is_subscribed then 'Active'::text
    else 'Inactive'::text
  end as status,
  concat(
    'https://localhost:5173.com/unsubscribe?token=',
    unsubscribe_token
  ) as unsubscribe_link
from
  interested_clients
order by
  created_at desc;


create table public.order_items (
  id bigserial not null,
  order_id bigint null,
  product_id bigint null,
  variant_id bigint null,
  quantity integer not null default 1,
  price numeric(10, 2) not null,
  constraint order_items_pkey primary key (id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_product_id_fkey foreign KEY (product_id) references products (id),
  constraint order_items_variant_id_fkey foreign KEY (variant_id) references product_variants (id)
) TABLESPACE pg_default;

create trigger trg_restore_inventory_after_cancel
after DELETE on order_items for EACH row
execute FUNCTION restore_inventory_after_cancel ();

create table public.orders (
  id bigserial not null,
  user_id uuid null,
  total numeric(10, 2) not null,
  status character varying(50) null default 'pendiente'::character varying,
  created_at timestamp with time zone null default now(),
  tracking_code character varying(100) null,
  updated_at timestamp with time zone null default now(),
  constraint orders_pkey primary key (id),
  constraint orders_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create trigger update_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at ();

create table public.product_images (
  id bigserial not null,
  product_id bigint null,
  url character varying(500) not null,
  ordering integer null default 0,
  constraint product_images_pkey primary key (id),
  constraint product_images_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.product_variants (
  id bigserial not null,
  product_id bigint null,
  name character varying(100) not null,
  price numeric(10, 2) not null,
  image character varying(500) null,
  model character varying null,
  size character varying null,
  stock integer null default 0,
  original_price numeric null,
  constraint product_variants_pkey primary key (id),
  constraint product_variants_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.products (
  id bigserial not null,
  name character varying(255) not null,
  price numeric(10, 2) not null,
  original_price numeric(10, 2) null,
  image character varying(500) not null,
  description text null,
  material character varying(255) null,
  in_stock boolean null default true,
  is_new boolean null default false,
  is_featured boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  category_id integer not null,
  stock integer null default 0,
  constraint products_pkey primary key (id),
  constraint products_category_id_fkey foreign KEY (category_id) references categories (id)
) TABLESPACE pg_default;

create table public.reviews (
  id bigserial not null,
  product_id bigint null,
  user_id uuid not null,
  user_name character varying(255) not null,
  rating integer not null,
  comment text null,
  created_at timestamp with time zone null default now(),
  constraint reviews_pkey primary key (id),
  constraint reviews_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint reviews_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_reviews_product_id on public.reviews using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_reviews_user_id on public.reviews using btree (user_id) TABLESPACE pg_default;


create table public.variant_images (
  id serial not null,
  variant_id bigint null,
  url text not null,
  created_at timestamp without time zone null default now(),
  constraint variant_images_pkey primary key (id),
  constraint variant_images_variant_id_fkey foreign KEY (variant_id) references product_variants (id)
) TABLESPACE pg_default;

create index IF not exists idx_variant_images_variant_id on public.variant_images using btree (variant_id) TABLESPACE pg_default;

### Hooks Principales

- `useAuth` - Manejo de autenticación
- `useProducts` - Manejo de productos
- `useCart` - Manejo del carrito
- `useOrders` - Manejo de órdenes

### Componentes Principales

- `Header` - Header con navegación y carrito
- `Auth` - Modal de autenticación
- `ProductGrid` - Grid de productos
- `ProductPage` - Página de producto individual
- `Cart` - Carrito de compras
- `Checkout` - Proceso de checkout

## Funcionalidades

- ✅ Autenticación de usuarios
- ✅ Catálogo de productos
- ✅ Carrito de compras
- ✅ Proceso de checkout
- ✅ Gestión de órdenes
- ✅ Reseñas de productos
- ✅ Newsletter
- ✅ Búsqueda y filtros
- ✅ Responsive design

## Tecnologías

- React 18
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- Lucide React
- React Router DOM
- TanStack Query 