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
  sku?: string;
  name: string;
  price: number;
  original_price?: number;
  image: string;
  description: string;
  material?: string;
  in_stock?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  category_id: number;
  stock?: number; // Deprecated: ya no se usa, se usa de product_variants
  has_warranty?: boolean;
  warranty_period?: number;
  warranty_unit?: string;
  warranty_description?: string;
  weight_grams?: number;
  is_high_value?: boolean;
  requires_special_shipping?: boolean;
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface MetalType {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  price: number;
  sku?: string;
  image?: string;
  model?: string;
  size?: string;
  stock?: number;
  original_price?: number;
  is_active?: boolean;
  is_default?: boolean;
  use_product_images?: boolean;
  use_model_images?: boolean;
  image_reference_variant_id?: number | null;
  metal_type?: number;
  carat?: number;
  metal_name?: string;
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

/** Datos de transacción (tabla transactions) para desglose de la orden */
export interface OrderTransaction {
  id?: number;
  order_id?: number;
  amount?: number;
  subtotal?: number;
  shipping?: number;
  taxes?: number;
  currency?: string;
}

export interface Order {
  id: number;
  order_number?: string; // ⭐ NUEVO - el campo que agregaste
  user_id?: string;
  total: number;
  status: OrderStatus;
  created_at?: string;
  tracking_code?: string;
  updated_at?: string;
  is_submitted?: boolean;
  submitted_at?: string;
  courier_id?: number;
  return_status?: string;
  stripe_payment_intent_id?: string; // ⭐ Faltaba este
  billing_snapshot?: any; // ⭐ NUEVO - agregar este
  shipping_snapshot?: any; // Ya lo tenías pero asegúrate
  order_items?: OrderItem[];
  shipping_address_id?: number | null;
  shipping_address?: UserAddress | null;
  user?: User;
  courier?: Courier;
  /** Primera transacción de la orden (shipping, taxes, subtotal) */
  transaction?: OrderTransaction | null;
  // Mantener compatibilidad temporal con código antiguo
  addresses?: UserAddress[];
}

export type OrderStatus = 
  | 'pendiente' 
  | 'pagado'
  | 'procesando' 
  | 'enviado' 
  | 'entregado' 
  | 'cancelado' 
  | 'reembolsado'
  | 'devuelto'
  | 'parcialmente_devuelto'
  | 'disputa'
  | 'reserved';

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

// Nuevo esquema de direcciones de usuario (user_addresses)
// exterior_number / interior_number para Empak2 (numeroE / numeroI)
export interface UserAddress {
  id: number;
  user_id: string;
  label?: string; // Casa, Oficina, etc.
  name?: string;
  phone?: string;
  address_line1: string;
  address_line2?: string;
  exterior_number?: string;
  interior_number?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country?: string; // MX por defecto
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Courier {
  id: number;
  name: string;
  url: string;
  logo?: string;
  created_at?: string;
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

// Tipos para roles de usuario
export type UserRole = 'admin' | 'worker' | 'customer';

export interface UserRoleData {
  user_id: string;
  role: UserRole;
}

// Tipos para devoluciones
export interface Return {
  id: number;
  order_id: number;
  admin_id: string;
  name_admin?: string;
  reason?: string;
  returned_at: string;
  items_returned?: any;
  order?: Order;
  admin?: User;
}

// Tipos para la autenticación
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
  role?: UserRole;
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

// Tipos para el dashboard
export interface SalesSummary {
  date: string;
  total_orders: number;
  total_sales: number;
  unique_customers: number;
  total_returns: number;
}

export interface SalesFinancial {
  date: string;
  total_orders: number;
  total_sales: number;
  total_returns: number;
  total_platform_fee: number;
  total_jeweler_earnings: number;
}

export interface OrderDetailed {
  order_id: number;
  user_id: string;
  total: number;
  status: string;
  tracking_code?: string;
  created_at: string;
  updated_at: string;
  return_status: string;
  is_submitted: boolean;
  submitted_at?: string;
  courier_id?: number;
  courier_name?: string;
  courier_url?: string;
  courier_logo?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
}

export interface CourierPerformance {
  courier_id: number;
  courier_name: string;
  total_orders: number;
  total_sales: number;
  total_returns: number;
  return_rate_percentage: number;
}

export interface ShippingSummary {
  courier_name: string;
  total_shipments: number;
  shipped_orders: number;
  pending_orders: number;
  delivered_orders: number;
  returns_related: number;
}