import React, { useState, useEffect } from 'react';
import { Package, ExternalLink, Truck, MapPin, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Order } from '../types';
import { buildMediaUrl, getVariantFirstImage } from '../utils/storage';

interface OrderCardProps {
  order: Order;
  compact?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [variantImages, setVariantImages] = useState<Map<number, string>>(new Map());

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
          if (image) imageMap.set(variantId, image);
        }
      }
      setVariantImages(imageMap);
    };
    loadVariantImages();
  }, [order.order_items]);

  const getItemImage = (item: any) =>
    buildMediaUrl(
      item.variant_id && variantImages.has(item.variant_id)
        ? variantImages.get(item.variant_id)!
        : item.variant?.image || item.product?.image
    );

  const formatAddress = (address: any) => {
    if (!address) return 'Dirección no disponible';
    const extInt = [address.exterior_number, address.interior_number].filter(Boolean);
    const extIntStr = extInt.length ? ` ${extInt.join(' int. ')}` : '';
    const parts = [
      address.address_line2 ? `${address.address_line2}${extIntStr}`.trim() : null,
      address.address_line1,
      address.city,
      address.state,
      address.postal_code ? `CP ${address.postal_code}` : null,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const itemsSubtotal = order.order_items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const subtotal = (order as any).transaction?.subtotal != null ? Number((order as any).transaction.subtotal) : itemsSubtotal;
  const shipping = (order as any).transaction?.shipping != null ? Number((order as any).transaction.shipping) : null;
  const taxes = (order as any).transaction?.taxes != null ? Number((order as any).transaction.taxes) : null;

  const items = order.order_items || [];
  const MAX_PREVIEW = 4;
  const previewItems = items.slice(0, MAX_PREVIEW);
  const extraCount = items.length - MAX_PREVIEW;

  /* ── Compact mode (summary/sidebar use) ── */
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-300">
          <div className="flex items-center space-x-1 mb-1">
            <Package className="h-3 w-3" />
            <span className="font-medium">{items.length} productos</span>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {items.slice(0, 3).map((item, idx) => (
              <div key={item.id || idx} className="flex justify-between items-center group">
                <Link
                  to={`/producto/${item.product_id}`}
                  className="truncate mr-2 hover:text-yellow-300 transition-colors flex items-center space-x-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{item.product?.name || 'Producto'}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <span className="font-medium">${item.price.toFixed(2)}</span>
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-gray-400 text-[10px]">+{items.length - 3} más...</div>
            )}
          </div>
        </div>
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

  /* ── Full card view ── */
  return (
    <div className="space-y-3">
      {/* Product image strip + names */}
      <div className="flex items-center gap-3">
        {/* Overlapping thumbnails */}
        <div className="flex flex-shrink-0" style={{ paddingRight: `${Math.min(previewItems.length - 1, 3) * 6}px` }}>
          {previewItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="relative w-11 h-11 rounded-lg overflow-hidden border-2 border-gray-900 flex-shrink-0"
              style={{ marginLeft: idx === 0 ? 0 : -10, zIndex: previewItems.length - idx }}
            >
              <img
                src={getItemImage(item)}
                alt={item.product?.name || ''}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-product-image.png'; }}
              />
            </div>
          ))}
          {extraCount > 0 && (
            <div
              className="w-11 h-11 rounded-lg border-2 border-gray-700 bg-gray-800/80 flex items-center justify-center flex-shrink-0"
              style={{ marginLeft: -10, zIndex: 0 }}
            >
              <span className="text-gray-400 text-[10px] font-bold">+{extraCount}</span>
            </div>
          )}
        </div>

        {/* Product names */}
        <div className="flex-1 min-w-0">
          {items.slice(0, 2).map((item, idx) => (
            <p key={item.id || idx} className="text-xs text-gray-300 truncate leading-snug">
              {item.product?.name || 'Producto'}
              {item.quantity > 1 && (
                <span className="text-gray-500 ml-1">×{item.quantity}</span>
              )}
            </p>
          ))}
          {items.length > 2 && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              +{items.length - 2} producto{items.length - 2 !== 1 ? 's' : ''} más
            </p>
          )}
          {items.length === 0 && (
            <p className="text-xs text-gray-500 italic">Sin productos</p>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      {items.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/30 transition-all text-[10px] text-gray-500 hover:text-gray-300"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Ocultar detalle' : 'Ver detalle del pedido'}
        </button>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-3 pt-1 border-t border-gray-700/40">
          {/* Items list */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/producto/${item.product_id}`}
                className="flex items-center gap-2.5 p-2 bg-gray-900/50 rounded-lg border border-gray-700/40 hover:border-yellow-400/40 hover:bg-gray-800/40 transition-all group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={getItemImage(item)}
                    alt={item.product?.name || ''}
                    className="w-10 h-10 object-cover rounded border border-gray-700 group-hover:border-yellow-400/50 transition-colors"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-product-image.png'; }}
                  />
                  <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-gray-900 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-gray-900">
                    {item.quantity}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-100 group-hover:text-yellow-300 transition-colors truncate">
                    {item.product?.name || 'Producto'}
                  </p>
                  {item.variant && (
                    <p className="text-[10px] text-gray-500 truncate">
                      {item.variant.model || 'Principal'}
                      {item.variant.size && ` · ${item.variant.size}`}
                      {item.variant.carat && item.variant.carat > 0 && ` · ${item.variant.carat}k`}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-yellow-400">${(item.price * item.quantity).toFixed(2)}</p>
                  {item.quantity > 1 && (
                    <p className="text-[10px] text-gray-500">${item.price.toFixed(2)} c/u</p>
                  )}
                </div>
                <ExternalLink className="h-3 w-3 text-gray-600 group-hover:text-yellow-400 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Cost summary */}
          <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/40 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-300">${subtotal.toFixed(2)}</span>
            </div>
            {shipping != null && shipping > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Envío
                </span>
                <span className="text-gray-300">${shipping.toFixed(2)}</span>
              </div>
            )}
            {shipping == null && order.total > subtotal && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Envío
                </span>
                <span className="text-gray-300">${(order.total - subtotal).toFixed(2)}</span>
              </div>
            )}
            {taxes != null && taxes > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Impuestos</span>
                <span className="text-gray-300">${taxes.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-gray-700">
              <span className="text-sm font-semibold text-gray-200">Total</span>
              <span className="text-base font-bold text-yellow-400">${order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping address */}
          {(order.shipping_address || (order.addresses && order.addresses.length > 0)) && (() => {
            const address = order.shipping_address || order.addresses?.[0];
            if (!address) return null;
            return (
              <div className="flex items-start gap-2 p-2.5 bg-gray-900/40 rounded-lg border border-gray-700/40 text-xs text-gray-400">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-500" />
                <div className="min-w-0">
                  {address.name && <p className="text-gray-300 font-medium truncate">{address.name}</p>}
                  <p className="truncate">{formatAddress(address)}</p>
                  {address.phone && (
                    <p className="flex items-center gap-1 mt-0.5 text-gray-500">
                      <Phone className="h-3 w-3" /> {address.phone}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default OrderCard;
