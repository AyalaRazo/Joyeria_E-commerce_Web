import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Package, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Order } from '../types';
import { buildMediaUrl } from '../utils/storage';

interface OrderCardProps {
  order: Order;
  compact?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, compact = false }) => {
  const [showItems, setShowItems] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const formatAddress = (address: any) => {
    if (!address) return 'Dirección no disponible';
    
    const parts = [
      address.address_line1,
      address.city,
      address.state,
      address.postal_code
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  // Si es compacto, mostrar versión minimalista
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Resumen de productos */}
        <div className="text-xs text-gray-300">
          <div className="flex items-center space-x-1 mb-1">
            <Package className="h-3 w-3" />
            <span className="font-medium">{order.order_items?.length || 0} productos</span>
          </div>
          
          {/* Lista resumida de productos con enlaces */}
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {order.order_items?.slice(0, 3).map((item, idx) => (
              <div key={item.id || idx} className="flex justify-between items-center group">
                <Link 
                  to={`/producto/${item.product_id}`}
                  className="truncate mr-2 hover:text-yellow-300 transition-colors flex items-center space-x-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{item.product?.name || 'Producto'}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <span className="font-medium">
                  ${item.price.toFixed(2)}
                </span>
              </div>
            ))}
            {order.order_items && order.order_items.length > 3 && (
              <div className="text-gray-400 text-[10px]">
                +{order.order_items.length - 3} más...
              </div>
            )}
          </div>
        </div>

        {/* Dirección resumida */}
        {(order.shipping_address || (order.addresses && order.addresses.length > 0)) && (
          <div className="pt-2 border-t border-gray-700/50">
            <div className="flex items-start space-x-1 text-xs text-gray-300">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">
                {formatAddress(order.shipping_address || order.addresses?.[0])}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Versión normal (expandible)
  return (
    <div className="space-y-3">
      {/* Order Items */}
      <div>
        <button
          onClick={() => setShowItems(!showItems)}
          className="flex items-center justify-between w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded transition-colors text-sm"
        >
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-300" />
            <span className="font-medium text-gray-200">
              Productos ({order.order_items?.length || 0})
            </span>
          </div>
          {showItems ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {showItems && (
          <div className="mt-2 space-y-2">
            {order.order_items?.map((item) => (
              <Link 
                key={item.id}
                to={`/producto/${item.product_id}`}
                className="flex items-center space-x-3 p-2 bg-gray-800/30 rounded border border-gray-700 hover:bg-gray-700/50 transition-colors group"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Product Image */}
                <div className="flex-shrink-0 relative">
                  <img
                    src={buildMediaUrl(item.variant?.image || item.product?.image)}
                    alt={item.product?.name || 'Producto'}
                    className="w-12 h-12 object-cover rounded border border-gray-600 group-hover:border-yellow-400 transition-colors"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-product-image.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity rounded border-2 border-yellow-400/30"></div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <h3 className="text-xs font-medium text-gray-200 truncate group-hover:text-yellow-300 transition-colors">
                      {item.product?.name || 'Producto'}
                    </h3>
                    <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-yellow-400 transition-colors flex-shrink-0" />
                  </div>
                  {item.variant && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.variant.name}
                      {item.variant.size && ` - ${item.variant.size}`}
                    </p>
                  )}
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs text-gray-400">
                      {item.quantity}x
                    </span>
                    <span className="text-xs font-medium text-gray-200">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Total for this item */}
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-100">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Shipping Address */}
      {(order.shipping_address || (order.addresses && order.addresses.length > 0)) && (
        <div>
          <button
            onClick={() => setShowAddress(!showAddress)}
            className="flex items-center justify-between w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded transition-colors text-sm"
          >
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-300" />
              <span className="font-medium text-gray-200">
                Dirección de envío
              </span>
            </div>
            {showAddress ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {showAddress && (
            <div className="mt-2 p-3 bg-gray-800/30 rounded border border-gray-700 text-xs">
              {/* Usar shipping_address si está disponible, sino usar addresses para compatibilidad */}
              {(order.shipping_address ? [order.shipping_address] : (order.addresses || [])).map((address, index) => (
                <div key={address.id || index} className="space-y-1">
                  {address.name && (
                    <div className="font-medium text-gray-200">
                      {address.name}
                    </div>
                  )}
                  {address.label && (
                    <div className="text-gray-400">
                      {address.label}
                    </div>
                  )}
                  <div className="text-gray-300">
                    {formatAddress(address)}
                  </div>
                  {address.phone && (
                    <div className="text-gray-400">
                      Tel: {address.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-gray-800/30 rounded p-3 border border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Total:</span>
          <span className="text-base font-bold text-gray-100">
            ${order.total.toFixed(2)}
          </span>
        </div>        
      </div>
    </div>
  );
};

export default OrderCard;