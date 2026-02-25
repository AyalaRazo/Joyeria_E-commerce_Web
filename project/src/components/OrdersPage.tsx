import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin, Truck, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, Eye, Search } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import OrderCard from './OrderCard';

const STATUS_OPTIONS = [
  { value: 'all',        label: 'Todos' },
  { value: 'pendiente',  label: 'Pendiente' },
  { value: 'pagado',     label: 'Pagado' },
  { value: 'procesando', label: 'Procesando' },
  { value: 'enviado',    label: 'Enviado' },
  { value: 'entregado',  label: 'Entregado' },
  { value: 'cancelado',  label: 'Cancelado' },
  { value: 'reembolsado',           label: 'Reembolsado' },
  { value: 'devuelto',              label: 'Devuelto' },
  { value: 'parcialmente_devuelto', label: 'Parc. devuelto' },
] as const;

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { orders, loading, error, loadOrders } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const [couriers, setCouriers] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState<{
    show: boolean;
    orderId: number | null;
  }>({ show: false, orderId: null });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const fetchCouriers = async () => {
      try {
        const { data, error } = await supabase.from('couriers').select('*').order('name');
        if (error) throw error;
        setCouriers(data || []);
      } catch (err) {
        console.error('Error fetching couriers:', err);
      }
    };
    fetchCouriers();
  }, []);

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('shipping_snapshot')
        .eq('id', orderId)
        .maybeSingle();
      if (orderError) throw orderError;

      const { data: viewData, error: viewError } = await supabase
        .from('view_orders_detailed')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      if (viewError) throw viewError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*, product:products(*), variant:product_variants(*)')
        .eq('order_id', orderId);
      if (itemsError) throw itemsError;

      setOrderDetails({
        ...viewData,
        shipping_snapshot: orderData?.shipping_snapshot,
        order_items: itemsData || [],
      });
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':  return <Clock       className="h-3.5 w-3.5 text-yellow-400" />;
      case 'procesando': return <RefreshCw   className="h-3.5 w-3.5 text-blue-400" />;
      case 'enviado':    return <Truck       className="h-3.5 w-3.5 text-purple-400" />;
      case 'entregado':  return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
      case 'cancelado':  return <XCircle     className="h-3.5 w-3.5 text-red-400" />;
      case 'reembolsado':          return <XCircle     className="h-3.5 w-3.5 text-gray-400" />;
      case 'parcialmente_devuelto':return <RefreshCw   className="h-3.5 w-3.5 text-amber-400" />;
      default:                     return <Clock       className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    if (found && found.value !== 'all') return found.label;
    return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':   return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'pagado':      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'procesando':  return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'enviado':     return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'entregado':   return 'bg-green-500/15 text-green-400 border-green-500/30';
      case 'cancelado':   return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'reembolsado': return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      case 'devuelto':              return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'parcialmente_devuelto': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:                      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  // Counts per status (from all orders, unfiltered)
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const userCreatedYear = user?.created_at ? new Date(user.created_at).getFullYear() : currentYear;
  const availableYears = Array.from({ length: currentYear - userCreatedYear + 1 }, (_, i) => currentYear - i);

  const PERIOD_OPTIONS = [
    { value: 'all',                    label: 'Todo el historial' },
    { value: `month-${currentMonth}`,  label: 'Este mes' },
    { value: `year-${currentYear}`,    label: 'Este año' },
    ...availableYears
      .filter(y => y !== currentYear)
      .slice(0, 4)
      .map(y => ({ value: `year-${y}`, label: `${y}` })),
  ];

  const filteredOrders = orders.filter(order => {
    // Status
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;

    // Search by order number or product name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchesNumber = String(order.order_number || order.id).toLowerCase().includes(q);
      const matchesProduct = order.order_items?.some(item =>
        (item.product?.name || '').toLowerCase().includes(q)
      );
      if (!matchesNumber && !matchesProduct) return false;
    }

    // Period / date
    const orderDate = new Date(order.created_at || new Date().toISOString());
    if (quickFilter !== 'all') {
      if (quickFilter.startsWith('month-')) {
        const month = parseInt(quickFilter.split('-')[1]);
        if (!(orderDate.getFullYear() === currentYear && orderDate.getMonth() + 1 === month)) return false;
      } else if (quickFilter.startsWith('year-')) {
        const year = parseInt(quickFilter.split('-')[1]);
        if (orderDate.getFullYear() !== year) return false;
      }
    }
    if (dateFilter.startDate) {
      if (orderDate < new Date(dateFilter.startDate)) return false;
    }
    if (dateFilter.endDate) {
      const end = new Date(dateFilter.endDate);
      end.setHours(23, 59, 59, 999);
      if (orderDate > end) return false;
    }

    return true;
  });

  // Group by date label
  const groupOrdersByDate = (ordersList: typeof filteredOrders) => {
    const groups: { label: string; orders: typeof filteredOrders; type: string }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders: typeof filteredOrders = [];
    const thisWeekOrders: typeof filteredOrders = [];
    const thisMonthOrders: typeof filteredOrders = [];
    const thisYearOrders: typeof filteredOrders = [];
    // key: "YYYY-MM" → orders (for past years, grouped by month)
    const otherMonths: Record<string, typeof filteredOrders> = {};

    const MONTH_NAMES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    ordersList.forEach(order => {
      const d = new Date(order.created_at || new Date().toISOString());
      const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dOnly.getTime() === today.getTime()) {
        todayOrders.push(order);
      } else if (dOnly >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        thisWeekOrders.push(order);
      } else if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        thisMonthOrders.push(order);
      } else if (d.getFullYear() === now.getFullYear()) {
        thisYearOrders.push(order);
      } else {
        // Past years: group by month+year
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!otherMonths[key]) otherMonths[key] = [];
        otherMonths[key].push(order);
      }
    });

    if (todayOrders.length > 0)     groups.push({ label: 'Hoy',                  orders: todayOrders,    type: 'today' });
    if (thisWeekOrders.length > 0)  groups.push({ label: 'Esta semana',           orders: thisWeekOrders, type: 'week' });
    if (thisMonthOrders.length > 0) groups.push({ label: 'Este mes',              orders: thisMonthOrders,type: 'month' });
    if (thisYearOrders.length > 0)  groups.push({ label: `${now.getFullYear()}`,  orders: thisYearOrders, type: 'year' });

    // Sort past-year groups descending (most recent first)
    Object.keys(otherMonths)
      .sort((a, b) => b.localeCompare(a))
      .forEach(key => {
        const [year, month] = key.split('-').map(Number);
        const label = `${MONTH_NAMES[month - 1]} ${year}`;
        groups.push({ label, orders: otherMonths[key], type: 'past-month' });
      });

    return groups;
  };

  const groupedOrders = groupOrdersByDate(filteredOrders);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [statusFilter, dateFilter.startDate, dateFilter.endDate, quickFilter, searchQuery]);

  const totalFiltered = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pagination.limit));
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;

  const hasActiveFilters = statusFilter !== 'all' || quickFilter !== 'all' ||
    dateFilter.startDate || dateFilter.endDate || searchQuery.trim();

  const clearFilters = () => {
    setStatusFilter('all');
    setQuickFilter('all');
    setDateFilter({ startDate: '', endDate: '' });
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-6 py-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-300"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-6 py-6">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center">
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-400 mb-2">Error al cargar</h2>
            <p className="text-gray-300 mb-3 text-sm">{error}</p>
            <button
              onClick={loadOrders}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-6 w-6 text-gray-300" />
            <h1 className="text-2xl font-bold text-gray-100">Mis Pedidos</h1>
          </div>
          <p className="text-gray-500 text-sm mb-5">
            {orders.length > 0
              ? `${orders.length} pedido${orders.length !== 1 ? 's' : ''} en total`
              : 'Historial de pedidos y estado actual.'}
          </p>

          {/* ── Filtros ── */}
          <div className="space-y-3">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por número de pedido o nombre de producto…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status pills */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Estado</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {STATUS_OPTIONS.map(({ value, label }) => {
                  const count = value === 'all' ? orders.length : (statusCounts[value] || 0);
                  if (value !== 'all' && count === 0) return null;
                  const active = statusFilter === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                        active
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/20'
                          : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      {label}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period + clear */}
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Período</p>
                <div className="flex gap-1.5 flex-wrap">
                  {PERIOD_OPTIONS.map(({ value, label }) => {
                    const active = quickFilter === value;
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          setQuickFilter(value);
                          setDateFilter({ startDate: '', endDate: '' });
                        }}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                          active
                            ? 'bg-gray-200 text-black border-gray-200 shadow-sm'
                            : 'bg-transparent text-gray-500 border-gray-700/60 hover:border-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 transition-all mt-5"
                >
                  <XCircle className="h-3 w-3" />
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Results counter */}
            {(hasActiveFilters || searchQuery) && (
              <p className="text-xs text-gray-500">
                {totalFiltered === 0
                  ? 'Sin resultados para los filtros aplicados'
                  : `${totalFiltered} pedido${totalFiltered !== 1 ? 's' : ''} encontrado${totalFiltered !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>

        {/* Orders list */}
        {totalFiltered === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-gray-300 mb-1">
              {hasActiveFilters ? 'Sin resultados' : 'No tienes pedidos'}
            </h2>
            <p className="text-gray-500 mb-4 text-sm">
              {hasActiveFilters
                ? 'Prueba ajustando los filtros para ver más pedidos.'
                : 'Cuando realices tu primera compra, aparecerá aquí.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded text-sm transition-all"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Limpiar filtros
              </button>
            ) : (
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded text-sm transition-all"
              >
                <Package className="h-4 w-4 mr-1.5" />
                Comprar ahora
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedOrders.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-3">
                {/* Date separator */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-800"></div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-600 px-2">
                    {group.label}
                  </span>
                  <div className="flex-1 border-t border-gray-800"></div>
                </div>

                {/* Order cards grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {group.orders.map((order) => {
                    const courier = couriers.find(c => c.id === order.courier_id);

                    return (
                      <div
                        key={order.id}
                        className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 border border-gray-700/80 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-200 shadow-lg flex flex-col"
                      >
                        {/* Card header */}
                        <div className="px-4 pt-4 pb-3 border-b border-gray-700/60">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-bold text-white">
                                  #{order.order_number || order.id}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(order.status)}`}>
                                  {getStatusIcon(order.status)}
                                  {getStatusText(order.status)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span>
                                  {order.created_at
                                    ? new Date(order.created_at).toLocaleDateString('es-ES', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                      })
                                    : 'Sin fecha'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xl font-bold text-yellow-400">${order.total.toFixed(2)}</p>
                              <p className="text-[10px] text-gray-600">MXN</p>
                            </div>
                          </div>
                        </div>

                        {/* Order items (OrderCard) */}
                        <div className="px-4 py-3 flex-1">
                          <OrderCard order={order} compact={false} />
                        </div>

                        {/* Card footer: courier + actions */}
                        <div className="px-4 pb-3 pt-2 border-t border-gray-700/40 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {(courier || order.tracking_code) ? (
                              <>
                                <Truck className="h-3 w-3 text-gray-600 flex-shrink-0" />
                                <span className="text-xs text-gray-500 truncate">
                                  {courier ? courier.name : '—'}
                                  {order.tracking_code && (
                                    <span className="text-gray-600 font-mono"> · {order.tracking_code}</span>
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-700 italic">Sin paquetería asignada</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {order.tracking_code && courier?.url && (
                              <a
                                href={`${courier.url}${order.tracking_code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg text-xs font-medium transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Rastrear
                              </a>
                            )}
                            <button
                              onClick={() => {
                                fetchOrderDetails(order.id);
                                setShowOrderDetails({ show: true, orderId: order.id });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              Detalles
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalFiltered > 0 && totalPages > 1 && (() => {
          const getPageNumbers = () => {
            const pages: (number | string)[] = [];
            const maxVisible = 5;
            if (totalPages <= maxVisible) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1);
              let start = Math.max(2, pagination.page - 1);
              let end = Math.min(totalPages - 1, pagination.page + 1);
              if (pagination.page <= 3) end = Math.min(4, totalPages - 1);
              if (pagination.page >= totalPages - 2) start = Math.max(2, totalPages - 3);
              if (start > 2) pages.push('...');
              for (let i = start; i <= end; i++) pages.push(i);
              if (end < totalPages - 1) pages.push('...');
              pages.push(totalPages);
            }
            return pages;
          };

          return (
            <div className="flex items-center justify-between mt-4 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded">
              <div className="text-xs text-gray-400">
                {startIndex + 1}–{Math.min(endIndex, totalFiltered)} de {totalFiltered}
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { setPagination(p => ({ ...p, page: p.page - 1 })); window.scrollTo(0, 0); }}
                  disabled={pagination.page <= 1}
                  className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs"
                >
                  Anterior
                </button>
                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((page, index) => {
                    if (page === '...') {
                      return <span key={`ellipsis-${index}`} className="px-1.5 text-gray-400 text-xs">…</span>;
                    }
                    const pageNum = page as number;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => { setPagination(p => ({ ...p, page: pageNum })); window.scrollTo(0, 0); }}
                        className={`px-2.5 py-1 rounded text-xs ${
                          pagination.page === pageNum
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
                  onClick={() => { setPagination(p => ({ ...p, page: p.page + 1 })); window.scrollTo(0, 0); }}
                  disabled={pagination.page >= totalPages}
                  className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs"
                >
                  Siguiente
                </button>
              </div>
            </div>
          );
        })()}

        {/* Modal: order details */}
        {showOrderDetails.show && orderDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-3xl max-h-[88vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">
                  Pedido #{orderDetails.order_number || orderDetails.order_id}
                </h3>
                <button
                  onClick={() => setShowOrderDetails({ show: false, orderId: null })}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Información</h4>
                  <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-3 space-y-2">
                    {[
                      { label: 'Estado', value: getStatusText(orderDetails.status) },
                      { label: 'Total', value: `$${orderDetails.total.toFixed(2)}` },
                      { label: 'Código de rastreo', value: orderDetails.tracking_code || 'Sin código' },
                      { label: 'Paquetería', value: orderDetails.courier_name || 'Sin paquetería' },
                      {
                        label: 'Fecha',
                        value: new Date(orderDetails.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        }),
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-start gap-2">
                        <span className="text-gray-500 text-sm flex-shrink-0">{label}:</span>
                        <span className="text-white font-medium text-sm text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping address */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Dirección de envío</h4>
                  <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm space-y-0.5">
                        {orderDetails.shipping_snapshot ? (
                          <>
                            {orderDetails.shipping_snapshot.name && (
                              <p className="text-white font-medium">{orderDetails.shipping_snapshot.name}</p>
                            )}
                            <p className="text-gray-300">{orderDetails.shipping_snapshot.address_line1}</p>
                            {orderDetails.shipping_snapshot.address_line2 && (
                              <p className="text-gray-400">{orderDetails.shipping_snapshot.address_line2}</p>
                            )}
                            <p className="text-gray-300">
                              {[orderDetails.shipping_snapshot.city, orderDetails.shipping_snapshot.state, orderDetails.shipping_snapshot.postal_code]
                                .filter(Boolean).join(', ')}
                            </p>
                            {orderDetails.shipping_snapshot.phone && (
                              <p className="text-gray-500 text-xs">{orderDetails.shipping_snapshot.phone}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-white font-medium">{orderDetails.shipping_city || 'Sin ciudad'}</p>
                            <p className="text-gray-400">{orderDetails.shipping_state || ''}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracking link */}
              {orderDetails.tracking_code && orderDetails.courier_url && (
                <div className="mt-4 p-3 bg-gray-800/60 border border-gray-700/60 rounded-lg">
                  <a
                    href={`${orderDetails.courier_url}${orderDetails.tracking_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors text-sm font-medium"
                  >
                    <Truck className="h-4 w-4" />
                    Rastrear en {orderDetails.courier_name}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
