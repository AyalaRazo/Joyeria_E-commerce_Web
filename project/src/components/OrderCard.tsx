import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Package, 
  ExternalLink, 
  User, 
  Phone,
  Truck,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Order } from '../types';
import { buildMediaUrl, getVariantFirstImage } from '../utils/storage';

interface OrderCardProps {
  order: Order;
  compact?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, compact = false }) => {
  const [showItems, setShowItems] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [variantImages, setVariantImages] = useState<Map<number, string>>(new Map());
  
  // Cargar imágenes de variantes cuando cambian los items
  useEffect(() => {
    const loadVariantImages = async () => {
      if (!order.order_items || order.order_items.length === 0) return;
      
      const imageMap = new Map<number, string>();
      
      for (const item of order.order_items) {
        const variantId = item.variant_id;
        const productImage = item.product?.image;
        const useProductImages = item.variant?.use_product_images;
        
        if (variantId) {
          const image = await getVariantFirstImage(variantId, productImage, useProductImages);
          if (image) {
            imageMap.set(variantId, image);
          }
        }
      }
      
      setVariantImages(imageMap);
    };
    
    loadVariantImages();
  }, [order.order_items]);

  const formatAddress = (address: any) => {
    if (!address) return 'Dirección no disponible';
    const extInt = [address.exterior_number, address.interior_number].filter(Boolean);
    const extIntStr = extInt.length ? ` ${extInt.join(' int. ')}` : '';
    const parts = [
      address.address_line2 ? `${address.address_line2}${extIntStr}`.trim() : null,
      address.address_line1,
      address.city,
      address.state,
      address.postal_code ? `CP ${address.postal_code}` : null
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Subtotal: de transaction si existe, sino de la suma de items
  const itemsSubtotal = order.order_items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const subtotal = (order as any).transaction?.subtotal != null ? Number((order as any).transaction.subtotal) : itemsSubtotal;
  const shipping = (order as any).transaction?.shipping != null ? Number((order as any).transaction.shipping) : null;
  const taxes = (order as any).transaction?.taxes != null ? Number((order as any).transaction.taxes) : null;

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

  // Versión normal (expandible) - MEJORADA
  return (
    <div className="space-y-4">
      {/* Order Items */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowItems(!showItems)}
          className="flex items-center justify-between w-full p-4 hover:bg-gray-700/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <Package className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-gray-100 block">
                Productos en tu pedido
              </span>
              <span className="text-sm text-gray-400">
                {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'artículo' : 'artículos'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-300">
              ${subtotal.toFixed(2)}
            </span>
            {showItems ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>

        {showItems && (
          <div className="border-t border-gray-700">
            <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
              {order.order_items?.map((item) => (
                <Link 
                  key={item.id}
                  to={`/producto/${item.product_id}`}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-yellow-400/50 hover:bg-gray-800/50 transition-all group"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Product Image with Quantity Badge */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={buildMediaUrl(
                        item.variant_id && variantImages.has(item.variant_id)
                          ? variantImages.get(item.variant_id)!
                          : item.variant?.image || item.product?.image
                      )}
                      alt={item.product?.name || 'Producto'}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-600 group-hover:border-yellow-400/70 transition-colors"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/default-product-image.png';
                      }}
                    />
                    {/* Quantity Badge */}
                    <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-900">
                      {item.quantity}
                    </div>

                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-100 group-hover:text-yellow-300 transition-colors line-clamp-1">
                          {item.product?.name || 'Producto'}
                        </h3>
                        {item.variant && (
                          <div className="space-y-0.5 mt-1">
                            <p className="text-xs text-gray-400">
                              {item.variant.model || 'Principal'}
                              {item.variant.size && ` • ${item.variant.size}`}
                            </p>
                            {/* Mostrar quilates si existen */}
                            {item.variant.carat && item.variant.carat > 0 && (
                              <p className="text-xs text-yellow-400 flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {item.variant.carat}k
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-baseline gap-2 mt-1.5">
                          <span className="text-sm font-semibold text-gray-200">
                            ${item.price.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">c/u</span>
                          {/* Mostrar precio original si hay descuento */}
                          {item.variant?.original_price && item.variant.original_price > item.price && (
                            <span className="text-xs text-gray-500 line-through">
                              ${item.variant.original_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Total Price */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-bold text-yellow-400">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-yellow-400 transition-colors flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shipping Address */}
      {(order.shipping_address || (order.addresses && order.addresses.length > 0)) && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowAddress(!showAddress)}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700/50 rounded-lg">
                <MapPin className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-gray-100 block">
                  Dirección de envío
                </span>
                {!showAddress && (
                  <span className="text-sm text-gray-400 line-clamp-1">
                    {(() => {
                      const address = order.shipping_address || order.addresses?.[0];
                      return address ? `${address.city}, ${address.state}` : 'Ver detalles';
                    })()}
                  </span>
                )}
              </div>
            </div>
            {showAddress ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showAddress && (
            <div className="border-t border-gray-700 p-4 bg-gray-900/30">
              {/* Usar shipping_address si está disponible, sino usar addresses para compatibilidad */}
              {(order.shipping_address ? [order.shipping_address] : (order.addresses || [])).map((address, index) => (
                <div key={address.id || index} className="space-y-3">
                  {address.name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-gray-100">
                        {address.name}
                      </span>
                    </div>
                  )}
                  {address.label && (
                    <div className="inline-block px-2 py-1 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 font-medium">
                      {address.label}
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{formatAddress(address)}</span>
                  </div>
                  {address.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone className="h-4 w-4" />
                      <span>{address.phone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Summary: usa transaction (shipping, taxes) cuando exista */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/50 rounded-lg p-4 border border-gray-700 shadow-lg">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Subtotal:</span>
            <span className="text-gray-200 font-medium">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          {shipping != null && shipping > 0 && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Envío:</span>
              </div>
              <span className="text-gray-200 font-medium">
                ${shipping.toFixed(2)}
              </span>
            </div>
          )}
          {shipping == null && order.total > subtotal && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Envío:</span>
              </div>
              <span className="text-gray-200 font-medium">
                ${(order.total - subtotal).toFixed(2)}
              </span>
            </div>
          )}
          {taxes != null && taxes > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Impuestos:</span>
              <span className="text-gray-200 font-medium">
                ${taxes.toFixed(2)}
              </span>
            </div>
          )}
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-200">Total:</span>
              <span className="text-2xl font-bold text-yellow-400">
                ${order.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Courier Info - NUEVO */}
      {order.courier && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <Truck className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Paquetería</p>
              <p className="text-sm font-medium text-gray-200">{order.courier.name}</p>
            </div>
            {order.courier.logo && (
              <img 
                src={order.courier.logo} 
                alt={order.courier.name}
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
