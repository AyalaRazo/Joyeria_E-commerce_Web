import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin, Truck, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, Eye } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import OrderCard from './OrderCard';

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { orders, loading, error, loadOrders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [submittedFilter, setSubmittedFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10
  });

  const [couriers, setCouriers] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState<{
    show: boolean;
    orderId: number | null;
  }>({ show: false, orderId: null });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
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
        .select(`
          *,
          product:products(*),
          variant:product_variants(*)
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setOrderDetails({ 
        ...viewData, 
        shipping_snapshot: orderData?.shipping_snapshot,
        order_items: itemsData || []
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
      case 'procesando':
        return <RefreshCw className="h-3.5 w-3.5 text-blue-500" />;
      case 'enviado':
        return <Truck className="h-3.5 w-3.5 text-purple-500" />;
      case 'entregado':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'cancelado':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'reembolsado':
        return <XCircle className="h-3.5 w-3.5 text-gray-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'procesando':
        return 'Procesando';
      case 'enviado':
        return 'Enviado';
      case 'entregado':
        return 'Entregado';
      case 'cancelado':
        return 'Cancelado';
      case 'reembolsado':
        return 'Reembolsado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'procesando':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'enviado':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'entregado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reembolsado':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSubmitted = submittedFilter === 'all' ||
      (submittedFilter === 'submitted' && order.is_submitted) ||
      (submittedFilter === 'not_submitted' && !order.is_submitted);
    
    let matchesDate = true;
    if (dateFilter.startDate || dateFilter.endDate) {
      const orderDate = new Date(order.created_at || new Date().toISOString());
      if (dateFilter.startDate) {
        const startDate = new Date(dateFilter.startDate);
        matchesDate = matchesDate && orderDate >= startDate;
      }
      if (dateFilter.endDate) {
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && orderDate <= endDate;
      }
    }
    
    return matchesStatus && matchesSubmitted && matchesDate;
  });

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [statusFilter, submittedFilter, dateFilter.startDate, dateFilter.endDate]);

  const totalFiltered = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pagination.limit));
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

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
          <div className="flex items-center space-x-2 mb-3">
            <Package className="h-6 w-6 text-gray-300" />
            <h1 className="text-2xl font-bold text-gray-100">Mis Pedidos</h1>
          </div>
          <p className="text-gray-400 mb-4 text-sm">
            Historial de pedidos y estado actual.
          </p>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <label className="text-white text-xs">Estado:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-yellow-400"
              >
                <option value="all">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="procesando">Procesando</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
                <option value="reembolsado">Reembolsado</option>
              </select>
            </div>
            
            
            <div className="flex items-center space-x-1.5">
              <label className="text-white text-xs">Desde:</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-yellow-400 w-32"
                title="Fecha de inicio"
              />
            </div>
            
            <div className="flex items-center space-x-1.5">
              <label className="text-white text-xs">Hasta:</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-yellow-400 w-32"
                title="Fecha de fin"
              />
            </div>
            
            {(dateFilter.startDate || dateFilter.endDate || statusFilter !== 'all' || submittedFilter !== 'all') && (
              <button
                onClick={() => {
                  setDateFilter({startDate: '', endDate: ''});
                  setStatusFilter('all');
                  setSubmittedFilter('all');
                }}
                className="text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"
                title="Limpiar filtros"
              >
                <XCircle className="h-3 w-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Orders List - Grid de 2 columnas en desktop, 1 columna en móvil */}
        {totalFiltered === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
            <Package className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-300 mb-2">No tienes pedidos</h2>
            <p className="text-gray-400 mb-4 text-sm">
              Cuando realices tu primera compra, aparecerá aquí.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded text-sm transition-all duration-300"
            >
              <Package className="h-4 w-4 mr-1.5" />
              Comprar ahora
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedOrders.map((order) => {
              const courier = couriers.find(c => c.id === order.courier_id);
              const trackingUrl = courier?.url && order.tracking_code ? `${courier.url}${order.tracking_code}` : null;
              
              return (
                <div
                  key={order.id}
                  className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700 rounded-lg overflow-hidden hover:border-yellow-400/50 transition-all duration-200 shadow hover:shadow-lg flex flex-col h-full"
                >
                  {/* Order Header - más compacto */}
                  <div className="p-3 border-b border-gray-700 bg-gradient-to-r from-gray-800/30 to-gray-900/30 flex-1">
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <span className="text-base font-bold text-white">
                            Pedido #{order.id}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-gray-300">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : 'Sin fecha'}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-yellow-400">
                          ${order.total.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Información de envío compacta */}
                    {(courier || order.tracking_code) && (
                      <div className="mt-2 pt-2 border-t border-gray-600/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Truck className="h-3.5 w-3.5 text-blue-400" />
                            <div>
                              <p className="text-white font-medium text-xs">
                                {courier ? courier.name : 'Sin paquetería'}
                              </p>
                              {order.tracking_code && (
                                <p className="text-gray-300 text-xs">
                                  {order.tracking_code}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded text-xs transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Rastrear</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Details - más compacto */}
                  <div className="p-3 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white">Productos</h3>
                      <button
                        onClick={() => {
                          fetchOrderDetails(order.id);
                          setShowOrderDetails({ show: true, orderId: order.id });
                        }}
                        className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Detalles</span>
                      </button>
                    </div>
                    
                    {/* OrderCard más compacto o resumen */}
                    <div className="text-xs text-gray-300">
                      <OrderCard order={order} compact={true} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Paginación */}
        {totalFiltered > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded">
            <div className="text-xs text-gray-400">
              {startIndex + 1} - {Math.min(endIndex, totalFiltered)} de {totalFiltered}
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setPagination(prev => ({ ...prev, page: prev.page - 1 }));
                  window.scrollTo(0, 0);
                }}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs"
              >
                Anterior
              </button>
              
              <span className="text-xs text-gray-300">
                {pagination.page} / {totalPages}
              </span>
              
              <button
                onClick={() => {
                  setPagination(prev => ({ ...prev, page: prev.page + 1 }));
                  window.scrollTo(0, 0);
                }}
                disabled={pagination.page >= totalPages}
                className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Modal para detalles de orden */}
        {showOrderDetails.show && orderDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Orden #{orderDetails.order_id}</h3>
                <button
                  onClick={() => setShowOrderDetails({ show: false, orderId: null })}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Información de la orden */}
                <div className="space-y-3">
                  <h4 className="text-base font-semibold text-white mb-2">Información</h4>
                  <div className="bg-gray-700 rounded p-3 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Estado:</span>
                      <span className="text-white font-medium text-sm">{orderDetails.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Total:</span>
                      <span className="text-white font-medium text-sm">${orderDetails.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Código:</span>
                      <span className="text-white font-medium text-sm">{orderDetails.tracking_code || 'Sin código'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Paquetería:</span>
                      <span className="text-white font-medium text-sm">{orderDetails.courier_name || 'Sin paquetería'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Fecha:</span>
                      <span className="text-white font-medium text-sm">
                        {new Date(orderDetails.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dirección de envío */}
                <div className="space-y-3">
                  <h4 className="text-base font-semibold text-white mb-2">Dirección</h4>
                  <div className="bg-gray-700 rounded p-3 space-y-1.5">
                    <div className="flex items-start space-x-1.5">
                      <MapPin className="h-4 w-4 text-yellow-400 mt-0.5" />
                      <div className="text-sm">
                        {orderDetails.shipping_snapshot ? (
                          <>
                            <p className="text-white font-medium">{orderDetails.shipping_snapshot.label || 'Dirección'}</p>
                            <p className="text-gray-300">{orderDetails.shipping_snapshot.name || ''}</p>
                            <p className="text-gray-300">{orderDetails.shipping_snapshot.address_line1}</p>
                            {orderDetails.shipping_snapshot.address_line2 && (
                              <p className="text-gray-400">{orderDetails.shipping_snapshot.address_line2}</p>
                            )}
                            <p className="text-gray-300">
                              {orderDetails.shipping_snapshot.city}{orderDetails.shipping_snapshot.state ? `, ${orderDetails.shipping_snapshot.state}` : ''} {orderDetails.shipping_snapshot.postal_code || ''}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {(orderDetails.shipping_snapshot.country || 'MX')} {orderDetails.shipping_snapshot.phone ? `· ${orderDetails.shipping_snapshot.phone}` : ''}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-white font-medium">{orderDetails.shipping_city || 'Sin ciudad'}</p>
                            <p className="text-gray-300">{orderDetails.shipping_state || ''}</p>
                            <p className="text-gray-300">{orderDetails.shipping_country || ''}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* URL de tracking */}
              {orderDetails.tracking_code && orderDetails.courier_url && (
                <div className="mt-4">
                  <h4 className="text-base font-semibold text-white mb-2">Seguimiento</h4>
                  <div className="bg-gray-700 rounded p-3">
                    <a
                      href={`${orderDetails.courier_url}${orderDetails.tracking_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-yellow-400 hover:text-yellow-300 transition-colors text-sm"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Rastrear en {orderDetails.courier_name}</span>
                    </a>
                  </div>
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