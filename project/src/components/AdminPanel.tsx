import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from "framer-motion";

import { Product, Order, ProductVariant, UserRole, Courier, SalesSummary, SalesFinancial, CourierPerformance, ShippingSummary } from '../types';
import { Search, Package, RefreshCw, X, Save, Edit, Plus, Trash2, RotateCcw, Eye, AlertCircle, Filter, TrendingUp, Users, Truck, MapPin, Coins, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
// import { useReturns } from '../hooks/useReturns';
import { useUserManagement } from '../hooks/useUserManagement';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { uploadImageToProductsBucket, buildMediaUrl, isVideoUrl } from '../utils/storage';

const AdminPanel: React.FC = () => {
  type ShippingPackage = {
    id: number;
    name: string;
    empty_weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    is_active: boolean;
  };
  const { user, isAdmin, refreshUserRole } = useAuth();
  // const { returns, processReturn } = useReturns();
  const [returns, setReturns] = useState<any[]>([]);
  const { users, assignRole, addAdminByEmail} = useUserManagement();
  const { categories, metalTypes } = useProducts();
  const [metalTypesList, setMetalTypesList] = useState<{ id: number; name: string }[]>([]);
  const userRole = user?.role;
  const canManageCouriers = isAdmin();
  const canViewCouriers = canManageCouriers || userRole === 'worker';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'returns' | 'users' | 'couriers' | 'packages'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string | number, ProductVariant[]>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState({
    dashboard: false,
    products: true,
    orders: true,
    returns: false,
    users: false,
    packages: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all'); // Filtro para productos activos/inactivos
  const [roleFilter, setRoleFilter] = useState<string>('all'); // Filtro para roles de usuarios
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [submittedFilter, setSubmittedFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    products: { page: 1, limit: 10, total: 0 },
    orders: { page: 1, limit: 10, total: 0 },
    returns: { page: 1, limit: 10, total: 0 },
    users: { page: 1, limit: 10, total: 0 },
    couriers: { page: 1, limit: 10, total: 0 },
    packages: { page: 1, limit: 10, total: 0 }
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingStock, setEditingStock] = useState<{
    productId: string | number;
    variantId: string | number | null;
    value: number;
  } | null>(null);
  // Removido: edición de tracking_code deshabilitada
  const [editingSubmitted, setEditingSubmitted] = useState<{
    orderId: string | number;
    value: boolean;
  } | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productMainImageFile, setProductMainImageFile] = useState<File | null>(null);
  const [productMainImagePreview, setProductMainImagePreview] = useState<string | null>(null);
  const [productGalleryFiles, setProductGalleryFiles] = useState<FileList | null>(null);
  const [productGalleryPreviews, setProductGalleryPreviews] = useState<string[]>([]);
  const [showReturnModal, setShowReturnModal] = useState<{
    show: boolean;
    orderId: number | null;
  }>({ show: false, orderId: null });
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState<'full' | 'partial' | 'refund'>('full');
  const [selectedReturnItems, setSelectedReturnItems] = useState<{
    product_id: number;
    variant_id?: number;
    quantity: number;
    reason?: string;
  }[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    price: 0,
    original_price: undefined as number | undefined,
    image: '',
    description: '',
    material: '',
    category_id: 1,
    stock: 0,
    in_stock: true,
    is_new: false,
    is_featured: false,
    has_warranty: false,
    warranty_period: undefined as number | undefined,
    warranty_unit: undefined as string | undefined,
    warranty_description: undefined as string | undefined,
    weight_grams: 100,
    is_high_value: false,
    requires_special_shipping: false,
    is_active: false,
    metal_type: null as number | null,
    carat: undefined as number | undefined,
    product_image_mode: 'base' as 'base' | 'variant'
  });
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'worker' as UserRole
  });
  const [showAddPackage, setShowAddPackage] = useState(false);

  // Variants state
  const [showAddVariant, setShowAddVariant] = useState<{
    show: boolean;
    productId: number | null;
  }>({ show: false, productId: null });
  const [newVariant, setNewVariant] = useState({
    sku: '',
    name: '',
    price: 0,
    original_price: undefined as number | undefined,
    model: '',
    size: '',
    stock: 0,
    metal_type: null as number | null,
    carat: undefined as number | undefined,
    imageFile: null as File | null,
    is_active: true,
    is_default: false,
    use_product_images: true,
    use_model_images: false,
    image_reference_variant_id: null as number | null
  });
  const [newVariantImagePreview, setNewVariantImagePreview] = useState<string | null>(null);
  const [newVariantGalleryPreviews, setNewVariantGalleryPreviews] = useState<string[]>([]);
  const [editingVariant, setEditingVariant] = useState<null | {
    id: number;
    product_id: number;
    sku?: string;
    name: string;
    price: number;
    original_price?: number;
    model?: string;
    size?: string;
    stock?: number;
    metal_type?: number | null;
    carat?: number | null;
    image?: string | null;
    variant_images?: Array<{ id: number; url: string }>;
    is_active?: boolean;
    is_default?: boolean;
    use_product_images?: boolean;
    use_model_images?: boolean;
    image_reference_variant_id?: number | null;
  }>(null);
  const [editingVariantImageFile, setEditingVariantImageFile] = useState<File | null>(null);
  const [editingVariantImagePreview, setEditingVariantImagePreview] = useState<string | null>(null);
  const [editingProductGalleryFiles, setEditingProductGalleryFiles] = useState<FileList | null>(null);
  const [editingProductGalleryPreviews, setEditingProductGalleryPreviews] = useState<string[]>([]);
  const [newVariantGalleryFiles, setNewVariantGalleryFiles] = useState<FileList | null>(null);
  const [editingVariantGalleryFiles, setEditingVariantGalleryFiles] = useState<FileList | null>(null);
  const [editingVariantGalleryPreviews, setEditingVariantGalleryPreviews] = useState<string[]>([]);
  const gallerySuffix = (base: string, index: number) => `${base}_${index + 1}`;

  const [uniqueCustomersValue, setUniqueCustomersValue] = useState(0);

  // Estados para dashboard
  const [dashboardData, setDashboardData] = useState<{
    salesSummary: SalesSummary[];
    salesFinancial: SalesFinancial[];
    courierPerformance: CourierPerformance[];
    shippingSummary: ShippingSummary[];
  }>({
    salesSummary: [],
    salesFinancial: [],
    courierPerformance: [],
    shippingSummary: []
  });
  const [dashboardDateFilter, setDashboardDateFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });

  // Estados para couriers
  const [couriers, setCouriers] = useState<Courier[]>([]);
  // Removido: edición de courier_id deshabilitada
  const [packages, setPackages] = useState<ShippingPackage[]>([]);
  const [editingPackage, setEditingPackage] = useState<ShippingPackage | null>(null);
  const [newPackage, setNewPackage] = useState<Partial<ShippingPackage>>({
    name: '',
    empty_weight_grams: 0,
    length_cm: 0,
    width_cm: 0,
    height_cm: 0,
    is_active: true
  });

  // Estados para detalles de orden
  const [showOrderDetails, setShowOrderDetails] = useState<{
    show: boolean;
    orderId: number | null;
  }>({ show: false, orderId: null });
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [showProductDetails, setShowProductDetails] = useState<{
    show: boolean;
    productId: number | null;
  }>({ show: false, productId: null });
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [variantImagesToDelete, setVariantImagesToDelete] = useState<number[]>([]);

  // Fetch data based on active tab
  useEffect(() => {
    // Si no es admin, ocultar tabs restringidas
    if (!isAdmin() && (activeTab === 'dashboard' || activeTab === 'users' || activeTab === 'packages')) {
      setActiveTab('orders');
      return;
    }
    // Scroll al inicio al cambiar de pestaña/abrir
    window.scrollTo(0, 0);
    switch (activeTab) {
      case 'dashboard':
        fetchDashboardData();
        break;
      case 'products':
        fetchProducts();
        (async () => {
          const { data } = await supabase.from('metal_types').select('id, name').order('name');
          setMetalTypesList((data || []) as { id: number; name: string }[]);
        })();
        break;
      case 'orders':
        fetchCouriers();
        fetchOrders();
        fetchPackages();
        break;
      case 'returns':
        fetchReturns();
        break;
      case 'users':
        setLoading(prev => ({ ...prev, users: true }));
        setTimeout(() => setLoading(prev => ({ ...prev, users: false })), 500);
        break;
      case 'couriers':
        fetchCouriers();
        break;
      case 'packages':
        fetchPackages();
        break;
    }
  }, [activeTab]);

  // Cargar daashboard al inicio
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCouriers(data || []);
    } catch (error) {
      console.error('Error fetching couriers:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      setLoading(prev => ({ ...prev, packages: true }));
      const { data, error } = await supabase
        .from('shipping_packages')
        .select('*')
        .order('name');

      if (error) throw error;
      setPackages((data as ShippingPackage[]) || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(prev => ({ ...prev, packages: false }));
    }
  };

  // Helper functions for previews
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };


  // Función para clasificar producto (alto valor y envío especial)
  const classifyProduct = (product: typeof newProduct | Product) => {
    const weight = product.weight_grams || 100;
    const price = product.price || 0;
    const material = (product.material || '').toLowerCase();

    let isHighValue = false;
    let requiresSpecialShipping = false;

    // Alto valor por precio
    if (price >= 10000) {
      isHighValue = true;
    }

    // Alto valor por material
    if (material.includes('oro') || material.includes('diamante') || material.includes('platino')) {
      isHighValue = true;
    }

    // Envío especial
    if (isHighValue || weight > 500) {
      requiresSpecialShipping = true;
    }

    return { isHighValue, requiresSpecialShipping };
  };

  const handleAddPackage = async () => {
    try {
      if (!newPackage.name?.trim()) {
        alert('El nombre del paquete es obligatorio.');
        return;
      }
      const { error } = await supabase.from('shipping_packages').insert([{
        name: newPackage.name,
        empty_weight_grams: Number(newPackage.empty_weight_grams) || 0,
        length_cm: Number(newPackage.length_cm) || 0,
        width_cm: Number(newPackage.width_cm) || 0,
        height_cm: Number(newPackage.height_cm) || 0,
        is_active: newPackage.is_active ?? true
      }]);
      if (error) throw error;
      setNewPackage({
        name: '',
        empty_weight_grams: 0,
        length_cm: 0,
        width_cm: 0,
        height_cm: 0,
        is_active: true
      });
      fetchPackages();
      alert('Paquete creado correctamente.');
    } catch (error) {
      console.error('Error creating package:', error);
      alert('No se pudo crear el paquete.');
    }
  };

  const handleUpdatePackage = async () => {
    if (!editingPackage) return;
    try {
      const { error } = await supabase
        .from('shipping_packages')
        .update({
          name: editingPackage.name,
          empty_weight_grams: Number(editingPackage.empty_weight_grams) || 0,
          length_cm: Number(editingPackage.length_cm) || 0,
          width_cm: Number(editingPackage.width_cm) || 0,
          height_cm: Number(editingPackage.height_cm) || 0,
          is_active: editingPackage.is_active
        })
        .eq('id', editingPackage.id);
      if (error) throw error;
      setEditingPackage(null);
      fetchPackages();
      alert('Paquete actualizado.');
    } catch (error) {
      console.error('Error updating package:', error);
      alert('No se pudo actualizar el paquete.');
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm('¿Eliminar paquete?')) return;
    try {
      // Verificar si el paquete está siendo usado en shipping_labels
      const { data: labelsUsingPackage, error: checkError } = await supabase
        .from('shipping_labels')
        .select('id')
        .eq('shipping_package_id', id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (labelsUsingPackage && labelsUsingPackage.length > 0) {
        alert('No se puede eliminar el paquete porque ya está siendo usado en envíos.');
        return;
      }
      
      const { error } = await supabase.from('shipping_packages').delete().eq('id', id);
      if (error) throw error;
      fetchPackages();
      alert('Paquete eliminado correctamente.');
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('No se pudo eliminar el paquete.');
    }
  };


  const fetchDashboardData = async (customFilter?: { startDate?: string; endDate?: string }) => {
    setLoading(prev => ({ ...prev, dashboard: true }));

    try {
      const filters = customFilter || dashboardDateFilter;
      const rpcPayload = {
        ...(filters.startDate ? { p_start_date: new Date(filters.startDate).toISOString() } : {}),
        ...(filters.endDate ? { p_end_date: new Date(filters.endDate).toISOString() } : {}),
      };

      const { data: salesSummaryData, error: err1 } = await supabase.rpc('fn_sales_summary_simple', rpcPayload) as { data: SalesSummary[] | null; error: any };
      const { data: salesFinancialData, error: err2 } = await supabase.rpc('fn_sales_summary_financial', rpcPayload) as { data: SalesFinancial[] | null; error: any };
      const { data: courierPerformanceData, error: err3 } = await supabase.rpc('fn_courier_performance', rpcPayload) as { data: CourierPerformance[] | null; error: any };
      const { data: shippingSummaryData, error: err4 } = await supabase.rpc('fn_shipping_summary', rpcPayload) as { data: ShippingSummary[] | null; error: any };
      const { data: uniqueCustomers, error: err5 } = await supabase.rpc('fn_unique_customers', rpcPayload) as { data: number | null; error: any };

      if (err1 || err2 || err3 || err4 || err5) {
        console.error('❌ Error fetching dashboard data:', err1 || err2 || err3 || err4);
        return;
      }

      setUniqueCustomersValue(uniqueCustomers ?? 0);

      setDashboardData({
        salesSummary: salesSummaryData || [],
        salesFinancial: salesFinancialData || [],
        courierPerformance: courierPerformanceData || [],
        shippingSummary: shippingSummaryData || []
      });
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  };



  
const [orderDetailItems, setOrderDetailItems] = useState<any[]>([]);
const shippingInfo = orderDetails
  ? orderDetails.shipping_snapshot || {
      label: orderDetails.shipping_label,
      name: orderDetails.shipping_name,
      phone: orderDetails.shipping_phone,
      address_line1: orderDetails.shipping_address_line1,
      address_line2: orderDetails.shipping_address_line2,
      city: orderDetails.shipping_city,
      state: orderDetails.shipping_state,
      postal_code: orderDetails.shipping_postal_code,
      country: orderDetails.shipping_country,
    }
  : null;

  // Selección y generación de etiquetas de envío
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [selectedCourierIdForLabels, setSelectedCourierIdForLabels] = useState<number | ''>('');
  const [selectedPackageIdForLabels, setSelectedPackageIdForLabels] = useState<number | ''>('');
  const [processingShipping, setProcessingShipping] = useState(false);
  const [shippingStatusMessage, setShippingStatusMessage] = useState<string>('');
  const [createdLabelIds, setCreatedLabelIds] = useState<number[]>([]);
  const [processedLabels, setProcessedLabels] = useState<any[]>([]);
  const [showPdfOptionsModal, setShowPdfOptionsModal] = useState(false);

const fetchOrderDetails = async (orderId: number) => {
  try {
    let detailedOrder: any = null;

    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_orders_detailed');
    if (!rpcError && rpcData) {
      detailedOrder = (rpcData as any[]).find((entry: any) => entry.order_id === orderId) || null;
    }

    if (!detailedOrder) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('view_orders_detailed')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      if (fallbackError) throw fallbackError;
      detailedOrder = fallbackData;
    }

    const { data: snapshotData } = await supabase
      .from('orders')
      .select('shipping_snapshot')
      .eq('id', orderId)
      .maybeSingle();

    setOrderDetails({ ...detailedOrder, shipping_snapshot: snapshotData?.shipping_snapshot });

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(*),
        variant:product_variants(*)
      `)
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    setOrderDetailItems(itemsData || []);
  } catch (error) {
    console.error('❌ Error fetching order details:', error);
  }
};


  // Removido: handleCourierUpdate - edición de courier deshabilitada

  const fetchReturns = async (page = 1, limit = 10) => {
    setLoading(prev => ({ ...prev, returns: true }));
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('returns')
        .select('*, order:orders(order_number)', { count: 'exact' })
        .eq('status', 'processed')
        .order('returned_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setReturns(data || []);
      setPagination(prev => ({
        ...prev,
        returns: { page, limit, total: count || 0 }
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(prev => ({ ...prev, returns: false }));
    }
  };

  const fetchProducts = async (page = 1, limit = 10) => {
    setLoading(prev => ({ ...prev, products: true }));
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: productsData, error: productsError, count } = await supabase
        .from('products')
        .select(`
          *,
          product_images(*),
          product_variants(*, variant_images(*))
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (productsError) throw productsError;

      const normalizedProducts = (productsData || []).map((product: any) => {
        const { product_images, product_variants, ...rest } = product;
        return {
          ...rest,
          images: (product_images || []).sort((a: any, b: any) => (a.ordering ?? 0) - (b.ordering ?? 0)),
          variants: (product_variants || []).map((variant: any) => ({
            ...variant,
            variant_images: variant.variant_images || [],
          })),
        };
      });

      const variantsMap = normalizedProducts.reduce((acc, product) => {
        acc[product.id] = product.variants || [];
        return acc;
      }, {} as Record<string | number, ProductVariant[]>);

      setProducts(normalizedProducts);
      setVariants(variantsMap);
      setPagination(prev => ({
        ...prev,
        products: { page, limit, total: count || 0 }
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const fetchOrders = async () => {
    setLoading(prev => ({ ...prev, orders: true }));
    try {
      // Cargar todas las órdenes (sin límite) para paginación en frontend
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*))')
        .neq('status', 'reserved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  };

  const handleStockUpdate = async () => {
    if (!editingStock) return;

    try {
      if (editingStock.variantId) {
        const { error } = await supabase
          .from('product_variants')
          .update({ stock: editingStock.value })
          .eq('id', editingStock.variantId);

        if (error) throw error;

        setVariants(prev => {
          const updatedVariants = { ...prev };
          const variantIndex = updatedVariants[editingStock.productId]?.findIndex(
            v => v.id === editingStock.variantId
          );
          if (variantIndex !== undefined && variantIndex !== -1) {
            updatedVariants[editingStock.productId][variantIndex].stock = editingStock.value;
          }
          return updatedVariants;
        });
      } else {
        const { error } = await supabase
          .from('products')
          .update({ stock: editingStock.value })
          .eq('id', editingStock.productId);

        if (error) throw error;

        setProducts(prev =>
          prev.map(p =>
            p.id === editingStock.productId ? { ...p, stock: editingStock.value } : p
          )
        );
      }
    } catch (error) {
      console.error('Error updating stock:', error);
    } finally {
      setEditingStock(null);
    }
  };

  // Removido: handleTrackingUpdate - edición de tracking deshabilitada

  const handleAddProduct = async () => {
    try {
      if (!newProduct.name.trim()) {
        alert('El nombre del producto es requerido.');
        return;
      }

      // Upload main image if provided
      let mainImageUrl = newProduct.image;
      if (productMainImageFile) {
        const categoryName = categories.find(c => c.id === newProduct.category_id)?.name || 'sin_categoria';
        mainImageUrl = await uploadImageToProductsBucket(productMainImageFile, categoryName, newProduct.name);
      }
      if (!mainImageUrl) {
        alert('Selecciona una imagen principal para el producto.');
        return;
      }

      // Clasificar producto
      const classification = classifyProduct(newProduct);

      const { data: inserted, error } = await supabase
        .from('products')
        .insert([{ 
          ...newProduct, 
          image: mainImageUrl,
          weight_grams: newProduct.weight_grams || 100,
          is_high_value: classification.isHighValue,
          requires_special_shipping: classification.requiresSpecialShipping,
          is_active: newProduct.is_active ?? true
        }])
        .select('*')
        .single();

      if (error) throw error;

      // Upload gallery images to product_images
      if (inserted && productGalleryFiles) {
        const categoryName = categories.find(c => c.id === newProduct.category_id)?.name || 'sin_categoria';
        const urls: string[] = [];
        
        for (const [idx, file] of Array.from(productGalleryFiles).entries()) {
          const url = await uploadImageToProductsBucket(file, categoryName, newProduct.name, gallerySuffix('galeria', idx));
            urls.push(url);
        }
        
        const rows = urls.map((url, idx) => ({ product_id: inserted.id, url, ordering: idx }));
        await supabase.from('product_images').insert(rows);
      }

      // Crear siempre una variante default (modelo principal); el SKU es del modelo principal
      if (inserted) {
        const { error: variantError } = await supabase
          .from('product_variants')
          .insert([{
            product_id: inserted.id,
            name: newProduct.name,
            price: newProduct.price,
            original_price: newProduct.original_price,
            stock: newProduct.stock || 0,
            is_default: true,
            sku: newProduct.sku?.trim() || null,
            metal_type: newProduct.metal_type ?? null,
            carat: newProduct.carat ?? null,
            use_product_images: newProduct.product_image_mode === 'variant' ? false : true,
            is_active: newProduct.is_active ?? true
          }]);

        if (variantError) {
          console.error('Error creating default variant:', variantError);
          // No lanzar error, solo loguear
        }
      }

      setNewProduct({
        sku: '',
        name: '',
        price: 0,
        original_price: undefined,
        image: '',
        description: '',
        material: '',
        category_id: 1,
        stock: 0,
        in_stock: true,
        is_new: false,
        is_featured: false,
        has_warranty: false,
        warranty_period: undefined,
        warranty_unit: undefined,
        warranty_description: undefined,
        weight_grams: 100,
        is_high_value: false,
        requires_special_shipping: false,
        is_active: true,
        metal_type: null,
        carat: undefined,
        product_image_mode: 'base'
      });
      setShowAddProduct(false);
      setProductMainImageFile(null);
      setProductMainImagePreview(null);
      setProductGalleryFiles(null);
      setProductGalleryPreviews([]);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error al agregar el producto. Verifica que el nombre sea único y que todos los campos estén correctos.');
    }
  };

  const handleEditProduct = async (product: Product) => {
    try {
      // Optionally replace main image if a file was selected
      let updatedImage = product.image;
      if (productMainImageFile) {
        const categoryName = categories.find(c => c.id === product.category_id)?.name || 'sin_categoria';
        updatedImage = await uploadImageToProductsBucket(productMainImageFile, categoryName, product.name);
      }

      // Clasificar producto
      const classification = classifyProduct(product);

      // Eliminar imágenes marcadas para eliminar
      if (imagesToDelete.length > 0) {
        // Obtener las URLs de las imágenes antes de eliminarlas de la BD
        const { data: imagesToRemove } = await supabase
          .from('product_images')
          .select('url')
          .in('id', imagesToDelete);
        
        // Eliminar de la base de datos
        await supabase.from('product_images').delete().in('id', imagesToDelete);
        
        // Eliminar del storage bucket
        if (imagesToRemove && imagesToRemove.length > 0) {
          const pathsToDelete = imagesToRemove
            .map(img => img.url)
            .filter(Boolean);
          
          for (const path of pathsToDelete) {
            try {
              const { error: storageError } = await supabase.storage
                .from('products')
                .remove([path]);
              if (storageError) {
                console.error(`Error eliminando ${path} del storage:`, storageError);
              }
            } catch (err) {
              console.error(`Error eliminando ${path} del storage:`, err);
            }
          }
        }
      }

      const { error } = await supabase
        .from('products')
        .update({
          name: product.name,
          price: product.price,
          original_price: product.original_price,
          image: updatedImage,
          description: product.description,
          material: product.material,
          category_id: product.category_id,
          stock: product.stock,
          in_stock: product.in_stock,
          is_new: product.is_new,
          is_featured: product.is_featured,
          weight_grams: product.weight_grams ?? 100,
          is_high_value: classification.isHighValue,
          requires_special_shipping: classification.requiresSpecialShipping,
          is_active: product.is_active ?? true,
          has_warranty: product.has_warranty ?? false,
          warranty_period: product.warranty_period,
          warranty_unit: product.warranty_unit,
          warranty_description: product.warranty_description
        })
        .eq('id', product.id);

      if (error) throw error;

      // Actualizar metal_type y carat del modelo principal (variante default)
      const defaultVariant = variants[product.id]?.find((v: ProductVariant) => v.is_default);
      if (defaultVariant && ((product as any).metal_type !== undefined || (product as any).carat !== undefined)) {
        await supabase
          .from('product_variants')
          .update({
            metal_type: (product as any).metal_type ?? null,
            carat: (product as any).carat ?? null
          })
          .eq('id', defaultVariant.id);
      }

      if (editingProductGalleryFiles && editingProductGalleryFiles.length > 0) {
        const existingCount = (product.images?.length || 0) - imagesToDelete.length;
        const categoryName = categories.find(c => c.id === product.category_id)?.name || 'sin_categoria';
        const urls: string[] = [];
        
        for (const [idx, file] of Array.from(editingProductGalleryFiles).entries()) {
          const url = await uploadImageToProductsBucket(file, categoryName, product.name, gallerySuffix('galeria', existingCount + idx));
            urls.push(url);
        }
        
        const rows = urls.map((url, idx) => ({
          product_id: product.id,
          url,
          ordering: existingCount + idx,
        }));
        await supabase.from('product_images').insert(rows);
      }

      setEditingProduct(null);
      setProductMainImageFile(null);
      setProductMainImagePreview(null);
      setEditingProductGalleryFiles(null);
      setEditingProductGalleryPreviews([]);
      setImagesToDelete([]);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error al actualizar el producto.');
    }
  };

  const handleAddVariant = async () => {
    if (!showAddVariant.productId) return;
    try {
      let imageUrl: string | null = null;
      const parentProduct = products.find(p => p.id === showAddVariant.productId);
      const categoryName = categories.find(c => c.id === (parentProduct?.category_id || 1))?.name || 'sin_categoria';
      const productName = parentProduct?.name || 'variante';
      if (newVariant.imageFile) {
        imageUrl = await uploadImageToProductsBucket(newVariant.imageFile, categoryName, productName, `variante_${newVariant.name || 'variante'}`);
      }

      // Verificar si ya existe una variante default
      const existingVariants = variants[showAddVariant.productId] || [];
      const hasDefault = existingVariants.some(v => v.is_default === true);
      
      // Si intenta crear como default y ya existe una, no permitirlo
      const isDefault = newVariant.is_default && !hasDefault;
      
      // Usar la configuración seleccionada por el usuario
      const useProductImages = newVariant.use_product_images === true;
      const useModelImages = newVariant.use_model_images === true;
      const imageReferenceVariantId = newVariant.image_reference_variant_id && useModelImages 
        ? newVariant.image_reference_variant_id 
        : null;

      const { data: insertedVariant, error } = await supabase
        .from('product_variants')
        .insert([{
          product_id: showAddVariant.productId,
          sku: newVariant.sku || null,
          name: newVariant.name,
          price: newVariant.price,
          original_price: newVariant.original_price,
          model: newVariant.model,
          size: newVariant.size,
          stock: newVariant.stock,
          metal_type: newVariant.metal_type ?? null,
          carat: newVariant.carat ?? null,
          image: imageUrl,
          is_default: isDefault,
          use_product_images: useProductImages,
          use_model_images: useModelImages,
          image_reference_variant_id: imageReferenceVariantId,
          is_active: newVariant.is_active ?? true
        }])
        .select('*')
        .single();

      if (error) throw error;

      if (insertedVariant && newVariantGalleryFiles && newVariantGalleryFiles.length > 0) {
        const urls: string[] = [];
        for (const [idx, file] of Array.from(newVariantGalleryFiles).entries()) {
          const url = await uploadImageToProductsBucket(file, categoryName, productName, gallerySuffix('variante', idx));
          urls.push(url);
        }
        const rows = urls.map((url, idx) => ({
          variant_id: insertedVariant.id,
          url,
          ordering: idx,
        }));
        await supabase.from('variant_images').insert(rows);
      }

      setShowAddVariant({ show: false, productId: null });
      setNewVariant({ sku: '', name: '', price: 0, original_price: undefined, model: '', size: '', stock: 0, metal_type: null, carat: undefined, imageFile: null, is_active: true, is_default: false, use_product_images: true, use_model_images: false, image_reference_variant_id: null });
      setNewVariantGalleryFiles(null);
      setNewVariantImagePreview(null);
      setNewVariantGalleryPreviews([]);
      fetchProducts();
    } catch (error) {
      console.error('Error adding variant:', error);
    }
  };

  const handleEditVariant = async () => {
    if (!editingVariant) return;
    try {
      let imageUrl = editingVariant.image || null;
      if (editingVariantImageFile) {
        const p = products.find(p => p.id === editingVariant.product_id);
        const categoryName = categories.find(c => c.id === (p?.category_id || 1))?.name || 'sin_categoria';
        const productName = p?.name || 'variante';
        imageUrl = await uploadImageToProductsBucket(editingVariantImageFile, categoryName, productName, `variante_${editingVariant.name}`);
      }

      // Eliminar imágenes marcadas para eliminar
      if (variantImagesToDelete.length > 0) {
        // Obtener las URLs de las imágenes antes de eliminarlas de la BD
        const { data: imagesToRemove } = await supabase
          .from('variant_images')
          .select('url')
          .in('id', variantImagesToDelete);
        
        // Eliminar de la base de datos
        await supabase.from('variant_images').delete().in('id', variantImagesToDelete);
        
        // Eliminar del storage bucket
        if (imagesToRemove && imagesToRemove.length > 0) {
          const pathsToDelete = imagesToRemove
            .map(img => img.url)
            .filter(Boolean);
          
          for (const path of pathsToDelete) {
            try {
              const { error: storageError } = await supabase.storage
                .from('products')
                .remove([path]);
              if (storageError) {
                console.error(`Error eliminando ${path} del storage:`, storageError);
              }
            } catch (err) {
              console.error(`Error eliminando ${path} del storage:`, err);
            }
          }
        }
      }

      // Verificar si ya existe otra variante default (excluyendo la actual)
      const existingVariants = variants[editingVariant.product_id] || [];
      const hasOtherDefault = existingVariants.some(v => v.id !== editingVariant.id && v.is_default === true);
      
      // Si intenta establecer como default y ya existe otra, no permitirlo
      const isDefault = editingVariant.is_default && !hasOtherDefault;
      
      // Usar la configuración seleccionada por el usuario
      const useProductImages = editingVariant.use_product_images === true;
      const useModelImages = editingVariant.use_model_images === true;
      const imageReferenceVariantId = editingVariant.image_reference_variant_id && useModelImages 
        ? editingVariant.image_reference_variant_id 
        : null;

      const { error } = await supabase
        .from('product_variants')
        .update({
          sku: editingVariant.sku ?? null,
          name: editingVariant.name,
          price: editingVariant.price,
          original_price: editingVariant.original_price,
          model: editingVariant.model,
          size: editingVariant.size,
          stock: editingVariant.stock,
          metal_type: editingVariant.metal_type ?? null,
          carat: editingVariant.carat ?? null,
          image: imageUrl,
          is_default: isDefault,
          use_product_images: useProductImages,
          use_model_images: useModelImages,
          image_reference_variant_id: imageReferenceVariantId,
          is_active: editingVariant.is_active ?? true
        })
        .eq('id', editingVariant.id);

      if (error) throw error;

      setEditingVariant(null);
      setEditingVariantImageFile(null);
      setEditingVariantImagePreview(null);
      if (editingVariantGalleryFiles && editingVariantGalleryFiles.length > 0) {
        const parentProduct = products.find(p => p.id === editingVariant.product_id);
        const categoryName = categories.find(c => c.id === (parentProduct?.category_id || 1))?.name || 'sin_categoria';
        const productName = parentProduct?.name || 'variante';
        const startIndex = (editingVariant.variant_images?.length || 0) - variantImagesToDelete.length;
        const urls: string[] = [];
        for (const [idx, file] of Array.from(editingVariantGalleryFiles).entries()) {
          const url = await uploadImageToProductsBucket(file, categoryName, productName, gallerySuffix('variante', startIndex + idx));
          urls.push(url);
        }
        const rows = urls.map((url, idx) => ({
          variant_id: editingVariant.id,
          url,
          ordering: startIndex + idx,
        }));
        await supabase.from('variant_images').insert(rows);
      }
      setEditingVariantGalleryFiles(null);
      setEditingVariantGalleryPreviews([]);
      setVariantImagesToDelete([]);
      fetchProducts();
    } catch (error) {
      console.error('Error editing variant:', error);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);
      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error deleting variant:', error);
    }
  };

  const handleDeleteProductImage = (imageId: number) => {
    setImagesToDelete(prev => [...prev, imageId]);
  };

  const handleDeleteVariantImage = (imageId: number) => {
    setVariantImagesToDelete(prev => [...prev, imageId]);
  };

  const fetchProductDetails = async (productId: number) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(*),
          product_variants(*, variant_images(*)),
          category:categories(*)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;

      const normalizedProduct = {
        ...data,
        images: (data.product_images || []).sort((a: any, b: any) => (a.ordering ?? 0) - (b.ordering ?? 0)),
        variants: (data.product_variants || []).map((variant: any) => ({
          ...variant,
          variant_images: variant.variant_images || [],
        })),
      };

      setProductDetails(normalizedProduct as Product);
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) return;

    try {
      // Verificar si el producto ha sido comprado
      const { data: orderItems, error: checkError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (checkError) throw checkError;

      if (orderItems && orderItems.length > 0) {
        alert('No se puede eliminar este producto porque ya ha sido comprado. Puedes desactivarlo en su lugar.');
        return;
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      fetchProducts();
      alert('Producto eliminado correctamente.');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el producto. Verifica que no haya sido comprado.');
    }
  };

  const handleProcessReturn = async () => {
    if (!showReturnModal.orderId || !user) return;

    try {
      // const userName = user.name || user.email?.split('@')[0] || 'Admin';

      // Preparar datos para la API
      const returnData = {
        order_id: showReturnModal.orderId,
        reason: returnReason,
        refund_type: returnType,
        items: returnType === 'partial' ? selectedReturnItems : undefined,
        refund_only: returnType === 'refund' // Flag para indicar que es solo reembolso
      };

      // Llamar al endpoint de devolución
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(returnData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar la devolución');
      }

      const result = await response.json();



      if (result?.return_id) {
        await supabase.from('returns').update({
          admin_id: user.id,
          name_admin: user.name || user.email || 'Administrador'
        }).eq('id', result.return_id);
      }

      // Limpiar estados
      setShowReturnModal({ show: false, orderId: null });
      setReturnReason('');
      setReturnType('full');
      setSelectedReturnItems([]);
      setCurrentOrder(null);

      // Recargar datos
      fetchOrders();

      alert(`Devolución procesada exitosamente. ID: ${result.return_id}`);
    } catch (error) {
      console.error('Error processing return:', error);
      alert(`Error al procesar la devolución: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const success = await assignRole(userId, newRole);
      if (success) {
        await refreshUserRole(userId);
      }
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleSubmittedUpdate = async () => {
    if (!editingSubmitted) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          is_submitted: editingSubmitted.value,
          submitted_at: editingSubmitted.value ? new Date().toISOString() : null
        })
        .eq('id', editingSubmitted.orderId);

      if (error) throw error;

      setOrders(prev =>
        prev.map(o =>
          o.id === editingSubmitted.orderId
            ? {
              ...o,
              is_submitted: editingSubmitted.value,
              submitted_at: editingSubmitted.value ? new Date().toISOString() : undefined
            }
            : o
        )
      );
    } catch (error) {
      console.error('Error updating submitted status:', error);
    } finally {
      setEditingSubmitted(null);
    }
  };

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAllCurrentPage = (ordersPage: Order[]) => {
    const pageIds = ordersPage.map(o => o.id as number);
    const allSelected = pageIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const resetShippingFlow = () => {
    setProcessingShipping(false);
    setShippingStatusMessage('');
    setCreatedLabelIds([]);
    setProcessedLabels([]);
    setShowCourierModal(false);
    setShowPdfOptionsModal(false);
    setSelectedPackageIdForLabels('');
  };

  const handleOpenCourierModal = () => {
    if (selectedOrderIds.length === 0) {
      alert('Selecciona al menos una orden para generar etiquetas.');
      return;
    }
    setSelectedCourierIdForLabels('');
    const firstActivePackage = packages.find(p => p.is_active);
    setSelectedPackageIdForLabels(firstActivePackage ? firstActivePackage.id : '');
    setShowCourierModal(true);
    setShippingStatusMessage('');
  };

  const handleCreateAndProcessShipping = async () => {
    if (selectedOrderIds.length === 0) {
      alert('Selecciona al menos una orden para generar etiquetas.');
      return;
    }
    if (!selectedPackageIdForLabels) {
      alert('Selecciona un paquete de envío.');
      return;
    }
    if (processingShipping) return;
    try {
      setProcessingShipping(true);
      setShippingStatusMessage('Creando etiquetas...');
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      // Siempre usar la paquetería de cada orden (no se puede seleccionar otra)
      const requestBody = {
        order_ids: selectedOrderIds,
        courier_id: null,
        shipping_package_id: selectedPackageIdForLabels
      };
      
      const createResp = await fetch(`${baseUrl}/shipping-create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      }).catch((fetchError) => {
        console.error('❌ Error de fetch:', fetchError);
        throw new Error(`Error de conexión: ${fetchError.message}. Verifica que el endpoint esté disponible y la URL sea correcta.`);
      });

      if (!createResp.ok) {
        const errorText = await createResp.text();
        let err;
        try {
          err = JSON.parse(errorText);
        } catch {
          err = { error: errorText || `Error HTTP ${createResp.status}: ${createResp.statusText}` };
        }
        console.error('❌ Error del servidor:', err);
        throw new Error(err?.error || `Error al crear etiquetas (${createResp.status})`);
      }

      const createData = await createResp.json();
      
      // El endpoint devuelve { createdLabels: [...] }
      // Cada elemento es { order_id, label: {...} } o { order_id, error: {...} }
      // RPC puede devolver label como objeto o como array de un elemento
      const labelIds: number[] = [];
      const createdLabels = createData?.createdLabels || [];
      const firstError: string[] = [];

      createdLabels.forEach((entry: any) => {
        if (entry.error) {
          const errMsg = entry.error?.message || entry.error?.details || entry.error?.hint || JSON.stringify(entry.error);
          console.warn(`Error al crear etiqueta para orden ${entry.order_id}:`, entry.error);
          if (firstError.length === 0) firstError.push(errMsg);
        } else {
          const label = entry.label;
          const id = label?.id ?? (Array.isArray(label) ? label[0]?.id : null);
          if (id) labelIds.push(Number(id));
        }
      });

      if (labelIds.length === 0) {
        const errDetail = firstError[0] || 'Verifica que las órdenes estén pagadas, sin tracking, que exista un paquete de envío activo y un courier activo.';
        throw new Error(`No se generaron etiquetas. ${errDetail}`);
      }

      setShippingStatusMessage(`Generando guías de envío para ${labelIds.length} etiqueta(s)...`);

      // Generar guías con Empak2 (cada llamada genera la guía y actualiza la etiqueta vía process_shipping_label_with_api)
      const generatedGuides: { label_id: number; guide?: any; error?: string }[] = [];
      for (const labelId of labelIds) {
        try {
          const guideResp = await fetch(`${baseUrl}/shipping-generate-guide`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ shipping_label_id: labelId })
          });

          if (guideResp.ok) {
            const guideData = await guideResp.json();
            generatedGuides.push({ label_id: labelId, guide: guideData });
          } else {
            const errorText = await guideResp.text();
            generatedGuides.push({ label_id: labelId, error: errorText });
          }
        } catch (error) {
          console.error(`Error generando guía para label ${labelId}:`, error);
          generatedGuides.push({ label_id: labelId, error: error instanceof Error ? error.message : 'Error desconocido' });
        }
      }

      // shipping-generate-guide ya actualiza la etiqueta (tracking, label_url) vía process_shipping_label_with_api; no hace falta llamar a shipping-process
      const processedWithGuides = labelIds.map((labelId: number) => {
        const g = generatedGuides.find(x => x.label_id === labelId);
        return {
          label_id: labelId,
          label: g?.guide ? { id: labelId, tracking_code: g.guide.tracking_code, label_url: g.guide.label_url } : null,
          error: g?.error,
          guide: g?.guide,
          guideError: g?.error
        };
      });

      setCreatedLabelIds(labelIds);
      setProcessedLabels(processedWithGuides);
      setShippingStatusMessage('Etiquetas procesadas. Elige cómo descargar el PDF.');
      setShowCourierModal(false);
      setShowPdfOptionsModal(true);
      fetchOrders();
    } catch (error) {
      console.error('Error en flujo de envío:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error en flujo de envío: ${errorMessage}`);
      setShippingStatusMessage(`Error: ${errorMessage}`);
    } finally {
      setProcessingShipping(false);
    }
  };

  const downloadPdfIndividual = async (labelId: number) => {
    try {
      setShippingStatusMessage(`Descargando PDF de etiqueta ${labelId}...`);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      // El endpoint espera el parámetro 'id', no 'label_id'
      const resp = await fetch(`${baseUrl}/shipping-label-pdf?id=${labelId}`, {
        method: 'GET',
        headers
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        let err;
        try {
          err = JSON.parse(errorText);
        } catch {
          err = { error: errorText || 'No se pudo obtener el PDF de la etiqueta' };
        }
        throw new Error(err?.error || 'No se pudo obtener el PDF de la etiqueta');
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipping-label-${labelId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShippingStatusMessage('PDF descargado.');
    } catch (error) {
      console.error('Error al descargar PDF individual:', error);
      alert(`Error al descargar PDF: ${error instanceof Error ? error.message : 'Desconocido'}`);
    }
  };

  const downloadPdfCombined = async () => {
    if (!createdLabelIds.length) {
      alert('No hay etiquetas procesadas para combinar.');
      return;
    }
    try {
      setShippingStatusMessage('Generando PDF combinado...');
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const resp = await fetch(`${baseUrl}/shipping-labels-bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ label_ids: createdLabelIds })
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        let err;
        try {
          err = JSON.parse(errorText);
        } catch {
          err = { error: errorText || 'No se pudo generar el PDF combinado' };
        }
        throw new Error(err?.error || 'No se pudo generar el PDF combinado');
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shipping-labels-combined.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setShippingStatusMessage('PDF combinado descargado.');
    } catch (error) {
      console.error('Error al descargar PDF combinado:', error);
      alert(`Error al descargar PDF combinado: ${error instanceof Error ? error.message : 'Desconocido'}`);
    }
  };

  const fetchUsers = async () => {
    // Esta función se maneja en el hook useUserManagement
    // Solo recargamos la página para actualizar los datos
    window.location.reload();
  };

  const handleAddUser = async () => {
    try {
      const ok = await addAdminByEmail(newUser.email, newUser.role);
      if (!ok) throw new Error('No se pudo agregar el usuario administrativo');
      alert(`Usuario ${newUser.email} agregado con rol ${newUser.role}.`);
      setNewUser({ email: '', role: 'worker' });
      setShowAddUser(false);
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error al agregar usuario. Verifica los permisos de la base de datos.');
    }
  };

  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(term) ||
      (product.sku && product.sku.toLowerCase().includes(term)) ||
      product.id.toString().includes(term);
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    const matchesActive = activeFilter === 'all' || 
      (activeFilter === 'active' && product.is_active !== false) ||
      (activeFilter === 'inactive' && product.is_active === false);
    return matchesSearch && matchesCategory && matchesActive;
  });


  const filteredOrders = orders.filter(order => {
    if (order.status === 'reserved') return false;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      (order.order_number && order.order_number.toLowerCase().includes(term)) ||
      order.id.toString().includes(term) ||
      (order.tracking_code && order.tracking_code.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSubmitted = submittedFilter === 'all' ||
      (submittedFilter === 'submitted' && order.is_submitted) ||
      (submittedFilter === 'not_submitted' && !order.is_submitted);

    // Filtro de fecha
    let matchesDate = true;
    if (dateFilter.startDate || dateFilter.endDate) {
      const orderDate = new Date(order.created_at || new Date().toISOString());
      if (dateFilter.startDate) {
        const startDate = new Date(dateFilter.startDate);
        matchesDate = matchesDate && orderDate >= startDate;
      }
      if (dateFilter.endDate) {
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999); // Incluir todo el día
        matchesDate = matchesDate && orderDate <= endDate;
      }
    }

    return matchesSearch && matchesStatus && matchesSubmitted && matchesDate;
  });

  const filteredReturns = returns.filter(ret => {
    // Solo mostrar returns procesados (ya filtrado en fetchReturns, pero por si acaso)
    if (ret.status !== 'processed') return false;
    
    const matchesSearch = ret.id.toString().includes(searchTerm.toLowerCase()) ||
      ret.order_id.toString().includes(searchTerm.toLowerCase());

    // Filtro de fecha para devoluciones
    let matchesDate = true;
    if (dateFilter.startDate || dateFilter.endDate) {
      const returnDate = new Date(ret.returned_at || new Date().toISOString());
      if (dateFilter.startDate) {
        const startDate = new Date(dateFilter.startDate);
        matchesDate = matchesDate && returnDate >= startDate;
      }
      if (dateFilter.endDate) {
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999); // Incluir todo el día
        matchesDate = matchesDate && returnDate <= endDate;
      }
    }

    return matchesSearch && matchesDate;
  });

  const filteredUsers = users.filter(userItem => {
    const matchesSearch = userItem.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (userItem.name && userItem.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'admin' && userItem.role === 'admin') ||
      (roleFilter === 'worker' && userItem.role === 'worker') ||
      (roleFilter === 'customer' && (userItem.role === 'customer' || !userItem.role));
    return matchesSearch && matchesRole;
  });
  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Resetear paginación cuando cambian los filtros
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      products: { ...prev.products, page: 1 },
      orders: { ...prev.orders, page: 1 },
      returns: { ...prev.returns, page: 1 },
      users: { ...prev.users, page: 1 },
      couriers: { ...prev.couriers, page: 1 },
      packages: { ...prev.packages, page: 1 }
    }));
  }, [statusFilter, submittedFilter, dateFilter.startDate, dateFilter.endDate, searchTerm, categoryFilter, activeFilter, roleFilter]);

  // Componente de paginación - ahora funciona con datos filtrados
  const PaginationControls = ({ type, filteredData, onPageChange }: { 
    type: 'products' | 'orders' | 'returns' | 'users' | 'couriers' | 'packages';
    filteredData: any[];
    onPageChange?: (page: number) => void;
  }) => {
    const currentPagination = pagination[type];
    const totalRecords = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / currentPagination.limit));
    const startIndex = (currentPagination.page - 1) * currentPagination.limit;
    const endIndex = startIndex + currentPagination.limit;

    if (totalPages <= 1) return null;

    const handlePageChange = (newPage: number) => {
      setPagination(prev => ({
        ...prev,
        [type]: { ...prev[type], page: newPage }
      }));
      if (onPageChange) onPageChange(newPage);
      window.scrollTo(0, 0);
    };

    // Calcular qué páginas mostrar
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        // Mostrar todas las páginas si son pocas
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Mostrar primera página
        pages.push(1);
        
        // Calcular inicio y fin del rango visible
        let start = Math.max(2, currentPagination.page - 1);
        let end = Math.min(totalPages - 1, currentPagination.page + 1);
        
        // Ajustar si estamos cerca del inicio
        if (currentPagination.page <= 3) {
          end = Math.min(4, totalPages - 1);
        }
        
        // Ajustar si estamos cerca del final
        if (currentPagination.page >= totalPages - 2) {
          start = Math.max(2, totalPages - 3);
        }
        
        // Agregar ellipsis al inicio si es necesario
        if (start > 2) {
          pages.push('...');
        }
        
        // Agregar páginas del rango
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        
        // Agregar ellipsis al final si es necesario
        if (end < totalPages - 1) {
          pages.push('...');
        }
        
        // Agregar última página
        pages.push(totalPages);
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between mt-4 px-6 py-3 bg-gray-700">
        <div className="text-sm text-gray-400">
          {(() => {
            const start = totalRecords === 0 ? 0 : startIndex + 1;
            const end = totalRecords === 0 ? 0 : Math.min(endIndex, totalRecords);
            return `Mostrando ${start} - ${end} de ${totalRecords}`;
          })()}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPagination.page - 1)}
            disabled={currentPagination.page <= 1}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
          >
            Anterior
          </button>

          <div className="flex items-center space-x-1">
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }
              const pageNum = page as number;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPagination.page === pageNum
                      ? 'bg-yellow-500 text-black font-bold'
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPagination.page + 1)}
            disabled={currentPagination.page >= totalPages}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };


  // 💰 Calcular métricas principales
  const totalSales = dashboardData.salesFinancial.reduce((sum, i) => sum + (i.total_sales || 0), 0);
  const totalOrders = dashboardData.salesSummary.reduce((sum, i) => sum + (i.total_orders || 0), 0);
  const totalReturns = dashboardData.salesSummary.reduce((sum, i) => sum + (i.total_returns || 0), 0);
  const platformFees = dashboardData.salesFinancial.reduce((sum, i) => sum + (i.total_platform_fee || 0), 0);
  const jewelerEarnings = dashboardData.salesFinancial.reduce((sum, i) => sum + (i.total_jeweler_earnings || 0), 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-base sm:text-lg font-bold">Panel de Administración</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              Usuario: {user?.name || user?.email}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user?.role === 'admin' ? 'bg-red-500/20 text-red-400' :
              user?.role === 'worker' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
              {user?.role?.toUpperCase() || 'CUSTOMER'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-4 sm:mb-6 text-xs sm:text-sm overflow-x-auto">
          {isAdmin() && (
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'dashboard' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
          )}
          {isAdmin() && (
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'products' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('products')}
            >
              Productos
            </button>
          )}
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'orders' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('orders')}
          >
            Órdenes
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'returns' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('returns')}
          >
            Devoluciones
          </button>
          {isAdmin() && (
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'users' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('users')}
            >
              Usuarios
            </button>
          )}
          {canViewCouriers && (
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'couriers' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('couriers')}
            >
              Paqueterías
            </button>
          )}
          {isAdmin() && (
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'packages' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('packages')}
            >
              Paquetes
            </button>
          )}
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {activeTab !== 'dashboard' && activeTab !== 'couriers' && activeTab !== 'packages' && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Buscar ${activeTab === 'products' ? 'productos' : activeTab === 'orders' ? 'órdenes' : activeTab === 'returns' ? 'devoluciones' : 'usuarios'}...`}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {/* Filtros específicos por tab */}
            {activeTab === 'products' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-5 w-5 text-white" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pendiente">Pendiente (No pagado)</option>
                  <option value="pagado">Pagado</option>
                  <option value="procesando">Procesando</option>
                  <option value="enviado">Enviado</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="reembolsado">Reembolsado</option>
                  <option value="devuelto">Devuelto</option>
                  <option value="parcialmente_devuelto">Parcialmente devuelto</option>
                  <option value="disputa">Disputa</option>
                </select>
                <select
                  value={submittedFilter}
                  onChange={(e) => setSubmittedFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="all">Todos</option>
                  <option value="submitted">Enviados</option>
                  <option value="not_submitted">No enviados</option>
                </select>
                <div className="flex items-center space-x-2">
                  <label className="text-white text-sm">Desde:</label>
                  <input
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    title="Fecha de inicio"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-white text-sm">Hasta:</label>
                  <input
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    title="Fecha de fin"
                  />
                </div>
                {(dateFilter.startDate || dateFilter.endDate) && (
                  <button
                    onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                    className="text-white hover:text-gray-200 text-sm"
                    title="Limpiar filtros de fecha"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-white" />
                <div className="flex items-center space-x-2">
                  <label className="text-white text-sm">Desde:</label>
                  <input
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    title="Fecha de inicio"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-white text-sm">Hasta:</label>
                  <input
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    title="Fecha de fin"
                  />
                </div>
                {(dateFilter.startDate || dateFilter.endDate) && (
                  <button
                    onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                    className="text-white hover:text-gray-200 text-sm"
                    title="Limpiar filtros de fecha"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {activeTab === 'products' && isAdmin() && (
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Producto</span>
              </button>
            )}
            {activeTab === 'users' && isAdmin() && (
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Usuario</span>
              </button>
            )}
            {activeTab === 'packages' && isAdmin() && (
              <button
                onClick={() => setShowAddPackage(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Paquete</span>
              </button>
            )}
            {activeTab === 'orders' && (
              <button
                onClick={handleOpenCourierModal}
                disabled={processingShipping}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-lg transition-colors"
              >
                <Truck className="h-4 w-4" />
                <span>{processingShipping ? 'Procesando...' : 'Generar etiquetas'}</span>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'dashboard' && (
  <div className="space-y-6">
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm text-gray-300 mb-1">Desde</label>
        <input
          type="date"
          value={dashboardDateFilter.startDate}
          onChange={(e) => setDashboardDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1">Hasta</label>
        <input
          type="date"
          value={dashboardDateFilter.endDate}
          onChange={(e) => setDashboardDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>
      <button
        onClick={() => fetchDashboardData({ ...dashboardDateFilter })}
        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg"
      >
        Filtrar
      </button>
      {(dashboardDateFilter.startDate || dashboardDateFilter.endDate) && (
        <button
          onClick={() => {
            setDashboardDateFilter({ startDate: '', endDate: '' });
            fetchDashboardData({ startDate: '', endDate: '' });
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
        >
          Limpiar
        </button>
      )}
    </div>
    

    {/* 📊 Métricas principales */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {[
        { title: 'Ventas Totales', value: `$${totalSales.toLocaleString()}`, color: 'from-green-900/30 to-green-800/30 border-green-500/30', icon: <TrendingUp className="h-8 w-8 text-green-400" /> },
        { title: 'Órdenes Totales', value: totalOrders, color: 'from-blue-900/30 to-blue-800/30 border-blue-500/30', icon: <Package className="h-8 w-8 text-blue-400" /> },
        { title: 'Clientes Únicos', value: uniqueCustomersValue, color: 'from-purple-900/30 to-purple-800/30 border-purple-500/30', icon: <Users className="h-8 w-8 text-purple-400" /> },
        { title: 'Devoluciones', value: totalReturns, color: 'from-orange-900/30 to-orange-800/30 border-orange-500/30', icon: <RotateCcw className="h-8 w-8 text-orange-400" /> },
        { title: 'Ganancia Joyero', value: `$${jewelerEarnings.toLocaleString()}`, color: 'from-yellow-900/30 to-yellow-800/30 border-yellow-500/30', icon: <Coins className="h-8 w-8 text-yellow-400" /> },
        { title: 'Comisión Plataforma', value: `$${platformFees.toLocaleString()}`, color: 'from-teal-900/30 to-teal-800/30 border-teal-500/30', icon: <DollarSign className="h-8 w-8 text-teal-400" /> },
      ].map((metric, i) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`bg-gradient-to-r ${metric.color} border rounded-lg p-6`}
        >
          <div className="grid grid-cols-5 gap-4 h-full">
            {/* Columna para texto (4/5 del ancho) */}
            <div className="col-span-4">
              <p className="text-xs font-medium text-gray-300 mb-1">{metric.title}</p>
              <p className="text-sm font-bold text-white truncate">{metric.value}</p>
            </div>
            
            {/* Columna para icono (1/5 del ancho) - alineado al centro */}
            <div className="col-span-1 flex items-center justify-center">
              <div className="w-6 h-6 flex items-center justify-center bg-black/20 rounded-full">
            {metric.icon}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    {/* 📈 Gráfico de evolución de ventas */}
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Evolución de Ventas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dashboardData.salesSummary.slice().reverse()}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="date" 
            stroke="#aaa"
            tickFormatter={(dateStr, index) => {
              const date = new Date(dateStr);
              const dataLength = dashboardData.salesSummary.length;
              
              // Determinar si mostrar esta etiqueta
              let shouldShow = false;
              
              if (dataLength <= 10) {
                shouldShow = true; // Mostrar todas si son pocas
              } else if (dataLength <= 20) {
                shouldShow = index % 2 === 0; // Mostrar cada 2da
              } else if (dataLength <= 30) {
                shouldShow = index % 3 === 0; // Mostrar cada 3ra
              } else {
                shouldShow = index % Math.ceil(dataLength / 8) === 0; // Máximo 8
              }
              
              if (shouldShow) {
                return date.toLocaleDateString('es-ES', { 
                  month: 'numeric', 
                  day: 'numeric' 
                });
              }
              return '';
            }}
            tick={{ fontSize: 11 }}
            interval={0} // Importante: desactivar intervalo automático
            height={40}
          />
          <YAxis stroke="#aaa" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
            formatter={(value, name) => {
              const nameMap: Record<string, string> = {
                total_sales: 'Ventas',
                total_orders: 'Pedidos'
              };
              return [value, nameMap[name as string] || name];
            }}
            labelFormatter={(dateStr) => {
              const date = new Date(dateStr);
              return date.toLocaleDateString('es-ES', { 
                year: 'numeric',
                month: 'long', 
                day: 'numeric' 
              });
            }}
          />
          <Line type="monotone" dataKey="total_sales" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="total_orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}


        {activeTab === 'products' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.products ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Producto / Modelo / Talla</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {(() => {
                    const currentPagination = pagination.products;
                    const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                    const endIndex = startIndex + currentPagination.limit;
                    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
                    
                    return paginatedProducts.map((product) => {
                      // Agrupar variantes por modelo
                      const productVariants = variants[product.id] || [];
                      const defaultVariant = productVariants.find(v => v.is_default === true);
                      const variantsByModel = productVariants.reduce((acc, variant) => {
                        const modelKey = variant.model || 'default';
                        if (!acc[modelKey]) {
                          acc[modelKey] = [];
                        }
                        acc[modelKey].push(variant);
                        return acc;
                      }, {} as Record<string, typeof productVariants>);
                      
                      // Ordenar modelos: primero el default, luego los demás
                      const modelKeys = Object.keys(variantsByModel).sort((a, b) => {
                        if (a === 'default' || defaultVariant?.model === a) return -1;
                        if (b === 'default' || defaultVariant?.model === b) return 1;
                        return a.localeCompare(b);
                      });
                      
                      return (
                        <React.Fragment key={product.id}>
                          {/* Fila del producto */}
                          <tr className="bg-gray-800/50">
                            <td className="px-6 py-4 whitespace-nowrap" colSpan={5}>
                              <div className="flex items-center space-x-4">
                                {isVideoUrl(product.image) ? (
                                  <video
                                    src={buildMediaUrl(product.image)}
                                    className="h-12 w-12 rounded-md object-cover"
                                    muted
                                    playsInline
                                  />
                                ) : (
                                  <img
                                    src={buildMediaUrl(product.image)}
                                    alt={product.name}
                                    className="h-12 w-12 rounded-md object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="font-bold text-lg">{product.name}</div>
                                  <div className="text-gray-400 text-sm">{categories.find(c => c.id === product.category_id)?.name || 'Sin categoría'}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      const defaultV = variants[product.id]?.find((v: ProductVariant) => v.is_default);
                                      setEditingProduct({
                                        ...product,
                                        sku: (defaultV as any)?.sku ?? (product as any).sku ?? '',
                                        ...(defaultV && {
                                          metal_type: defaultV.metal_type ?? undefined,
                                          carat: defaultV.carat ?? undefined
                                        })
                                      } as Product);
                                    }}
                                    className="text-blue-400 hover:text-blue-300"
                                    title="Editar producto"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      fetchProductDetails(product.id);
                                      setShowProductDetails({ show: true, productId: product.id });
                                    }}
                                    className="text-green-400 hover:text-green-300"
                                    title="Ver detalles"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  {isAdmin() && (
                                    <button
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="text-red-400 hover:text-red-300"
                                      title="Eliminar producto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Modelos y sus tallas */}
                          {modelKeys.map((modelKey) => {
                            const modelVariants = variantsByModel[modelKey];
                            const isDefaultModel = modelKey === 'default' || defaultVariant?.model === modelKey;
                            const firstVariant = modelVariants[0];
                            const modelImage = isDefaultModel 
                              ? product.image 
                              : (firstVariant?.image && !firstVariant?.use_product_images ? firstVariant.image : product.image);
                            
                            return (
                              <React.Fragment key={modelKey}>
                                {/* Fila del modelo */}
                                <tr className="bg-gray-750/50">
                                  <td className="px-6 py-3 whitespace-nowrap pl-12">
                                    <div className="flex items-center space-x-3">
                                      {modelImage && (
                                        isVideoUrl(modelImage) ? (
                                          <video
                                            src={buildMediaUrl(modelImage)}
                                            className="h-10 w-10 rounded-md object-cover"
                                            muted
                                            playsInline
                                          />
                                        ) : (
                                          <img
                                            src={buildMediaUrl(modelImage)}
                                            alt={firstVariant?.name || product.name}
                                            className="h-10 w-10 rounded-md object-cover"
                                          />
                                        )
                                      )}
                                      <div>
                                        <div className="font-medium text-gray-200">
                                          {isDefaultModel ? 'Default o Modelo Principal' : (firstVariant?.model || 'Sin modelo')}
                                        </div>
                                        <div className="text-gray-400 text-xs">
                                          SKU: {(firstVariant as any)?.sku || '—'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="text-sm">${firstVariant?.price?.toFixed(2) || product.price.toFixed(2)}</div>
                                    <div className="text-gray-400 text-xs">SKU: {(firstVariant as any)?.sku || '—'}</div>
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="text-gray-400 text-xs">
                                      {modelVariants.length} talla{modelVariants.length !== 1 ? 's' : ''}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${firstVariant?.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                      {firstVariant?.is_active !== false ? 'Activo' : 'Inactivo'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => {
                                          // Editar el modelo (primera variante del modelo)
                                          const variantWithImages = variants[product.id]?.find(v => v.id === firstVariant.id);
                                          setEditingVariant({
                                            id: Number(firstVariant.id),
                                            product_id: Number(firstVariant.product_id),
                                            sku: (firstVariant as any).sku ?? '',
                                            name: firstVariant.name,
                                            price: Number(firstVariant.price),
                                            original_price: firstVariant.original_price ? Number(firstVariant.original_price) : undefined,
                                            model: firstVariant.model || '',
                                            size: firstVariant.size || '',
                                            stock: Number(firstVariant.stock || 0),
                                            metal_type: firstVariant.metal_type ?? null,
                                            carat: firstVariant.carat ?? null,
                                            image: firstVariant.image || null,
                                            variant_images: (variantWithImages as any)?.variant_images || [],
                                            is_default: firstVariant.is_default || false,
                                            use_product_images: firstVariant.use_product_images ?? true,
                                            use_model_images: firstVariant.use_model_images ?? false,
                                            image_reference_variant_id: firstVariant.image_reference_variant_id || null
                                          });
                                        }}
                                        className="text-blue-400 hover:text-blue-300 text-xs"
                                        title="Editar modelo"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setShowAddVariant({ show: true, productId: Number(product.id) });
                                          setNewVariant({ 
                                            sku: '',
                                            name: '', 
                                            price: firstVariant?.price || product.price, 
                                            original_price: firstVariant?.original_price || product.original_price, 
                                            model: isDefaultModel ? '' : (firstVariant?.model || ''), 
                                            size: '', 
                                            stock: 0, 
                                            metal_type: null,
                                            carat: undefined,
                                            imageFile: null, 
                                            is_active: true, 
                                            is_default: false,
                                            use_product_images: true,
                                            use_model_images: false,
                                            image_reference_variant_id: null
                                          });
                                          setNewVariantGalleryFiles(null);
                                        }}
                                        className="text-yellow-400 hover:text-yellow-300 text-xs"
                                        title="Agregar talla a este modelo"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                
                                {/* Filas de tallas */}
                                {modelVariants.map((variant) => (
                                  <tr key={variant.id} className="bg-gray-700/30">
                                    <td className="px-6 py-2 whitespace-nowrap pl-20">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-gray-300">#</span>
                                        <span className="font-medium text-gray-200">{variant.size || 'Sin talla'}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap">
                                      <div className="text-sm">${variant.price.toFixed(2)}</div>
                                      <div className="text-gray-400 text-xs">SKU: {(variant as any)?.sku || '—'}</div>
                                      {variant.original_price && variant.original_price > variant.price && (
                                        <div className="text-xs text-gray-400 line-through">
                                          ${variant.original_price.toFixed(2)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap">
                                      {editingStock?.variantId === variant.id ? (
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="number"
                                            value={editingStock.value}
                                            onChange={(e) =>
                                              setEditingStock({
                                                ...editingStock,
                                                value: parseInt(e.target.value) || 0
                                              })
                                            }
                                            className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                                          />
                                          <button
                                            onClick={handleStockUpdate}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <Save className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => setEditingStock(null)}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm">{variant.stock || 0}</span>
                                          <button
                                            onClick={() =>
                                              setEditingStock({
                                                productId: product.id,
                                                variantId: variant.id,
                                                value: variant.stock || 0
                                              })
                                            }
                                            className="text-yellow-400 hover:text-yellow-300"
                                            title="Editar stock de talla"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variant.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {variant.is_active !== false ? 'Activo' : 'Inactivo'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-2 whitespace-nowrap">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => {
                                            const variantWithImages = variants[product.id]?.find(v => v.id === variant.id);
                                            setEditingVariant({
                                              id: Number(variant.id),
                                              product_id: Number(variant.product_id),
                                              sku: (variant as any).sku ?? '',
                                              name: variant.name,
                                              price: Number(variant.price),
                                              original_price: variant.original_price ? Number(variant.original_price) : undefined,
                                              model: variant.model || '',
                                              size: variant.size || '',
                                              stock: Number(variant.stock || 0),
                                              metal_type: variant.metal_type ?? null,
                                              carat: variant.carat ?? null,
                                              image: variant.image || null,
                                              variant_images: (variantWithImages as any)?.variant_images || [],
                                              is_default: variant.is_default || false,
                                              use_product_images: variant.use_product_images ?? true,
                                              use_model_images: variant.use_model_images ?? false,
                                              image_reference_variant_id: variant.image_reference_variant_id || null
                                            });
                                          }}
                                          className="text-blue-400 hover:text-blue-300"
                                          title="Editar talla"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </button>
                                        {!variant.is_default && (
                                        <button
                                          onClick={() => handleDeleteVariant(Number(variant.id))}
                                          className="text-red-400 hover:text-red-300"
                                          title="Eliminar talla"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            )}
            {(() => {
              const currentPagination = pagination.products;
              const totalRecords = filteredProducts.length;
              const totalPages = Math.max(1, Math.ceil(totalRecords / currentPagination.limit));
              const startIndex = (currentPagination.page - 1) * currentPagination.limit;
              const endIndex = startIndex + currentPagination.limit;

              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between px-6 py-3 bg-gray-700">
                  <div className="text-sm text-gray-400">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, totalRecords)} de {totalRecords}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setPagination(prev => ({
                          ...prev,
                          products: { ...prev.products, page: prev.products.page - 1 }
                        }));
                        window.scrollTo(0, 0);
                      }}
                      disabled={currentPagination.page <= 1}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-300">
                      Página {currentPagination.page} de {totalPages}
                    </span>
                    <button
                      onClick={() => {
                        setPagination(prev => ({
                          ...prev,
                          products: { ...prev.products, page: prev.products.page + 1 }
                        }));
                        window.scrollTo(0, 0);
                      }}
                      disabled={currentPagination.page >= totalPages}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {(shippingStatusMessage || selectedOrderIds.length > 0) && (
              <div className="px-6 pt-4 space-y-2">
                {shippingStatusMessage && (
                  <div className="text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
                    {shippingStatusMessage}
                  </div>
                )}
                <div className="text-sm text-gray-300">
                  Órdenes seleccionadas: {selectedOrderIds.length}
                </div>
              </div>
            )}
            {loading.orders ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      {(() => {
                        const currentPagination = pagination.orders;
                        const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                        const endIndex = startIndex + currentPagination.limit;
                        const currentPageOrders = filteredOrders.slice(startIndex, endIndex);
                        const allSelected = currentPageOrders.length > 0 && currentPageOrders.every(o => selectedOrderIds.includes(o.id as number));
                        const someSelected = currentPageOrders.some(o => selectedOrderIds.includes(o.id as number));
                        return (
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => {
                              if (el) el.indeterminate = !allSelected && someSelected;
                            }}
                            onChange={() => toggleSelectAllCurrentPage(currentPageOrders)}
                            aria-label="Seleccionar todas las órdenes de la página"
                          />
                        );
                      })()}
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Orden ID</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Total</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Enviado</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Código de Rastreo</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Paquetería</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {(() => {
                    const currentPagination = pagination.orders;
                    const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                    const endIndex = startIndex + currentPagination.limit;
                    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
                    return paginatedOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id as number)}
                          onChange={() => toggleOrderSelection(order.id as number)}
                          aria-label={`Seleccionar orden ${order.order_number || order.id}`}
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="font-medium text-sm">#{order.order_number || order.id}</div>
                        <div className="text-gray-400 text-xs">
                          {order.order_items?.length || 0} producto(s)
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                        {order.created_at ? (() => {
                          const orderDate = new Date(order.created_at);
                          const today = new Date();
                          const isToday = orderDate.toDateString() === today.toDateString();
                          if (isToday) {
                            return orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                          }
                          return orderDate.toLocaleDateString();
                        })() : 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            order.status === 'entregado'
                              ? 'bg-green-500/20 text-green-400'
                              : order.status === 'pagado'
                                ? 'bg-blue-500/20 text-blue-400'
                                : order.status === 'cancelado'
                                  ? 'bg-red-500/20 text-red-400'
                                  : order.status === 'devuelto' || order.status === 'parcialmente_devuelto' || order.status === 'reembolsado'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : order.status === 'procesando' || order.status === 'enviado'
                                      ? 'bg-cyan-500/20 text-cyan-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                        >
                          {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase() : order.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        {editingSubmitted?.orderId === order.id ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={editingSubmitted.value ? 'true' : 'false'}
                              onChange={(e) =>
                                setEditingSubmitted({
                                  ...editingSubmitted,
                                  value: e.target.value === 'true'
                                })
                              }
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
                            >
                              <option value="false">No enviado</option>
                              <option value="true">Enviado</option>
                            </select>
                            <button
                              onClick={handleSubmittedUpdate}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingSubmitted(null)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className={`px-2 py-1 rounded text-xs ${order.is_submitted
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                              }`}>
                              {order.is_submitted ? 'Enviado' : 'No enviado'}
                            </span>
                            <button
                              onClick={() =>
                                setEditingSubmitted({
                                  orderId: order.id,
                                  value: order.is_submitted || false
                                })
                              }
                              className="ml-2 text-yellow-400 hover:text-yellow-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.tracking_code ? (
                            <>
                              <Package className="h-4 w-4 mr-2 text-yellow-400" />
                              <span>{order.tracking_code}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Sin código</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-gray-300">
                            {order.courier_id ?
                              couriers.find(c => c.id === order.courier_id)?.name || 'Paquetería no encontrada' :
                              'Sin paquetería'
                            }
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              fetchOrderDetails(order.id);
                              setShowOrderDetails({ show: true, orderId: order.id });
                            }}
                            className="text-blue-400 hover:text-blue-300"
                            title="Ver detalles"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                          {order.status !== 'devuelto' && order.status !== 'cancelado' && (
                            <button
                              onClick={() => {
                                setCurrentOrder(order);
                                setShowReturnModal({ show: true, orderId: order.id });
                              }}
                              className="text-orange-400 hover:text-orange-300"
                              title="Procesar devolución"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
            <PaginationControls type="orders" filteredData={filteredOrders} />
          </div>
        )}

        {activeTab === 'couriers' && canViewCouriers && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center"><Truck className="h-5 w-5 mr-2"/>Paqueterías</h3>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">URL Tracking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Logo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(() => {
                  const currentPagination = pagination.couriers;
                  const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                  const endIndex = startIndex + currentPagination.limit;
                  const paginatedCouriers = couriers.slice(startIndex, endIndex);
                  return paginatedCouriers.map(c => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-white">{c.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300">{c.url || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {c.logo ? (
                          <img src={c.logo} alt={c.name} className="h-24 w-24 object-contain rounded"/>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
            <PaginationControls type="couriers" filteredData={couriers} />
          </div>
        )}

        {activeTab === 'packages' && isAdmin() && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.packages ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Peso vacío (g)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Dimensiones (cm)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Activo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {(() => {
                    const currentPagination = pagination.packages;
                    const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                    const endIndex = startIndex + currentPagination.limit;
                    const paginatedPackages = filteredPackages.slice(startIndex, endIndex);
                    return paginatedPackages.map(pkg => (
                      <tr key={pkg.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-white">{pkg.name}</div>
                          <div className="text-xs text-gray-400">ID: {pkg.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{pkg.empty_weight_grams} g</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {pkg.length_cm} x {pkg.width_cm} x {pkg.height_cm}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${pkg.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-300'}`}>
                            {pkg.is_active ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingPackage({ ...pkg })}
                              className="text-blue-400 hover:text-blue-300"
                              title="Editar paquete"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Eliminar paquete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
            <PaginationControls type="packages" filteredData={filteredPackages} />
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.returns ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID Devolución</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Orden ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Razón</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Procesado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {(() => {
                    const currentPagination = pagination.returns;
                    const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                    const endIndex = startIndex + currentPagination.limit;
                    const paginatedReturns = filteredReturns.slice(startIndex, endIndex);
                    return paginatedReturns.map((returnItem) => (
                    <tr key={returnItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">#{returnItem.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">#{(returnItem as any).order?.order_number ?? (returnItem as any).orders?.order_number ?? returnItem.order_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(returnItem.returned_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-300">{returnItem.reason || 'Sin razón especificada'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-300">{returnItem.name_admin || returnItem.admin?.name || returnItem.admin?.email || 'Sistema'}</span>
                      </td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
            {(() => {
              const currentPagination = pagination.returns;
              const totalRecords = filteredReturns.length;
              const totalPages = Math.max(1, Math.ceil(totalRecords / currentPagination.limit));
              const startIndex = (currentPagination.page - 1) * currentPagination.limit;
              const endIndex = startIndex + currentPagination.limit;

              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between px-6 py-3 bg-gray-700">
                  <div className="text-sm text-gray-400">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, totalRecords)} de {totalRecords}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setPagination(prev => ({
                          ...prev,
                          returns: { ...prev.returns, page: prev.returns.page - 1 }
                        }));
                        window.scrollTo(0, 0);
                      }}
                      disabled={currentPagination.page <= 1}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-300">
                      Página {currentPagination.page} de {totalPages}
                    </span>
                    <button
                      onClick={() => {
                        setPagination(prev => ({
                          ...prev,
                          returns: { ...prev.returns, page: prev.returns.page + 1 }
                        }));
                        window.scrollTo(0, 0);
                      }}
                      disabled={currentPagination.page >= totalPages}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'users' && isAdmin() && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.users ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="all">Todos los roles</option>
                      <option value="admin">Admin</option>
                      <option value="worker">Worker</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Rol Actual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha Registro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-700">
                  {(() => {
                    const currentPagination = pagination.users;
                    const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                    const endIndex = startIndex + currentPagination.limit;
                    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
                    return paginatedUsers.map((userItem) => (
                    <tr key={userItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{userItem.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300">{userItem.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${userItem.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                          userItem.role === 'worker' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                          {userItem.role?.toUpperCase() || 'CUSTOMER'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300">
                          {userItem.created_at ? new Date(userItem.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={userItem.role || 'customer'}
                          onChange={(e) => handleRoleChange(userItem.id, e.target.value as UserRole)}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        >
                          <option value="customer">Customer</option>
                          <option value="worker">Worker</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
              </>
            )}
            {(() => {
              const currentPagination = pagination.users;
              const totalRecords = filteredUsers.length;
              const totalPages = Math.max(1, Math.ceil(totalRecords / currentPagination.limit));
              const startIndex = (currentPagination.page - 1) * currentPagination.limit;
              const endIndex = startIndex + currentPagination.limit;

              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between px-6 py-3 bg-gray-700">
                  <div className="text-sm text-gray-400">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, totalRecords)} de {totalRecords}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setPagination(prev => ({
                          ...prev,
                          users: { ...prev.users, page: prev.users.page - 1 }
                        }));
                        window.scrollTo(0, 0);
                      }}
                      disabled={currentPagination.page <= 1}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-300">
                      Página {currentPagination.page} de {totalPages}
                    </span>
                    <button
                      onClick={() => {
                        setPagination(prev => ({
                          ...prev,
                          users: { ...prev.users, page: prev.users.page + 1 }
                        }));
                        window.scrollTo(0, 0);
                      }}
                      disabled={currentPagination.page >= totalPages}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Modal para agregar producto */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold">Agregar Nuevo Producto</h3>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={newProduct.is_active ?? false}
                    onChange={(e) => setNewProduct({ ...newProduct, is_active: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-8 rounded-full ${
                    newProduct.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${
                    newProduct.is_active ? 'transform translate-x-6' : ''
                  }`}></div>
                </div>
                <span className="ml-3 text-gray-300 font-medium">
                  {newProduct.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm">Peso (gramos)</label>
                <input
                  type="number"
                  value={newProduct.weight_grams || 100}
                  onChange={(e) => setNewProduct({ ...newProduct, weight_grams: parseFloat(e.target.value) || 100 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                  placeholder="100"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm">SKU (modelo principal)</label>
                <input
                  type="text"
                  value={newProduct.sku || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                  placeholder="Ej: PROD-001"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm">Nombre</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                  placeholder="Nombre del producto"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Precio</label>
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Precio Original</label>
                <input
                  type="number"
                  value={newProduct.original_price || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Categoría</label>
                <select
                  value={newProduct.category_id}
                  onChange={(e) => setNewProduct({ ...newProduct, category_id: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Material</label>
                <input
                  type="text"
                  value={newProduct.material || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Oro, plata, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Metal / tipo</label>
                  <select
                    value={newProduct.metal_type ?? ''}
                    onChange={(e) => setNewProduct({ ...newProduct, metal_type: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="">Ninguno</option>
                    {(metalTypesList.length ? metalTypesList : metalTypes || []).map((mt: { id: number; name: string }) => (
                      <option key={mt.id} value={mt.id}>{mt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Quilates (k)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newProduct.carat ?? ''}
                    onChange={(e) => setNewProduct({ ...newProduct, carat: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="Ej: 14"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Stock</label>
                <input
                  type="number"
                  value={newProduct.stock || 0}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
              {/* Configuración de imágenes: producto base o variante */}
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2 text-sm font-medium">Configuración de Imágenes</label>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="newProductImageMode"
                      checked={newProduct.product_image_mode === 'base'}
                      onChange={() => setNewProduct({ ...newProduct, product_image_mode: 'base' })}
                      className="mt-1 mr-2"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-200">Imágenes para el producto base</span>
                      <p className="text-xs text-gray-400 mt-0.5">Las imágenes se usarán como imágenes del producto principal (modelo principal las hereda)</p>
                    </div>
                  </label>
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="newProductImageMode"
                      checked={newProduct.product_image_mode === 'variant'}
                      onChange={() => setNewProduct({ ...newProduct, product_image_mode: 'variant' })}
                      className="mt-1 mr-2"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-200">Imágenes propias de la variante</span>
                      <p className="text-xs text-gray-400 mt-0.5">Las imágenes serán solo del modelo principal (variante default)</p>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Imagen Principal</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    setProductMainImageFile(file);
                    if (file) {
                      const preview = await createImagePreview(file);
                      setProductMainImagePreview(preview);
                    } else {
                      setProductMainImagePreview(null);
                    }
                  }}
                />
                {productMainImagePreview && (
                  <div className="mt-2">
                    <img src={productMainImagePreview} alt="Preview" className="h-32 w-full object-cover rounded-lg border border-gray-700" />
              </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1 text-sm">Imágenes Complementarias</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                  onChange={async (e) => {
                    const files = e.target.files;
                    setProductGalleryFiles(files);
                    if (files) {
                      const previews = await Promise.all(Array.from(files).map(createImagePreview));
                      setProductGalleryPreviews(previews);
                    } else {
                      setProductGalleryPreviews([]);
                    }
                  }}
                />
                {productGalleryPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {productGalleryPreviews.map((preview, idx) => (
                      <img key={idx} src={preview} alt={`Preview ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                    ))}
                  </div>
                )}
              </div>
              {/* Estado y Envío y valor: una fila cada uno con checkboxes */}
              <div className="md:col-span-2">
                <span className="text-gray-300 text-sm font-medium block mb-2">Estado</span>
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.in_stock || false}
                      onChange={(e) => setNewProduct({ ...newProduct, in_stock: e.target.checked })}
                      className="mr-2"
                    />
                    En Stock
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.is_new || false}
                      onChange={(e) => setNewProduct({ ...newProduct, is_new: e.target.checked })}
                      className="mr-2"
                    />
                    Nuevo
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.is_featured || false}
                      onChange={(e) => setNewProduct({ ...newProduct, is_featured: e.target.checked })}
                      className="mr-2"
                    />
                    Destacado
                  </label>
                </div>
                <span className="text-gray-300 text-sm font-medium block mb-2">Envío y valor</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center opacity-60 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={newProduct.is_high_value || false}
                      disabled
                      className="mr-2"
                    />
                    Alto Valor (automático)
                  </label>
                  <label className="flex items-center opacity-60 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={newProduct.requires_special_shipping || false}
                      disabled
                      className="mr-2"
                    />
                    Envío Especial (automático)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProduct.has_warranty || false}
                      onChange={(e) => setNewProduct({ ...newProduct, has_warranty: e.target.checked })}
                      className="mr-2"
                    />
                    Tiene Garantía
                  </label>
                </div>
              </div>
              {newProduct.has_warranty && (
                <>
                  <div>
                    <label className="block text-gray-300 mb-1">Unidad de Garantía</label>
                    <select
                      value={newProduct.warranty_unit || ''}
                      onChange={(e) => setNewProduct({
                        ...newProduct,
                        warranty_unit: e.target.value,
                        warranty_period: e.target.value === 'lifetime' ? undefined : newProduct.warranty_period
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      <option value="">Seleccionar unidad</option>
                      <option value="lifetime">De por vida</option>
                      <option value="dias">Días</option>
                      <option value="meses">Meses</option>
                      <option value="años">Años</option>
                    </select>
                  </div>
                  {newProduct.warranty_unit !== 'lifetime' && (
                    <div>
                      <label className="block text-gray-300 mb-1">Período de Garantía</label>
                      <input
                        type="number"
                        value={newProduct.warranty_period || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, warranty_period: parseInt(e.target.value) || undefined })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                        placeholder="Ej: 12"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={newProduct.description || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  rows={3}
                  placeholder="Descripción del producto"
                />
              </div>
              {newProduct.has_warranty && (
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-1">Descripción de Garantía</label>
                  <textarea
                    value={newProduct.warranty_description || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, warranty_description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    rows={2}
                    placeholder="Descripción detallada de la garantía"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
              >
                Agregar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para procesar devolución */}
      {showReturnModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              <h3 className="text-lg font-bold">Procesar Devolución - Orden #{showReturnModal.orderId}</h3>
            </div>

            {/* Tipo de devolución */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 font-medium">Tipo de Devolución:</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="full"
                    checked={returnType === 'full'}
                    onChange={(e) => setReturnType(e.target.value as 'full' | 'partial' | 'refund')}
                    className="mr-2"
                  />
                  Devolución Completa
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="partial"
                    checked={returnType === 'partial'}
                    onChange={(e) => setReturnType(e.target.value as 'full' | 'partial' | 'refund')}
                    className="mr-2"
                  />
                  Devolución Parcial
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="refund"
                    checked={returnType === 'refund'}
                    onChange={(e) => setReturnType(e.target.value as 'full' | 'partial' | 'refund')}
                    className="mr-2"
                  />
                  Reembolso (Solo dinero, sin devolver productos)
                </label>
              </div>
            </div>

            {/* Selección de productos para devolución parcial */}
            {(returnType === 'partial' || returnType === 'refund') && currentOrder && returnType === 'partial' && (
              <div className="mb-4">
                <label className="block text-gray-300 mb-2 font-medium">Productos a Devolver:</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {currentOrder.order_items?.map((item, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium">
                            {item.product?.name || `Producto ${item.product_id}`}
                          </span>
                          {item.variant_id && (
                            <span className="text-gray-400 text-sm ml-2">
                              (Variante: {item.variant_id})
                            </span>
                          )}
                          <div className="text-sm text-gray-400">
                            Cantidad: {item.quantity} | Precio: ${item.price}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            placeholder="Cantidad"
                            className="w-20 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 0;
                              if (quantity > 0) {
                                setSelectedReturnItems(prev => {
                                  const existing = prev.find(p => p.product_id === item.product_id && p.variant_id === item.variant_id);
                                  if (existing) {
                                    return prev.map(p =>
                                      p.product_id === item.product_id && p.variant_id === item.variant_id
                                        ? { ...p, quantity }
                                        : p
                                    );
                                  } else {
                                    return [...prev, {
                                      product_id: item.product_id,
                                      variant_id: item.variant_id,
                                      quantity,
                                      reason: ''
                                    }];
                                  }
                                });
                              } else {
                                setSelectedReturnItems(prev =>
                                  prev.filter(p => !(p.product_id === item.product_id && p.variant_id === item.variant_id))
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <textarea
              placeholder="Razón de la devolución (opcional)"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-4"
              rows={3}
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowReturnModal({ show: false, orderId: null });
                  setReturnReason('');
                  setReturnType('full');
                  setSelectedReturnItems([]);
                  setCurrentOrder(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={returnType === 'partial' && selectedReturnItems.length === 0}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {returnType === 'refund' ? 'Procesar Reembolso' : 'Procesar Devolución'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar producto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold">Editar Producto</h3>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_active ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-8 rounded-full ${
                    editingProduct.is_active ?? true ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${
                    editingProduct.is_active ?? true ? 'transform translate-x-6' : ''
                  }`}></div>
                </div>
                <span className="ml-3 text-gray-300 font-medium">
                  {editingProduct.is_active ?? true ? 'Activo' : 'Inactivo'}
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              
              <div>
                <label className="block text-gray-300 mb-1">SKU (modelo principal, solo lectura)</label>
                <input
                  type="text"
                  value={editingProduct.sku ?? ''}
                  readOnly
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 opacity-80 cursor-not-allowed"
                  placeholder="Del modelo principal"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Precio</label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Precio Original</label>
                <input
                  type="number"
                  value={editingProduct.original_price || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, original_price: parseFloat(e.target.value) || undefined })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Categoría</label>
                <select
                  value={editingProduct.category_id}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category_id: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Material</label>
                <input
                  type="text"
                  value={editingProduct.material || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Metal / tipo</label>
                <select
                  value={(editingProduct as any).metal_type ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, metal_type: e.target.value ? Number(e.target.value) : undefined } as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="">Ninguno</option>
                  {(metalTypesList.length ? metalTypesList : metalTypes || []).map((mt: { id: number; name: string }) => (
                    <option key={mt.id} value={mt.id}>{mt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Quilates (k)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={(editingProduct as any).carat ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, carat: e.target.value ? parseFloat(e.target.value) : undefined } as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Ej: 14"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Stock</label>
                <input
                  type="number"
                  value={editingProduct.stock || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Peso (gramos)</label>
                <input
                  type="number"
                  value={editingProduct.weight_grams || 100}
                  onChange={(e) => setEditingProduct({ ...editingProduct, weight_grams: parseFloat(e.target.value) || 100 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="100"
                  min="0"
                  step="0.1"
                />
              </div>
              {/* Configuración de imágenes (edición): las del producto base o propias de la variante */}
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2 text-sm font-medium">Configuración de Imágenes</label>
                <p className="text-xs text-gray-400 mb-2">Las imágenes del producto se gestionan abajo. Para variantes concretas, edita cada variante.</p>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Imagen Principal</label>
                <div className="space-y-2">
                  {editingProduct.image && (
                    isVideoUrl(editingProduct.image) ? (
                      <video src={buildMediaUrl(editingProduct.image)} className="h-24 w-full object-cover rounded-lg" controls />
                    ) : (
                      <img src={buildMediaUrl(editingProduct.image)} alt={editingProduct.name} className="h-24 w-full object-cover rounded-lg" />
                    )
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      setProductMainImageFile(file);
                      if (file) {
                        const preview = await createImagePreview(file);
                        setProductMainImagePreview(preview);
                      } else {
                        setProductMainImagePreview(null);
                      }
                    }}
                  />
                  {productMainImagePreview && (
                    <div className="mt-2">
                      <img src={productMainImagePreview} alt="Preview" className="h-24 w-full object-cover rounded-lg border border-gray-700" />
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-gray-300 mb-1">Imágenes Complementarias</label>
                <div className="flex flex-wrap gap-3">
                  {editingProduct.images && editingProduct.images.length > 0 ? (
                    editingProduct.images.map(image => {
                      const isMarkedForDelete = imagesToDelete.includes(image.id);
                      return (
                        <div key={image.id} className={`relative ${isMarkedForDelete ? 'opacity-50' : ''}`}>
                        {isVideoUrl(image.url) ? (
                          <video src={buildMediaUrl(image.url)} className="h-20 w-20 object-cover rounded-lg border border-gray-700" muted playsInline />
                        ) : (
                          <img src={buildMediaUrl(image.url)} alt={editingProduct.name} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteProductImage(image.id)}
                            className={`absolute -top-2 -right-2 rounded-full h-5 w-5 text-xs ${isMarkedForDelete ? 'bg-gray-600 text-gray-300' : 'bg-red-600 text-white'}`}
                            title={isMarkedForDelete ? 'Marcada para eliminar' : 'Eliminar'}
                        >
                            {isMarkedForDelete ? '↩' : '×'}
                        </button>
                      </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">Sin imágenes adicionales</p>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2 text-sm"
                  onChange={async (e) => {
                    const files = e.target.files;
                    setEditingProductGalleryFiles(files);
                    if (files) {
                      const previews = await Promise.all(Array.from(files).map(createImagePreview));
                      setEditingProductGalleryPreviews(previews);
                    } else {
                      setEditingProductGalleryPreviews([]);
                    }
                  }}
                />
                {editingProductGalleryPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {editingProductGalleryPreviews.map((preview, idx) => (
                      <img key={idx} src={preview} alt={`Preview ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                    ))}
                  </div>
                )}
              </div>
              {/* Estado y Envío y valor: una fila cada uno */}
              <div className="md:col-span-2">
                <span className="text-gray-300 text-sm font-medium block mb-2">Estado</span>
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingProduct.in_stock || false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, in_stock: e.target.checked })}
                      className="mr-2"
                    />
                    En Stock
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingProduct.is_new || false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, is_new: e.target.checked })}
                      className="mr-2"
                    />
                    Nuevo
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingProduct.is_featured || false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })}
                      className="mr-2"
                    />
                    Destacado
                  </label>
                </div>
                <span className="text-gray-300 text-sm font-medium block mb-2">Envío y valor</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center opacity-60 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={editingProduct.is_high_value || false}
                      disabled
                      className="mr-2"
                    />
                    Alto Valor (automático)
                  </label>
                  <label className="flex items-center opacity-60 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={editingProduct.requires_special_shipping || false}
                      disabled
                      className="mr-2"
                    />
                    Envío Especial (automático)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingProduct.has_warranty || false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, has_warranty: e.target.checked })}
                      className="mr-2"
                    />
                    Tiene Garantía
                  </label>
                </div>
              </div>
              {editingProduct.has_warranty && (
                <>
                  <div>
                    <label className="block text-gray-300 mb-1">Unidad de Garantía</label>
                    <select
                      value={editingProduct.warranty_unit || ''}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        warranty_unit: e.target.value,
                        warranty_period: e.target.value === 'lifetime' ? undefined : editingProduct.warranty_period
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      <option value="">Seleccionar unidad</option>
                      <option value="lifetime">De por vida</option>
                      <option value="dias">Días</option>
                      <option value="meses">Meses</option>
                      <option value="años">Años</option>
                    </select>
                  </div>
                  {editingProduct.warranty_unit !== 'lifetime' && (
                    <div>
                      <label className="block text-gray-300 mb-1">Período de Garantía</label>
                      <input
                        type="number"
                        value={editingProduct.warranty_period || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, warranty_period: parseInt(e.target.value) || undefined })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                        placeholder="Ej: 12"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  rows={3}
                />
              </div>
              {editingProduct.has_warranty && (
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-1">Descripción de Garantía</label>
                  <textarea
                    value={editingProduct.warranty_description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, warranty_description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    rows={2}
                    placeholder="Descripción detallada de la garantía"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductMainImageFile(null);
                  setProductMainImagePreview(null);
                  setEditingProductGalleryFiles(null);
                  setEditingProductGalleryPreviews([]);
                  setImagesToDelete([]);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEditProduct(editingProduct)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar usuario */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Agregar Usuario</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <p className="text-sm text-gray-400">Debe ser el email con el que el usuario ya está registrado.</p>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
              >
                Agregar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar paquete */}
      {showAddPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Agregar Paquete</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newPackage.name || ''}
                  onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1">Peso vacío (g)</label>
                  <input
                    type="number"
                    value={newPackage.empty_weight_grams ?? 0}
                    onChange={(e) => setNewPackage({ ...newPackage, empty_weight_grams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Largo (cm)</label>
                  <input
                    type="number"
                    value={newPackage.length_cm ?? 0}
                    onChange={(e) => setNewPackage({ ...newPackage, length_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Ancho (cm)</label>
                  <input
                    type="number"
                    value={newPackage.width_cm ?? 0}
                    onChange={(e) => setNewPackage({ ...newPackage, width_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Alto (cm)</label>
                  <input
                    type="number"
                    value={newPackage.height_cm ?? 0}
                    onChange={(e) => setNewPackage({ ...newPackage, height_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={newPackage.is_active ?? true}
                  onChange={(e) => setNewPackage({ ...newPackage, is_active: e.target.checked })}
                  className="rounded"
                />
                <span>Activo</span>
              </label>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddPackage(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleAddPackage();
                  setShowAddPackage(false);
                }}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
              >
                Guardar paquete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar paquete */}
      {editingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Editar Paquete</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingPackage.name}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1">Peso vacío (g)</label>
                  <input
                    type="number"
                    value={editingPackage.empty_weight_grams}
                    onChange={(e) => setEditingPackage({ ...editingPackage, empty_weight_grams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Largo (cm)</label>
                  <input
                    type="number"
                    value={editingPackage.length_cm}
                    onChange={(e) => setEditingPackage({ ...editingPackage, length_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Ancho (cm)</label>
                  <input
                    type="number"
                    value={editingPackage.width_cm}
                    onChange={(e) => setEditingPackage({ ...editingPackage, width_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Alto (cm)</label>
                  <input
                    type="number"
                    value={editingPackage.height_cm}
                    onChange={(e) => setEditingPackage({ ...editingPackage, height_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={editingPackage.is_active}
                  onChange={(e) => setEditingPackage({ ...editingPackage, is_active: e.target.checked })}
                  className="rounded"
                />
                <span>Activo</span>
              </label>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setEditingPackage(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePackage}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar variante */}
      {showAddVariant.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold">Agregar Variante</h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newVariant.is_active ?? true}
                  onChange={(e) => setNewVariant({ ...newVariant, is_active: e.target.checked })}
                  className="sr-only"
                />
                <div className={`relative inline-block w-14 h-8 rounded-full ${newVariant.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${newVariant.is_active ? 'transform translate-x-6' : ''}`} />
                </div>
                <span className="ml-2 text-gray-300 text-sm">Activo</span>
              </label>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">SKU</label>
                  <input
                    type="text"
                    value={newVariant.sku || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="Ej: VAR-001"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newVariant.name}
                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Precio</label>
                  <input
                    type="number"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Precio Original</label>
                  <input
                    type="number"
                    value={newVariant.original_price || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, original_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={newVariant.model}
                    onChange={(e) => setNewVariant({ ...newVariant, model: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Talla</label>
                  <input
                    type="text"
                    value={newVariant.size}
                    onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Metal / tipo</label>
                  <select
                    value={newVariant.metal_type ?? ''}
                    onChange={(e) => setNewVariant({ ...newVariant, metal_type: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="">Ninguno</option>
                    {(metalTypesList.length ? metalTypesList : metalTypes || []).map((mt: { id: number; name: string }) => (
                      <option key={mt.id} value={mt.id}>{mt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Quilates (k)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newVariant.carat ?? ''}
                    onChange={(e) => setNewVariant({ ...newVariant, carat: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="Ej: 14"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Stock</label>
                <input
                  type="number"
                  value={newVariant.stock}
                  onChange={(e) => setNewVariant({ ...newVariant, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              {/* Configuración de imágenes: primero elección, después subida */}
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2 text-sm font-medium">Configuración de Imágenes</label>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="newImageMode"
                        checked={newVariant.use_product_images === true && newVariant.use_model_images !== true}
                        onChange={() => setNewVariant({ 
                          ...newVariant, 
                          use_product_images: true, 
                          use_model_images: false,
                          image_reference_variant_id: null
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes del producto base</span>
                        <p className="text-xs text-gray-400 mt-0.5">La variante usará las imágenes del producto principal</p>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="newImageMode"
                        checked={newVariant.use_product_images !== true && newVariant.use_model_images !== true}
                        onChange={() => setNewVariant({ 
                          ...newVariant, 
                          use_product_images: false, 
                          use_model_images: false,
                          image_reference_variant_id: null
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes propias</span>
                        <p className="text-xs text-gray-400 mt-0.5">La variante usará sus propias imágenes (subidas arriba)</p>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="newImageMode"
                        checked={newVariant.use_model_images === true && !newVariant.image_reference_variant_id}
                        onChange={() => setNewVariant({ 
                          ...newVariant, 
                          use_product_images: false, 
                          use_model_images: true,
                          image_reference_variant_id: null
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes de otra variante del mismo modelo</span>
                        <p className="text-xs text-gray-400 mt-0.5">Buscará automáticamente otra variante del mismo modelo con imágenes</p>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="newImageMode"
                        checked={newVariant.use_model_images === true && !!newVariant.image_reference_variant_id}
                        onChange={() => setNewVariant({ 
                          ...newVariant, 
                          use_product_images: false, 
                          use_model_images: true
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes de otra variante específica</span>
                        <p className="text-xs text-gray-400 mt-0.5">Selecciona una variante específica de la que heredar imágenes</p>
                        {newVariant.use_model_images === true && (
                          <select
                            value={newVariant.image_reference_variant_id || ''}
                            onChange={(e) => setNewVariant({ 
                              ...newVariant, 
                              image_reference_variant_id: e.target.value ? Number(e.target.value) : null
                            })}
                            className="mt-2 w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                          >
                            <option value="">Seleccionar variante...</option>
                            {(() => {
                              const productVariants = variants[showAddVariant.productId || 0] || [];
                              return productVariants
                                .filter(v => (v.variant_images?.length ?? 0) > 0 || v.image)
                                .map(v => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} {v.model ? `(${v.model})` : ''} {v.size ? `- ${v.size}` : ''}
                                  </option>
                                ));
                            })()}
                          </select>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm">Imagen Principal</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    setNewVariant({ ...newVariant, imageFile: file });
                    if (file) {
                      const preview = await createImagePreview(file);
                      setNewVariantImagePreview(preview);
                    } else {
                      setNewVariantImagePreview(null);
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                />
                {newVariantImagePreview && (
                  <div className="mt-2">
                    <img src={newVariantImagePreview} alt="Preview" className="h-24 w-full object-cover rounded-lg border border-gray-700" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1 text-sm">Imágenes complementarias</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                  onChange={async (e) => {
                    const files = e.target.files;
                    setNewVariantGalleryFiles(files);
                    if (files) {
                      const previews = await Promise.all(Array.from(files).map(createImagePreview));
                      setNewVariantGalleryPreviews(previews);
                    } else {
                      setNewVariantGalleryPreviews([]);
                    }
                  }}
                />
                {newVariantGalleryPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newVariantGalleryPreviews.map((preview, idx) => (
                      <img key={idx} src={preview} alt={`Preview ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowAddVariant({ show: false, productId: null });
                  setNewVariantGalleryFiles(null);
                  setNewVariantImagePreview(null);
                  setNewVariantGalleryPreviews([]);
                  setNewVariant({ sku: '', name: '', price: 0, original_price: undefined, model: '', size: '', stock: 0, metal_type: null, carat: undefined, imageFile: null, is_active: true, is_default: false, use_product_images: true, use_model_images: false, image_reference_variant_id: null });
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddVariant}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
              >
                Agregar Variante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar variante */}
      {editingVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold">Editar Variante</h3>
              {!editingVariant.is_default && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingVariant.is_active ?? true}
                    onChange={(e) => setEditingVariant({ ...editingVariant, is_active: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`relative inline-block w-14 h-8 rounded-full ${editingVariant.is_active ?? true ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${editingVariant.is_active ?? true ? 'transform translate-x-6' : ''}`} />
                  </div>
                  <span className="ml-2 text-gray-300 text-sm">Activo</span>
                </label>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-gray-300 mb-1">SKU</label>
                <input
                  type="text"
                  value={editingVariant.sku ?? ''}
                  onChange={(e) => setEditingVariant({ ...editingVariant, sku: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Ej: VAR-001"
                  readOnly={!!editingVariant.is_default}
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingVariant.name}
                  onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  readOnly={!!editingVariant.is_default}
                />
              </div>
              <div>
                <div>
                  <label className="block text-gray-300 mb-1">Precio</label>
                  <input
                    type="number"
                    value={editingVariant.price}
                    onChange={(e) => setEditingVariant({ ...editingVariant, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Precio Original</label>
                  <input
                    type="number"
                    value={editingVariant.original_price || ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, original_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <div>
                  <label className="block text-gray-300 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={editingVariant.model || ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, model: e.target.value })}
                    className={`w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 ${editingVariant.is_default ? 'cursor-not-allowed opacity-75' : ''}`}
                    readOnly={!!editingVariant.is_default}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Talla</label>
                  <input
                    type="text"
                    value={editingVariant.size || ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, size: e.target.value })}
                    className={`w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 ${editingVariant.is_default ? 'cursor-not-allowed opacity-75' : ''}`}
                    readOnly={!!editingVariant.is_default}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Metal / tipo</label>
                  <select
                    value={editingVariant.metal_type ?? ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, metal_type: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="">Ninguno</option>
                    {(metalTypesList.length ? metalTypesList : metalTypes || []).map((mt: { id: number; name: string }) => (
                      <option key={mt.id} value={mt.id}>{mt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Quilates (k)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={editingVariant.carat ?? ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, carat: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    placeholder="Ej: 14"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Stock</label>
                <input
                  type="number"
                  value={editingVariant.stock || 0}
                  onChange={(e) => setEditingVariant({ ...editingVariant, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Imagen Principal</label>
                <div className="space-y-2">
                  {editingVariant.image && (
                    isVideoUrl(editingVariant.image) ? (
                      <video src={buildMediaUrl(editingVariant.image)} className="h-24 w-full object-cover rounded-lg" controls />
                    ) : (
                      <img src={buildMediaUrl(editingVariant.image)} alt={editingVariant.name} className="h-24 w-full object-cover rounded-lg" />
                    )
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      setEditingVariantImageFile(file);
                      if (file) {
                        const preview = await createImagePreview(file);
                        setEditingVariantImagePreview(preview);
                      } else {
                        setEditingVariantImagePreview(null);
                      }
                    }}
                  />
                  {editingVariantImagePreview && (
                    <div className="mt-2">
                      <img src={editingVariantImagePreview} alt="Preview" className="h-24 w-full object-cover rounded-lg border border-gray-700" />
                </div>
                  )}
                </div>
              </div>
              {/* Configuración de herencia de imágenes */}
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2 text-sm font-medium">Configuración de Imágenes</label>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="imageMode"
                        checked={editingVariant.use_product_images === true && editingVariant.use_model_images !== true}
                        onChange={() => setEditingVariant({ 
                          ...editingVariant, 
                          use_product_images: true, 
                          use_model_images: false,
                          image_reference_variant_id: null
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes del producto base</span>
                        <p className="text-xs text-gray-400 mt-0.5">La variante usará las imágenes del producto principal</p>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="imageMode"
                        checked={editingVariant.use_product_images !== true && editingVariant.use_model_images !== true}
                        onChange={() => setEditingVariant({ 
                          ...editingVariant, 
                          use_product_images: false, 
                          use_model_images: false,
                          image_reference_variant_id: null
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes propias</span>
                        <p className="text-xs text-gray-400 mt-0.5">La variante usará sus propias imágenes (subidas arriba)</p>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="imageMode"
                        checked={editingVariant.use_model_images === true && !editingVariant.image_reference_variant_id}
                        onChange={() => setEditingVariant({ 
                          ...editingVariant, 
                          use_product_images: false, 
                          use_model_images: true,
                          image_reference_variant_id: null
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes de otra variante del mismo modelo</span>
                        <p className="text-xs text-gray-400 mt-0.5">Buscará automáticamente otra variante del mismo modelo con imágenes</p>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="imageMode"
                        checked={editingVariant.use_model_images === true && !!editingVariant.image_reference_variant_id}
                        onChange={() => setEditingVariant({ 
                          ...editingVariant, 
                          use_product_images: false, 
                          use_model_images: true
                        })}
                        className="mt-1 mr-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-200">Usar imágenes de otra variante específica</span>
                        <p className="text-xs text-gray-400 mt-0.5">Selecciona una variante específica de la que heredar imágenes</p>
                        {editingVariant.use_model_images === true && !!editingVariant.image_reference_variant_id && (
                          <select
                            value={editingVariant.image_reference_variant_id || ''}
                            onChange={(e) => setEditingVariant({ 
                              ...editingVariant, 
                              image_reference_variant_id: e.target.value ? Number(e.target.value) : null
                            })}
                            className="mt-2 w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                          >
                            <option value="">Seleccionar variante...</option>
                            {(() => {
                              const productVariants = variants[editingVariant.product_id] || [];
                              return productVariants
                                .filter(v => v.id !== editingVariant.id && ((v.variant_images?.length ?? 0) > 0 || v.image))
                                .map(v => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} {v.model ? `(${v.model})` : ''} {v.size ? `- ${v.size}` : ''}
                                  </option>
                                ));
                            })()}
                          </select>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-gray-300 mb-1">Imágenes complementarias</label>
                <div className="flex flex-wrap gap-3">
                  {editingVariant?.variant_images && editingVariant.variant_images.length > 0 ? (
                    editingVariant.variant_images.map(image => {
                      const isMarkedForDelete = variantImagesToDelete.includes(image.id);
                      return (
                        <div key={image.id} className={`relative ${isMarkedForDelete ? 'opacity-50' : ''}`}>
                        {isVideoUrl(image.url) ? (
                          <video src={buildMediaUrl(image.url)} className="h-20 w-20 object-cover rounded-lg border border-gray-700" muted playsInline />
                        ) : (
                          <img src={buildMediaUrl(image.url)} alt={editingVariant.name} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteVariantImage(image.id)}
                            className={`absolute -top-2 -right-2 rounded-full h-5 w-5 text-xs ${isMarkedForDelete ? 'bg-gray-600 text-gray-300' : 'bg-red-600 text-white'}`}
                            title={isMarkedForDelete ? 'Marcada para eliminar' : 'Eliminar'}
                        >
                            {isMarkedForDelete ? '↩' : '×'}
                        </button>
                      </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">Sin imágenes adicionales</p>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                  onChange={async (e) => {
                    const files = e.target.files;
                    setEditingVariantGalleryFiles(files);
                    if (files) {
                      const previews = await Promise.all(Array.from(files).map(createImagePreview));
                      setEditingVariantGalleryPreviews(previews);
                    } else {
                      setEditingVariantGalleryPreviews([]);
                    }
                  }}
                />
                {editingVariantGalleryPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingVariantGalleryPreviews.map((preview, idx) => (
                      <img key={idx} src={preview} alt={`Preview ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setEditingVariant(null);
                  setEditingVariantImageFile(null);
                  setEditingVariantImagePreview(null);
                  setEditingVariantGalleryFiles(null);
                  setEditingVariantGalleryPreviews([]);
                  setVariantImagesToDelete([]);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditVariant}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para detalles de producto */}
      {showProductDetails.show && productDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Detalles del Producto #{productDetails.id}</h3>
              <button
                onClick={() => setShowProductDetails({ show: false, productId: null })}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white mb-3">Información del Producto</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Nombre:</span>
                    <span className="text-white font-medium">{productDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Precio:</span>
                    <span className="text-white font-medium">${productDetails.price.toFixed(2)}</span>
                  </div>
                  {productDetails.original_price && productDetails.original_price > productDetails.price && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Precio Original:</span>
                      <span className="text-white font-medium line-through">${productDetails.original_price.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-300">Categoría:</span>
                    <span className="text-white font-medium">
                      {categories.find(c => c.id === productDetails.category_id)?.name || 'Sin categoría'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Material:</span>
                    <span className="text-white font-medium">{productDetails.material || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Stock:</span>
                    <span className="text-white font-medium">{productDetails.stock || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Peso:</span>
                    <span className="text-white font-medium">{productDetails.weight_grams || 100} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Estado:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${productDetails.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {productDetails.is_active !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">En Stock:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${productDetails.in_stock ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {productDetails.in_stock ? 'Sí' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Alto Valor:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${productDetails.is_high_value ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {productDetails.is_high_value ? 'Sí' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Envío Especial:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${productDetails.requires_special_shipping ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {productDetails.requires_special_shipping ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white mb-3">Imagen Principal</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  {productDetails.image && (
                    isVideoUrl(productDetails.image) ? (
                      <video src={buildMediaUrl(productDetails.image)} className="w-full h-64 object-cover rounded-lg" controls />
                    ) : (
                      <img src={buildMediaUrl(productDetails.image)} alt={productDetails.name} className="w-full h-64 object-cover rounded-lg" />
                    )
                  )}
                </div>
              </div>
            </div>

            {productDetails.description && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Descripción</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-300">{productDetails.description}</p>
                </div>
              </div>
            )}

            {productDetails.images && productDetails.images.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Imágenes Complementarias</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {productDetails.images.map(image => (
                    <div key={image.id}>
                      {isVideoUrl(image.url) ? (
                        <video src={buildMediaUrl(image.url)} className="w-full h-32 object-cover rounded-lg" muted playsInline />
                      ) : (
                        <img src={buildMediaUrl(image.url)} alt={productDetails.name} className="w-full h-32 object-cover rounded-lg" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productDetails.variants && productDetails.variants.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Variantes ({productDetails.variants.length})</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                  {productDetails.variants.map(variant => (
                    <div key={variant.id} className="flex items-center justify-between border-b border-gray-600 pb-3 last:border-0">
                      <div className="flex items-center space-x-3">
                        {variant.image && (
                          isVideoUrl(variant.image) ? (
                            <video src={buildMediaUrl(variant.image)} className="h-16 w-16 rounded object-cover" muted playsInline />
                          ) : (
                            <img src={buildMediaUrl(variant.image)} alt={variant.name} className="h-16 w-16 rounded object-cover" />
                          )
                        )}
                        <div>
                          <div className="font-medium text-white">{variant.name}</div>
                          {variant.model && <div className="text-sm text-gray-400">Modelo: {variant.model}</div>}
                          {variant.size && <div className="text-sm text-gray-400">Talla: {variant.size}</div>}
                          <div className="text-sm text-gray-400">Stock: {variant.stock || 0}</div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${variant.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {variant.is_active !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">${variant.price.toFixed(2)}</div>
                        {variant.original_price && variant.original_price > variant.price && (
                          <div className="text-sm text-gray-400 line-through">${variant.original_price.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para detalles de orden */}
      {showOrderDetails.show && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Detalles de la Orden #{orderDetails.order_number || orderDetails.order_id}</h3>
              <button
                onClick={() => setShowOrderDetails({ show: false, orderId: null })}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información de la orden */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white mb-3">Información de la Orden</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Estado:</span>
                    <span className="text-white font-medium capitalize">{orderDetails.status ? orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1).toLowerCase() : orderDetails.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total:</span>
                    <span className="text-white font-medium">${orderDetails.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Código de Rastreo:</span>
                    <span className="text-white font-medium">{orderDetails.tracking_code || 'Sin código'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Paquetería:</span>
                    <span className="text-white font-medium">{orderDetails.courier_name || 'Sin paquetería'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Fecha de Creación:</span>
                    <span className="text-white font-medium">
                      {new Date(orderDetails.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dirección de envío */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white mb-3">Dirección de Envío</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-5 w-5 text-yellow-400 mt-1" />
                    <div>
                      {shippingInfo ? (
                        <>
                          <p className="text-white font-medium">{shippingInfo.label || 'Dirección'}</p>
                          <p className="text-gray-300 text-sm">{shippingInfo.name || ''}</p>
                          <p className="text-gray-300 text-sm">{shippingInfo.address_line1}</p>
                          {shippingInfo.address_line2 && (
                            <p className="text-gray-400 text-sm">{shippingInfo.address_line2}</p>
                          )}
                          <p className="text-gray-300 text-sm">
                            {shippingInfo.city}{shippingInfo.state ? `, ${shippingInfo.state}` : ''} {shippingInfo.postal_code || ''}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {(shippingInfo.country || 'MX')} {shippingInfo.phone ? `· ${shippingInfo.phone}` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400 text-sm">Sin dirección registrada</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Productos de la orden */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-white mb-3">Productos de la Orden</h4>
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                {orderDetailItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {it.product?.image && (
                        isVideoUrl(it.product.image) ? (
                          <video src={buildMediaUrl(it.product.image)} className="h-10 w-10 rounded object-cover" muted playsInline />
                        ) : (
                          <img src={buildMediaUrl(it.product.image)} alt={it.product?.name} className="h-10 w-10 rounded object-cover" />
                        )
                      )}
                      <div>
                        <a
                          href={`/producto/${it.product_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-medium hover:text-yellow-400 transition-colors cursor-pointer"
                        >
                          {it.product?.name || `Producto ${it.product_id}`}
                        </a>
                        <p className="text-gray-400 text-xs">SKU: {it.product?.sku || it.product_id}</p>
                        {it.variant && (
                          <p className="text-gray-300 text-xs">
                            {it.variant.model ? `Modelo: ${it.variant.model}` : 'Principal'}
                            {it.variant.size && ` - Talla: ${it.variant.size}`}
                            {it.variant_id && ` (ID: ${it.variant_id})`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-300 text-sm">x{it.quantity} · ${it.price}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* URL de tracking si está disponible */}
            {orderDetails.tracking_code && orderDetails.courier_url && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Seguimiento del Envío</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <a
                    href={`${orderDetails.courier_url}${orderDetails.tracking_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <Truck className="h-5 w-5" />
                    <span>Rastrear envío en {orderDetails.courier_name}</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para crear/procesar etiquetas (siempre paquetería de cada orden) */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Generar etiquetas de envío</h3>
            <p className="text-sm text-gray-300 mb-3">
              Seleccionaste {selectedOrderIds.length} orden(es). Se creará la etiqueta y se generará la guía con la paquetería asignada a cada orden.
            </p>
            <div className="space-y-3">
              <label className="block text-gray-300 text-sm">Paquete de envío</label>
              <select
                value={selectedPackageIdForLabels === '' ? '' : String(selectedPackageIdForLabels)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPackageIdForLabels(val === '' ? '' : Number(val));
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                disabled={processingShipping}
              >
                <option value="">Selecciona un paquete</option>
                {packages.filter(p => p.is_active).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.length_cm}x{p.width_cm}x{p.height_cm} cm · {p.empty_weight_grams} g
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">Obligatorio para crear la etiqueta.</p>
            </div>
            {shippingStatusMessage && (
              <div className="mt-3 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
                {shippingStatusMessage}
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  resetShippingFlow();
                  setSelectedOrderIds([]);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAndProcessShipping}
                disabled={processingShipping}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingShipping ? 'Procesando...' : 'Crear y procesar etiquetas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para elegir tipo de PDF */}
      {showPdfOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Descargar etiquetas</h3>
              <button onClick={resetShippingFlow} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Etiquetas procesadas: {createdLabelIds.length}. Elige si deseas un PDF por etiqueta o un PDF combinado.
            </p>
            {processedLabels && processedLabels.length > 0 && (
              <div className="max-h-40 overflow-y-auto mb-4 space-y-2">
                {processedLabels.map((pl: any) => {
                  // El endpoint devuelve { label_id, label: {...} } o { label_id, error: {...} }
                  const labelId = pl.label_id || pl.label?.id || pl.id;
                  const label = pl.label || pl;
                  const trackingNumber = label?.tracking_code || label?.api_response?.tracking_number || 'pendiente';
                  
                  if (pl.error) {
                    return (
                      <div key={labelId || pl.label_id} className="flex items-center justify-between bg-red-900/20 rounded px-3 py-2 text-sm text-red-300">
                        <div>
                          <div>Etiqueta ID: {pl.label_id}</div>
                          <div className="text-xs text-red-400">Error: {pl.error?.message || 'Error desconocido'}</div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={labelId} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 text-sm text-gray-200">
                      <div>
                        <div>Etiqueta ID: {labelId}</div>
                        <div className="text-xs text-gray-400">
                          Tracking: {trackingNumber}
                        </div>
                      </div>
                      <button
                        onClick={() => downloadPdfIndividual(Number(labelId))}
                        className="text-yellow-400 hover:text-yellow-300 text-xs underline"
                      >
                        PDF individual
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                onClick={downloadPdfCombined}
                className="w-full sm:w-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-medium"
              >
                Descargar PDF combinado
              </button>
              <button
                onClick={() => {
                  // Solo cierra, los botones individuales siguen disponibles arriba
                  setShowPdfOptionsModal(false);
                  setShippingStatusMessage('');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;