import React, { useState } from 'react';
import { Package, Calendar, MapPin, CreditCard, Truck, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import OrderCard from './OrderCard';

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { orders, loading, error, loadOrders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

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
          <p className="text-gray-400">
            Aquí puedes ver el historial de todos tus pedidos y su estado actual.
          </p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
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
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors"
              >
                {/* Order Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        <span className="text-lg font-semibold text-gray-100">
                          Pedido #{order.id}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:items-end space-y-2">
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Fecha no disponible'}
                        </span>
                      </div>
                      <div className="text-xl font-bold text-gray-100">
                        ${order.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-6">
                  <OrderCard order={order} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
