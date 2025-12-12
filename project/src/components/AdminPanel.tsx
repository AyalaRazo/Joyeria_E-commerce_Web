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
import { uploadImageToProductsBucket } from '../utils/storage';

const AdminPanel: React.FC = () => {
  const { user, isAdmin, refreshUserRole } = useAuth();
  // const { returns, processReturn } = useReturns();
  const [returns, setReturns] = useState<any[]>([]);
  const { users, assignRole, addAdminByEmail} = useUserManagement();
  const { categories } = useProducts();
  const userRole = user?.role;
  const canManageCouriers = isAdmin();
  const canViewCouriers = canManageCouriers || userRole === 'worker';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'returns' | 'users' | 'couriers'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string | number, ProductVariant[]>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState({
    dashboard: false,
    products: true,
    orders: true,
    returns: false,
    users: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
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
    couriers: { page: 1, limit: 10, total: 0 }
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingStock, setEditingStock] = useState<{
    productId: string | number;
    variantId: string | number | null;
    value: number;
  } | null>(null);
  const [editingTracking, setEditingTracking] = useState<{
    orderId: string | number;
    value: string;
  } | null>(null);
  const [editingSubmitted, setEditingSubmitted] = useState<{
    orderId: string | number;
    value: boolean;
  } | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productMainImageFile, setProductMainImageFile] = useState<File | null>(null);
  const [productGalleryFiles, setProductGalleryFiles] = useState<FileList | null>(null);
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
    warranty_description: undefined as string | undefined
  });
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'worker' as UserRole
  });

  // Variants state
  const [showAddVariant, setShowAddVariant] = useState<{
    show: boolean;
    productId: number | null;
  }>({ show: false, productId: null });
  const [newVariant, setNewVariant] = useState({
    name: '',
    price: 0,
    original_price: undefined as number | undefined,
    model: '',
    size: '',
    stock: 0,
    imageFile: null as File | null,
  });
  const [editingVariant, setEditingVariant] = useState<null | {
    id: number;
    product_id: number;
    name: string;
    price: number;
    original_price?: number;
    model?: string;
    size?: string;
    stock?: number;
    image?: string | null;
    variant_images?: Array<{ id: number; url: string }>;
  }>(null);
  const [editingVariantImageFile, setEditingVariantImageFile] = useState<File | null>(null);
  const [editingProductGalleryFiles, setEditingProductGalleryFiles] = useState<FileList | null>(null);
  const [newVariantGalleryFiles, setNewVariantGalleryFiles] = useState<FileList | null>(null);
  const [editingVariantGalleryFiles, setEditingVariantGalleryFiles] = useState<FileList | null>(null);

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
  const [editingCourier, setEditingCourier] = useState<{
    orderId: number;
    courierId: number;
  } | null>(null);
  const [showAddCourier, setShowAddCourier] = useState(false);
  const [editingCourierData, setEditingCourierData] = useState<Courier | null>(null);
  const [newCourier, setNewCourier] = useState({
    name: '',
    url: '',
    logo: ''
  });

  // Estados para detalles de orden
  const [showOrderDetails, setShowOrderDetails] = useState<{
    show: boolean;
    orderId: number | null;
  }>({ show: false, orderId: null });
  const [orderDetails, setOrderDetails] = useState<any>(null);

  // Fetch data based on active tab
  useEffect(() => {
    // Si no es admin, ocultar tabs restringidas
    if (!isAdmin() && (activeTab === 'dashboard' || activeTab === 'users')) {
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
        break;
      case 'orders':
        fetchCouriers();
        fetchOrders();
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

  const handleAddCourier = async () => {
    try {
      if (!newCourier.name.trim()) {
        alert('El nombre de la paquetería es requerido');
        return;
      }

      const { error } = await supabase
        .from('couriers')
        .insert([{
          name: newCourier.name.trim(),
          url: newCourier.url.trim() || null,
          logo: newCourier.logo.trim() || null
        }]);

      if (error) throw error;

      setNewCourier({ name: '', url: '', logo: '' });
      setShowAddCourier(false);
      fetchCouriers();
    } catch (error) {
      console.error('Error adding courier:', error);
      alert('Error al agregar la paquetería');
    }
  };

  const handleEditCourier = async () => {
    if (!editingCourierData) return;

    try {
      if (!editingCourierData.name.trim()) {
        alert('El nombre de la paquetería es requerido');
        return;
      }

      const { error } = await supabase
        .from('couriers')
        .update({
          name: editingCourierData.name.trim(),
          url: editingCourierData.url?.trim() || null,
          logo: editingCourierData.logo?.trim() || null
        })
        .eq('id', editingCourierData.id);

      if (error) throw error;

      setEditingCourierData(null);
      fetchCouriers();
    } catch (error) {
      console.error('Error updating courier:', error);
      alert('Error al actualizar la paquetería');
    }
  };

  const handleDeleteCourier = async (courierId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta paquetería?')) return;

    try {
      const { error } = await supabase
        .from('couriers')
        .delete()
        .eq('id', courierId);

      if (error) throw error;
      fetchCouriers();
    } catch (error) {
      console.error('Error deleting courier:', error);
      alert('Error al eliminar la paquetería');
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

      if (err1 || err2 || err3 || err4) {
        console.error('❌ Error fetching dashboard data:', err1 || err2 || err3 || err4);
        return;
      }

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


  const handleCourierUpdate = async () => {
    if (!editingCourier) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ courier_id: editingCourier.courierId })
        .eq('id', editingCourier.orderId);

      if (error) throw error;

      setOrders(prev =>
        prev.map(o =>
          o.id === editingCourier.orderId
            ? { ...o, courier_id: editingCourier.courierId }
            : o
        )
      );
    } catch (error) {
      console.error('Error updating courier:', error);
    } finally {
      setEditingCourier(null);
    }
  };

  const fetchReturns = async (page = 1, limit = 10) => {
    setLoading(prev => ({ ...prev, returns: true }));
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('returns')
        .select('*', { count: 'exact' })
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

  const fetchOrders = async (page = 1, limit = 10) => {
    setLoading(prev => ({ ...prev, orders: true }));
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*))', { count: 'exact' })
        .neq('status', 'reserved')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setOrders(data || []);
      setPagination(prev => ({
        ...prev,
        orders: { page, limit, total: count || 0 }
      }));
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

  const handleTrackingUpdate = async () => {
    if (!editingTracking) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_code: editingTracking.value })
        .eq('id', editingTracking.orderId);

      if (error) throw error;

      setOrders(prev =>
        prev.map(o =>
          o.id === editingTracking.orderId
            ? { ...o, tracking_code: editingTracking.value }
            : o
        )
      );
    } catch (error) {
      console.error('Error updating tracking code:', error);
    } finally {
      setEditingTracking(null);
    }
  };

  const handleAddProduct = async () => {
    try {
      // Upload main image if provided
      let mainImageUrl = newProduct.image;
      if (productMainImageFile) {
        const categoryName = categories.find(c => c.id === newProduct.category_id)?.name || 'sin_categoria';
        mainImageUrl = await uploadImageToProductsBucket(productMainImageFile, categoryName);
      }
      if (!mainImageUrl) {
        alert('Selecciona una imagen principal para el producto.');
        return;
      }

      const { data: inserted, error } = await supabase
        .from('products')
        .insert([{ ...newProduct, image: mainImageUrl }])
        .select('*')
        .single();

      if (error) throw error;

      // Upload gallery images to product_images
      if (inserted && productGalleryFiles && productGalleryFiles.length > 0) {
        const categoryName = categories.find(c => c.id === newProduct.category_id)?.name || 'sin_categoria';
        const urls: string[] = [];
        for (const file of Array.from(productGalleryFiles)) {
          const url = await uploadImageToProductsBucket(file, categoryName);
          urls.push(url);
        }
        const rows = urls.map((url, idx) => ({ product_id: inserted.id, url, ordering: idx }));
        await supabase.from('product_images').insert(rows);
      }

      setNewProduct({
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
        warranty_description: undefined
      });
      setShowAddProduct(false);
      setProductMainImageFile(null);
      setProductGalleryFiles(null);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleEditProduct = async (product: Product) => {
    try {
      // Optionally replace main image if a file was selected via hidden state per product (reuse productMainImageFile for simplicity)
      let updatedImage = product.image;
      if (productMainImageFile) {
        const categoryName = categories.find(c => c.id === product.category_id)?.name || 'sin_categoria';
        updatedImage = await uploadImageToProductsBucket(productMainImageFile, categoryName);
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
          is_featured: product.is_featured
        })
        .eq('id', product.id);

      if (error) throw error;

      if (editingProductGalleryFiles && editingProductGalleryFiles.length > 0) {
        const existingCount = product.images?.length || 0;
        const categoryName = categories.find(c => c.id === product.category_id)?.name || 'sin_categoria';
        const urls: string[] = [];
        for (const file of Array.from(editingProductGalleryFiles)) {
          const url = await uploadImageToProductsBucket(file, categoryName);
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
      setEditingProductGalleryFiles(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleAddVariant = async () => {
    if (!showAddVariant.productId) return;
    try {
      let imageUrl: string | null = null;
      const parentProduct = products.find(p => p.id === showAddVariant.productId);
      const categoryName = categories.find(c => c.id === (parentProduct?.category_id || 1))?.name || 'sin_categoria';
      if (newVariant.imageFile) {
        imageUrl = await uploadImageToProductsBucket(newVariant.imageFile, categoryName);
      }

      const { data: insertedVariant, error } = await supabase
        .from('product_variants')
        .insert([{
          product_id: showAddVariant.productId,
          name: newVariant.name,
          price: newVariant.price,
          original_price: newVariant.original_price,
          model: newVariant.model,
          size: newVariant.size,
          stock: newVariant.stock,
          image: imageUrl
        }])
        .select('*')
        .single();

      if (error) throw error;

      if (insertedVariant && newVariantGalleryFiles && newVariantGalleryFiles.length > 0) {
        const urls: string[] = [];
        for (const file of Array.from(newVariantGalleryFiles)) {
          const url = await uploadImageToProductsBucket(file, categoryName);
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
      setNewVariant({ name: '', price: 0, original_price: undefined, model: '', size: '', stock: 0, imageFile: null });
      setNewVariantGalleryFiles(null);
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
        imageUrl = await uploadImageToProductsBucket(editingVariantImageFile, categoryName);
      }

      const { error } = await supabase
        .from('product_variants')
        .update({
          name: editingVariant.name,
          price: editingVariant.price,
          original_price: editingVariant.original_price,
          model: editingVariant.model,
          size: editingVariant.size,
          stock: editingVariant.stock,
          image: imageUrl
        })
        .eq('id', editingVariant.id);

      if (error) throw error;

      setEditingVariant(null);
      setEditingVariantImageFile(null);
      if (editingVariantGalleryFiles && editingVariantGalleryFiles.length > 0) {
        const parentProduct = products.find(p => p.id === editingVariant.product_id);
        const categoryName = categories.find(c => c.id === (parentProduct?.category_id || 1))?.name || 'sin_categoria';
        const startIndex = editingVariant.variant_images?.length || 0;
        const urls: string[] = [];
        for (const file of Array.from(editingVariantGalleryFiles)) {
          const url = await uploadImageToProductsBucket(file, categoryName);
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

  const handleDeleteProductImage = async (imageId: number) => {
    try {
      await supabase.from('product_images').delete().eq('id', imageId);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product image:', error);
    }
  };

  const handleDeleteVariantImage = async (imageId: number) => {
    try {
      await supabase.from('variant_images').delete().eq('id', imageId);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting variant image:', error);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
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

      // Actualizar la orden en la base de datos local
      await supabase.from('orders').update({
        status: returnType === 'refund' ? 'reembolsado' : (returnType === 'full' ? 'devuelto' : 'parcialmente_devuelto'),
        return_status: returnType === 'refund' ? 'refund' : (returnType === 'full' ? 'full' : 'partial')
      }).eq('id', showReturnModal.orderId);

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
        console.log('✅ Rol cambiado y cache limpiado');
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
  };

  const handleOpenCourierModal = () => {
    if (selectedOrderIds.length === 0) {
      alert('Selecciona al menos una orden para generar etiquetas.');
      return;
    }
    setSelectedCourierIdForLabels('');
    setShowCourierModal(true);
    setShippingStatusMessage('');
  };

  const handleCreateAndProcessShipping = async () => {
    if (selectedOrderIds.length === 0) {
      alert('Selecciona al menos una orden para generar etiquetas.');
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

      // Convertir courier_id: si es string vacío o falsy, usar null; si es número, usarlo
      const courierId = selectedCourierIdForLabels === '' || !selectedCourierIdForLabels 
        ? null 
        : Number(selectedCourierIdForLabels);

      const requestBody = {
        order_ids: selectedOrderIds,
        courier_id: courierId
      };
      
      console.log('📦 Creando etiquetas:', { baseUrl, orderIds: selectedOrderIds, courierId, requestBody });
      
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
      const labelIds: number[] = [];
      const createdLabels = createData?.createdLabels || [];
      
      createdLabels.forEach((entry: any) => {
        if (entry.error) {
          console.warn(`Error al crear etiqueta para orden ${entry.order_id}:`, entry.error);
        } else if (entry.label && entry.label.id) {
          labelIds.push(Number(entry.label.id));
        }
      });

      if (labelIds.length === 0) {
        throw new Error('No se generaron etiquetas. Verifica que las órdenes estén pagadas y sin tracking.');
      }

      setShippingStatusMessage(`Procesando ${labelIds.length} etiqueta(s)...`);

      const processResp = await fetch(`${baseUrl}/shipping-process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ label_ids: labelIds })
      });

      if (!processResp.ok) {
        const errorText = await processResp.text();
        let err;
        try {
          err = JSON.parse(errorText);
        } catch {
          err = { error: errorText || 'Error al procesar etiquetas' };
        }
        throw new Error(err?.error || 'Error al procesar etiquetas');
      }

      const processData = await processResp.json();
      // El endpoint devuelve { processed: [...] }
      const processed = processData?.processed || [];
      
      setCreatedLabelIds(labelIds);
      setProcessedLabels(processed);
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
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toString().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });


  const filteredOrders = orders.filter(order => {
    if (order.status === 'reserved') return false;
    const matchesSearch = order.id.toString().includes(searchTerm.toLowerCase()) ||
      (order.tracking_code && order.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const filteredUsers = users.filter(userItem =>
    userItem.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userItem.name && userItem.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Resetear paginación cuando cambian los filtros
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      products: { ...prev.products, page: 1 },
      orders: { ...prev.orders, page: 1 },
      returns: { ...prev.returns, page: 1 },
      users: { ...prev.users, page: 1 },
      couriers: { ...prev.couriers, page: 1 }
    }));
  }, [statusFilter, submittedFilter, dateFilter.startDate, dateFilter.endDate, searchTerm, categoryFilter]);

  // Componente de paginación - ahora funciona con datos filtrados
  const PaginationControls = ({ type, filteredData, onPageChange }: { 
    type: 'products' | 'orders' | 'returns' | 'users' | 'couriers';
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

          <span className="text-sm text-gray-300">
            Página {currentPagination.page} de {totalPages}
          </span>

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
  const totalOrders = dashboardData.salesFinancial.reduce((sum, i) => sum + (i.total_orders || 0), 0);
  const totalReturns = dashboardData.salesFinancial.reduce((sum, i) => sum + (i.total_returns || 0), 0);
  const platformFees = dashboardData.salesFinancial.reduce((sum, i) => sum + (i.total_platform_fee || 0), 0);
  const jewelerEarnings = dashboardData.salesFinancial.reduce((sum, i) => sum + (i.total_jeweler_earnings || 0), 0);
  const uniqueCustomers = dashboardData.salesSummary.reduce((sum, i) => sum + (i.unique_customers || 0), 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
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
        <div className="flex border-b border-gray-700 mb-6">
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
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {activeTab !== 'dashboard' && (
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
              <div className="flex items-center gap-2">
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
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Producto</span>
              </button>
            )}
            {activeTab === 'users' && isAdmin() && (
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Usuario</span>
              </button>
            )}
            {activeTab === 'orders' && (
              <button
                onClick={handleOpenCourierModal}
                disabled={processingShipping}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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
        { title: 'Clientes Únicos', value: uniqueCustomers, color: 'from-purple-900/30 to-purple-800/30 border-purple-500/30', icon: <Users className="h-8 w-8 text-purple-400" /> },
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">{metric.title}</p>
              <p className="text-2xl font-bold text-white mt-1">{metric.value}</p>
            </div>
            {metric.icon}
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
        tickFormatter={(dateStr) => {
          // Formatear la fecha a "MMM DD" (ej: "Ene 15", "Feb 28")
          const date = new Date(dateStr);
          return date.toLocaleDateString('es-ES', { 
            month: 'short', 
            day: 'numeric' 
          });
        }}
        tick={{ fontSize: 12 }}
      />
      <YAxis stroke="#aaa" />
      <Tooltip 
        contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
        formatter={(value, name) => {
          const nameMap = {
            total_sales: 'Ventas',
            total_orders: 'Pedidos'
          };
          return [value, nameMap[name] || name];
        }}
        labelFormatter={(dateStr) => {
          // Formatear también el tooltip para mostrar fecha completa
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
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Variantes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {(() => {
                    const currentPagination = pagination.products;
                    const startIndex = (currentPagination.page - 1) * currentPagination.limit;
                    const endIndex = startIndex + currentPagination.limit;
                    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
                    return paginatedProducts.map((product) => (
                    <React.Fragment key={product.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                            <div className="ml-4">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-gray-400 text-sm">ID: {product.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-lg font-semibold">${product.price.toFixed(2)}</div>
                          {product.original_price && product.original_price > product.price && (
                            <div className="text-sm text-gray-400 line-through">
                              ${product.original_price.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-gray-700 rounded text-sm">
                            {categories.find(c => c.id === product.category_id)?.name || 'Sin categoría'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingStock?.productId === product.id && !editingStock.variantId ? (
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
                                className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1"
                              />
                              <button
                                onClick={handleStockUpdate}
                                className="text-green-400 hover:text-green-300"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingStock(null)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span>{product.stock}</span>
                              <button
                                onClick={() =>
                                  setEditingStock({
                                    productId: product.id,
                                    variantId: null,
                                    value: product.stock || 0
                                  })
                                }
                                className="ml-2 text-yellow-400 hover:text-yellow-300"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {variants[product.id]?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Editar producto"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setShowAddVariant({ show: true, productId: Number(product.id) });
                                setNewVariant({ name: '', price: 0, original_price: undefined, model: '', size: '', stock: 0, imageFile: null });
                                setNewVariantGalleryFiles(null);
                              }}
                              className="text-yellow-400 hover:text-yellow-300"
                              title="Agregar variante"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
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
                        </td>
                      </tr>
                      {/* Variants rows */}
                      {variants[product.id]?.map((variant) => (
                        <tr key={variant.id} className="bg-gray-750">
                          <td className="px-6 py-4 whitespace-nowrap pl-16">
                            <div className="flex items-center">
                              {variant.image && (
                                <img
                                  src={variant.image}
                                  alt={variant.name}
                                  className="h-10 w-10 rounded-md object-cover mr-4"
                                />
                              )}
                              <div>
                                <div className="font-medium">{variant.name}</div>
                                <div className="text-gray-400 text-sm">
                                  {variant.size && `Talla: ${variant.size}`}
                                  {variant.model && ` | Modelo: ${variant.model}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                                  className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1"
                                />
                                <button
                                  onClick={handleStockUpdate}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingStock(null)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span>{variant.stock}</span>
                                <button
                                  onClick={() =>
                                    setEditingStock({
                                      productId: product.id,
                                      variantId: variant.id,
                                      value: variant.stock || 0
                                    })
                                  }
                                  className="ml-2 text-yellow-400 hover:text-yellow-300"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td colSpan={1} className="px-6 py-4 whitespace-nowrap text-gray-400">
                            Variante
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const variantWithImages = variants[product.id]?.find(v => v.id === variant.id);
                                  setEditingVariant({
                                    id: Number(variant.id),
                                    product_id: Number(variant.product_id),
                                    name: variant.name,
                                    price: Number(variant.price),
                                    original_price: variant.original_price ? Number(variant.original_price) : undefined,
                                    model: variant.model || '',
                                    size: variant.size || '',
                                    stock: Number(variant.stock || 0),
                                    image: variant.image || null,
                                    variant_images: (variantWithImages as any)?.variant_images || []
                                  });
                                }}
                                className="text-blue-400 hover:text-blue-300"
                                title="Editar variante"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteVariant(Number(variant.id))}
                                className="text-red-400 hover:text-red-300"
                                title="Eliminar variante"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                    ));
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
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Orden ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Enviado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Código de Rastreo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Paquetería</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
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
                          aria-label={`Seleccionar orden ${order.id}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">#{order.id}</div>
                        <div className="text-gray-400 text-sm">
                          {order.order_items?.length || 0} producto(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'entregado'
                            ? 'bg-green-500/20 text-green-400'
                            : order.status === 'cancelado'
                              ? 'bg-red-500/20 text-red-400'
                              : order.status === 'devuelto'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTracking?.orderId === order.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingTracking.value}
                              onChange={(e) =>
                                setEditingTracking({
                                  ...editingTracking,
                                  value: e.target.value
                                })
                              }
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 flex-1"
                              placeholder="Código de rastreo"
                            />
                            <button
                              onClick={handleTrackingUpdate}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingTracking(null)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            {order.tracking_code ? (
                              <>
                                <Package className="h-4 w-4 mr-2 text-yellow-400" />
                                <span>{order.tracking_code}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">Sin código</span>
                            )}
                            <button
                              onClick={() =>
                                setEditingTracking({
                                  orderId: order.id,
                                  value: order.tracking_code || ''
                                })
                              }
                              className="ml-2 text-yellow-400 hover:text-yellow-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCourier?.orderId === order.id ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={editingCourier.courierId}
                              onChange={(e) => setEditingCourier({
                                ...editingCourier,
                                courierId: parseInt(e.target.value)
                              })}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
                            >
                              <option value="">Sin paquetería</option>
                              {couriers.map(courier => (
                                <option key={courier.id} value={courier.id}>{courier.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={handleCourierUpdate}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingCourier(null)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="text-gray-300">
                              {order.courier_id ?
                                couriers.find(c => c.id === order.courier_id)?.name || 'Paquetería no encontrada' :
                                'Sin paquetería'
                              }
                            </span>
                            <button
                              onClick={() => setEditingCourier({
                                orderId: order.id,
                                courierId: order.courier_id || 0
                              })}
                              className="ml-2 text-yellow-400 hover:text-yellow-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              fetchOrderDetails(order.id);
                              setShowOrderDetails({ show: true, orderId: order.id });
                            }}
                            className="text-blue-400 hover:text-blue-300"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
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
            {(() => {
              const currentPagination = pagination.orders;
              const totalRecords = filteredOrders.length;
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
                          orders: { ...prev.orders, page: prev.orders.page - 1 }
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
                          orders: { ...prev.orders, page: prev.orders.page + 1 }
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

        {activeTab === 'couriers' && canViewCouriers && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center"><Truck className="h-5 w-5 mr-2"/>Paqueterías</h3>
                {canManageCouriers && (
                  <button
                    onClick={() => {
                      setNewCourier({ name: '', url: '', logo: '' });
                      setShowAddCourier(true);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4"/>
                    <span>Agregar Paquetería</span>
                  </button>
                )}
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">URL Base</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Logo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
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
                          <img src={c.logo} alt={c.name} className="h-10 w-10 object-contain rounded"/>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {canManageCouriers ? (
                            <>
                              <button
                                onClick={() => setEditingCourierData(c)}
                                className="text-blue-400 hover:text-blue-300"
                                title="Editar paquetería"
                              >
                                <Edit className="h-4 w-4"/>
                              </button>
                              <button
                                onClick={() => handleDeleteCourier(c.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Eliminar paquetería"
                              >
                                <Trash2 className="h-4 w-4"/>
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-500 text-sm">Solo lectura</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
            <PaginationControls type="couriers" filteredData={couriers} />
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
                        <div className="font-medium">#{returnItem.order_id}</div>
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
            <h3 className="text-lg font-bold mb-4">Agregar Nuevo Producto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
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
              <div>
                <label className="block text-gray-300 mb-1">Imagen Principal</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  onChange={(e) => setProductMainImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                />
                {productMainImageFile && (
                  <p className="text-xs text-gray-400 mt-1">{productMainImageFile.name}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1">Imágenes Complementarias</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  onChange={(e) => setProductGalleryFiles(e.target.files)}
                />
              </div>
              <div className="flex items-center space-x-4">
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
              {/* Campos de garantía */}
              {newProduct.has_warranty && (
                <>
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
                  <div>
                    <label className="block text-gray-300 mb-1">Unidad de Garantía</label>
                    <select
                      value={newProduct.warranty_unit || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, warranty_unit: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      <option value="">Seleccionar unidad</option>
                      <option value="dias">Días</option>
                      <option value="meses">Meses</option>
                      <option value="años">Años</option>
                    </select>
                  </div>
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
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
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
            <h3 className="text-lg font-bold mb-4">Editar Producto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-gray-300 mb-1">Stock</label>
                <input
                  type="number"
                  value={editingProduct.stock || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Imagen Principal</label>
                <div className="space-y-2">
                  {editingProduct.image && (
                    <img src={editingProduct.image} alt={editingProduct.name} className="h-24 w-full object-cover rounded-lg" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    onChange={(e) => setProductMainImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-gray-300 mb-1">Imágenes Complementarias</label>
                <div className="flex flex-wrap gap-3">
                  {editingProduct.images && editingProduct.images.length > 0 ? (
                    editingProduct.images.map(image => (
                      <div key={image.id} className="relative">
                        <img src={image.url} alt={editingProduct.name} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                        <button
                          type="button"
                          onClick={() => handleDeleteProductImage(image.id)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Sin imágenes adicionales</p>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  onChange={(e) => setEditingProductGalleryFiles(e.target.files)}
                />
              </div>
              <div className="flex items-center space-x-4">
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
              {/* Campos de garantía para edición */}
              {editingProduct.has_warranty && (
                <>
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
                  <div>
                    <label className="block text-gray-300 mb-1">Unidad de Garantía</label>
                    <select
                      value={editingProduct.warranty_unit || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, warranty_unit: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      <option value="">Seleccionar unidad</option>
                      <option value="dias">Días</option>
                      <option value="meses">Meses</option>
                      <option value="años">Años</option>
                    </select>
                  </div>
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
                  setEditingProductGalleryFiles(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEditProduct(editingProduct)}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Agregar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar variante */}
      {showAddVariant.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Agregar Variante</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newVariant.name}
                  onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
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
                  <label className="block text-gray-300 mb-1">Stock</label>
                  <input
                    type="number"
                    value={newVariant.stock}
                    onChange={(e) => setNewVariant({ ...newVariant, stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Imagen</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewVariant({ ...newVariant, imageFile: e.target.files && e.target.files[0] ? e.target.files[0] : null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Imágenes complementarias</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  onChange={(e) => setNewVariantGalleryFiles(e.target.files)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowAddVariant({ show: false, productId: null });
                  setNewVariantGalleryFiles(null);
                  setNewVariant({ name: '', price: 0, original_price: undefined, model: '', size: '', stock: 0, imageFile: null });
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddVariant}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
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
            <h3 className="text-lg font-bold mb-4">Editar Variante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingVariant.name}
                  onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
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
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Talla</label>
                  <input
                    type="text"
                    value={editingVariant.size || ''}
                    onChange={(e) => setEditingVariant({ ...editingVariant, size: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
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
                    <img src={editingVariant.image} alt={editingVariant.name} className="h-24 w-full object-cover rounded-lg" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    onChange={(e) => setEditingVariantImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-gray-300 mb-1">Imágenes complementarias</label>
                <div className="flex flex-wrap gap-3">
                  {editingVariant?.variant_images && editingVariant.variant_images.length > 0 ? (
                    editingVariant.variant_images.map(image => (
                      <div key={image.id} className="relative">
                        <img src={image.url} alt={editingVariant.name} className="h-20 w-20 object-cover rounded-lg border border-gray-700" />
                        <button
                          type="button"
                          onClick={() => handleDeleteVariantImage(image.id)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-5 w-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Sin imágenes adicionales</p>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  onChange={(e) => setEditingVariantGalleryFiles(e.target.files)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setEditingVariant(null);
                  setEditingVariantImageFile(null);
                  setEditingVariantGalleryFiles(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditVariant}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para detalles de orden */}
      {showOrderDetails.show && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Detalles de la Orden #{orderDetails.order_id}</h3>
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
                    <span className="text-white font-medium">{orderDetails.status}</span>
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
                      <img src={it.product?.image} alt={it.product?.name} className="h-10 w-10 rounded object-cover" />
                      <div>
                        <a
                          href={`/producto/${it.product_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-medium hover:text-yellow-400 transition-colors cursor-pointer"
                        >
                          {it.product?.name || `Producto ${it.product_id}`}
                        </a>
                        <p className="text-gray-400 text-xs">ID: {it.product_id}</p>
                        {it.variant && <p className="text-gray-300 text-xs">Variante: {it.variant.name} (ID: {it.variant_id})</p>}
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

      {/* Modal para elegir paquetería y crear/procesar etiquetas */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Generar etiquetas de envío</h3>
            <p className="text-sm text-gray-300 mb-3">
              Seleccionaste {selectedOrderIds.length} orden(es). Primero crearemos las etiquetas y luego las procesaremos.
            </p>
            <div className="space-y-3">
              <label className="block text-gray-300 text-sm">Paquetería</label>
              <select
                value={selectedCourierIdForLabels === '' ? '' : String(selectedCourierIdForLabels)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCourierIdForLabels(val === '' ? '' : Number(val));
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                disabled={processingShipping}
              >
                <option value="">Seleccionar (usar por defecto)</option>
                {couriers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">Si no seleccionas, se usará el courier por defecto configurado en la API.</p>
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
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full sm:w-auto px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-black font-medium"
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

      {/* Modal para agregar paquetería */}
      {showAddCourier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Agregar Paquetería</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={newCourier.name}
                  onChange={(e) => setNewCourier({ ...newCourier, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Ej: FedEx, DHL, etc."
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">URL Base de Rastreo</label>
                <input
                  type="text"
                  value={newCourier.url}
                  onChange={(e) => setNewCourier({ ...newCourier, url: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Ej: https://www.fedex.com/tracking?tracknumbers="
                />
                <p className="text-xs text-gray-400 mt-1">El código de rastreo se agregará al final de esta URL</p>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">URL del Logo</label>
                <input
                  type="text"
                  value={newCourier.logo}
                  onChange={(e) => setNewCourier({ ...newCourier, logo: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowAddCourier(false);
                  setNewCourier({ name: '', url: '', logo: '' });
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCourier}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
              >
                Agregar Paquetería
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar paquetería */}
      {editingCourierData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Editar Paquetería</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={editingCourierData.name}
                  onChange={(e) => setEditingCourierData({ ...editingCourierData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Ej: FedEx, DHL, etc."
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">URL Base de Rastreo</label>
                <input
                  type="text"
                  value={editingCourierData.url || ''}
                  onChange={(e) => setEditingCourierData({ ...editingCourierData, url: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Ej: https://www.fedex.com/tracking?tracknumbers="
                />
                <p className="text-xs text-gray-400 mt-1">El código de rastreo se agregará al final de esta URL</p>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">URL del Logo</label>
                <input
                  type="text"
                  value={editingCourierData.logo || ''}
                  onChange={(e) => setEditingCourierData({ ...editingCourierData, logo: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="https://ejemplo.com/logo.png"
                />
                {editingCourierData.logo && (
                  <div className="mt-2">
                    <img src={editingCourierData.logo} alt="Logo preview" className="h-16 object-contain" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setEditingCourierData(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditCourier}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;