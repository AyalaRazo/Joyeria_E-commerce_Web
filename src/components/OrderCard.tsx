import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Package, Eye, EyeOff } from 'lucide-react';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [showItems, setShowItems] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const formatAddress = (address: any) => {
    if (!address) return 'Dirección no disponible';
    
    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  return (
    <div className="space-y-4">
      {/* Order Items */}
      <div>
        <button
          onClick={() => setShowItems(!showItems)}
          className="flex items-center justify-between w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-gray-300" />
            <span className="font-medium text-gray-200">
              Productos ({order.order_items?.length || 0})
            </span>
          </div>
          {showItems ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showItems && (
          <div className="mt-4 space-y-3">
            {order.order_items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700"
              >
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <img
                    src={item.variant?.image || item.product?.image || '/default-product-image.png'}
                    alt={item.product?.name || 'Producto'}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-product-image.png';
                    }}
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-200 truncate">
                    {item.product?.name || 'Producto'}
                  </h3>
                  {item.variant && (
                    <p className="text-xs text-gray-400 mt-1">
                      Variante: {item.variant.name}
                      {item.variant.size && ` - Talla: ${item.variant.size}`}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-gray-400">
                      Cantidad: {item.quantity}
                    </span>
                    <span className="text-sm font-medium text-gray-200">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Total for this item */}
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-100">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipping Address */}
      {order.addresses && order.addresses.length > 0 && (
        <div>
          <button
            onClick={() => setShowAddress(!showAddress)}
            className="flex items-center justify-between w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-300" />
              <span className="font-medium text-gray-200">
                Dirección de envío
              </span>
            </div>
            {showAddress ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showAddress && (
            <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
              {order.addresses.map((address, index) => (
                <div key={address.id || index} className="space-y-2">
                  {address.name && (
                    <div className="text-sm font-medium text-gray-200">
                      {address.name}
                    </div>
                  )}
                  <div className="text-sm text-gray-300">
                    {formatAddress(address)}
                  </div>
                  {address.phone && (
                    <div className="text-sm text-gray-400">
                      Teléfono: {address.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Total del pedido:</span>
          <span className="text-lg font-bold text-gray-100">
            ${order.total.toFixed(2)}
          </span>
        </div>
        
        {order.tracking_code && (
          <div className="mt-2 flex justify-between items-center">
            <span className="text-sm text-gray-400">Código de seguimiento:</span>
            <span className="text-sm font-mono text-gray-300 bg-gray-700 px-2 py-1 rounded">
              {order.tracking_code}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
