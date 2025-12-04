import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin, CreditCard, Truck, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, Eye } from 'lucide-react';
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

  // Estados para couriers y detalles de órdenes
  const [couriers, setCouriers] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState<{
    show: boolean;
    orderId: number | null;
  }>({ show: false, orderId: null });

  // Scroll al principio al cargar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Cargar couriers
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
      // Obtener detalles de la orden
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('shipping_snapshot')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;

      // Obtener datos de la vista detallada
      const { data: viewData, error: viewError } = await supabase
        .from('view_orders_detailed')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (viewError) throw viewError;

      // Obtener items de la orden
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
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'procesando':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'enviado':
        return <Truck className="h-4 w-4 text-purple-500" />;
      case 'entregado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'reembolsado':
        return <CreditCard className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
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
    
    return matchesStatus && matchesSubmitted && matchesDate;
  });

  // Resetear paginación cuando cambian los filtros
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [statusFilter, submittedFilter, dateFilter.startDate, dateFilter.endDate]);

  // Obtener datos paginados de las órdenes filtradas
  const totalFiltered = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pagination.limit));
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error al cargar las órdenes</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={loadOrders}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="h-8 w-8 text-gray-300" />
            <h1 className="text-3xl font-bold text-gray-100">Mis Pedidos</h1>
          </div>
          <p className="text-gray-400 mb-6">
            Aquí puedes ver el historial de todos tus pedidos y su estado actual.
          </p>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <label className="text-white text-sm">Estado:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente (No pagado)</option>
                <option value="pagado">Pagado</option>
                <option value="procesando">Procesando</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
                <option value="reembolsado">Reembolsado</option>
                <option value="parcialmente_devuelto">Parcialmente devuelto</option>
                <option value="devuelto">Devuelto</option>
                <option value="disputa">Disputa</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-white text-sm">Enviado:</label>
              <select
                value={submittedFilter}
                onChange={(e) => setSubmittedFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
              >
                <option value="all">Todos</option>
                <option value="submitted">Enviados</option>
                <option value="not_submitted">No enviados</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-white text-sm">Desde:</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                title="Fecha de inicio"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-white text-sm">Hasta:</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
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
                className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1"
                title="Limpiar filtros"
              >
                <XCircle className="h-4 w-4" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Orders List */}
        {totalFiltered === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
            <Package className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No tienes pedidos aún</h2>
            <p className="text-gray-400 mb-6">
              Cuando realices tu primera compra, aparecerá aquí.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded-lg transition-all duration-300"
            >
              <Package className="h-5 w-5 mr-2" />
              Comenzar a comprar
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedOrders.map((order) => {
              const courier = couriers.find(c => c.id === order.courier_id);
              const trackingUrl = courier?.url && order.tracking_code ? `${courier.url}${order.tracking_code}` : null;
              
              return (
                <div
                  key={order.id}
                  className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl overflow-hidden hover:border-yellow-400/50 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800/30 to-gray-900/30">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <span className="text-xl font-bold text-white">
                            Pedido #{order.id}
                          </span>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center space-x-2 text-gray-300">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'Fecha no disponible'}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-400">
                          ${order.total.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Información de envío */}
                    {(courier || order.tracking_code) && (
                      <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <Truck className="h-5 w-5 text-blue-400" />
                            <div>
                              <p className="text-white font-medium">
                                {courier ? `Enviado por ${courier.name}` : 'Paquetería no especificada'}
                              </p>
                              {order.tracking_code && (
                                <p className="text-gray-300 text-sm">
                                  Código: {order.tracking_code}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>Rastrear envío</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Productos</h3>
                      <button
                        onClick={() => {
                          fetchOrderDetails(order.id);
                          setShowOrderDetails({ show: true, orderId: order.id });
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Ver detalles</span>
                      </button>
                    </div>
                    <OrderCard order={order} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Paginación */}
        {totalFiltered > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-6 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="text-sm text-gray-400">
              Mostrando {startIndex + 1} - {Math.min(endIndex, totalFiltered)} de {totalFiltered}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setPagination(prev => ({ ...prev, page: prev.page - 1 }));
                  window.scrollTo(0, 0);
                }}
                disabled={pagination.page <= 1}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
              >
                Anterior
              </button>
              
              <span className="text-sm text-gray-300">
                Página {pagination.page} de {totalPages}
              </span>
              
              <button
                onClick={() => {
                  setPagination(prev => ({ ...prev, page: prev.page + 1 }));
                  window.scrollTo(0, 0);
                }}
                disabled={pagination.page >= totalPages}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
              >
                Siguiente
              </button>
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
                  <XCircle className="h-6 w-6" />
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
                        {orderDetails.shipping_snapshot ? (
                          <>
                            <p className="text-white font-medium">{orderDetails.shipping_snapshot.label || 'Dirección'}</p>
                            <p className="text-gray-300 text-sm">{orderDetails.shipping_snapshot.name || ''}</p>
                            <p className="text-gray-300 text-sm">{orderDetails.shipping_snapshot.address_line1}</p>
                            {orderDetails.shipping_snapshot.address_line2 && (
                              <p className="text-gray-400 text-sm">{orderDetails.shipping_snapshot.address_line2}</p>
                            )}
                            <p className="text-gray-300 text-sm">
                              {orderDetails.shipping_snapshot.city}{orderDetails.shipping_snapshot.state ? `, ${orderDetails.shipping_snapshot.state}` : ''} {orderDetails.shipping_snapshot.postal_code || ''}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {(orderDetails.shipping_snapshot.country || 'MX')} {orderDetails.shipping_snapshot.phone ? `· ${orderDetails.shipping_snapshot.phone}` : ''}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-white font-medium">{orderDetails.shipping_city || 'Ciudad no disponible'}</p>
                            <p className="text-gray-300 text-sm">{orderDetails.shipping_state || 'Estado no disponible'}</p>
                            <p className="text-gray-300 text-sm">{orderDetails.shipping_country || 'País no disponible'}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
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
      </div>
    </div>
  );
};

export default OrdersPage;
