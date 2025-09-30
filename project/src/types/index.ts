// Tipos base para las tablas de Supabase
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  image: string;
  description: string;
  material?: string;
  in_stock?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
  category_id: number;
  stock?: number;
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image?: string;
  model?: string;
  size?: string;
  stock?: number;
  original_price?: number;
  variant_images?: VariantImage[]; 
  images?: VariantImage[];
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  ordering?: number;
}

export interface VariantImage {
  id: number;
  variant_id: number;
  url: string;
  created_at?: string;
}

export interface Cart {
  user_id: string;
  created_at?: string;
  updated_at?: string;
  items?: any;
}

export interface CartItem {
  id: string | number;
  cart_user_id: string;
  product_id: number;
  variant_id?: number;
  quantity: number;
  price: number;
  added_at?: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface Order {
  id: number;
  user_id?: string;
  total: number;
  status: OrderStatus;
  created_at?: string;
  tracking_code?: string;
  updated_at?: string;
  order_items?: OrderItem[];
  addresses?: Address[];
  user?: User;
}

export type OrderStatus = 
  | 'pendiente' 
  | 'procesando' 
  | 'enviado' 
  | 'entregado' 
  | 'cancelado' 
  | 'reembolsado';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id?: number;
  quantity: number;
  price: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface Address {
  id: number;
  user_id?: string;
  name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  created_at?: string;
  order_id?: number;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: string;
  user_name: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

export interface InterestedClient {
  id: string;
  email: string;
  interests?: string[];
  created_at?: string;
  is_subscribed?: boolean;
  metadata?: any;
  unsubscribe_token?: string;
}

export interface CartReminder {
  id: number;
  user_id: string;
  sent_at: string;
  cart_data: any;
}

export interface Email {
  id: number;
  to_email: string;
  from_email: string;
  subject: string;
  html_content: string;
  status: string;
  created_at?: string;
  sent_at?: string;
}

// Tipos para el carrito de compras
export interface CartItemWithProduct extends CartItem {
  product: Product;
  variant?: ProductVariant;
}

// Tipos para la autenticación
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

// Tipos para las respuestas de la API
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  error: string | null;
}