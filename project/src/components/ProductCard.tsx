import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Sparkles } from 'lucide-react';
import { buildMediaUrl, isVideoUrl } from '../utils/storage';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  
  const getDefaultModel = () => {
    if (!product.variants || product.variants.length === 0) return '';
    return '';
  };

  const [selectedModel, setSelectedModel] = useState(getDefaultModel());

  useEffect(() => {
    const defModel = getDefaultModel();
    setSelectedModel(defModel);
  }, [product.id]);

  const selectedVariant = selectedModel ? product.variants?.find(v => v.model === selectedModel) : null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const displayImage = buildMediaUrl(selectedVariant?.image || product.image);
  const displayPrice = selectedVariant?.price || product.price;
  const isVideo = isVideoUrl(displayImage);
  const hasVariantStock = product.variants && product.variants.length > 0
    ? product.variants.some(variant => (variant.stock ?? 0) > 0)
    : false;
  const baseAvailable = product.in_stock !== false && (product.stock ?? 0) > 0;
  const isSoldOut = !(baseAvailable || hasVariantStock);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/producto/${product.id}`);
  };

  const handleSelectChange = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-gray-400/10 transition-all duration-300 transform hover:scale-[1.02] h-full flex flex-col cursor-pointer"
      onClick={handleClick}
    >

      {/* Imagen o Video - dimensiones reducidas */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        {isVideo ? (
          <video
            src={displayImage}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            muted
            loop
            playsInline
            autoPlay
          />
        ) : (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Sparkles className="h-3.5 w-3.5 text-gray-300 animate-pulse" />
        </div>

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-sm font-medium">AGOTADO</span>
          </div>
        )}

        {/* Badges - manteniendo misma posición */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 justify-start">
          {product.is_new && (
            <span className="bg-green-600 text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold">NUEVO</span>
          )}
          {product.is_featured && (
            <span className="bg-gray-300 text-black px-1.5 py-0.5 rounded-full text-[9px] font-bold">DESTACADO</span>
          )}
          {product.original_price && product.original_price > displayPrice && (
            <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold">OFERTA</span>
          )}
        </div>
      </div>

      {/* Información del producto - más compacta */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="text-sm lg:text-base font-bold text-white mb-1 group-hover:text-gray-300 transition-colors duration-200 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs lg:text-sm font-medium text-yellow-400">
            {product.material}
          </p>
        </div>

        {/* Selector de modelo - más compacto */}
        {product.variants && product.variants.some(v => v.model) && (
          <div className="mb-3">
            <label className="block text-gray-400 text-[10px] mb-1">Modelo:</label>
            <select
              className="w-full bg-gray-800 text-white rounded p-2 border border-gray-700 text-xs"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              onClick={handleSelectChange}
            >
              <option value="">Principal</option>
              {[...new Set(product.variants.map(v => v.model).filter(Boolean))].map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sección de precios - más compacta */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-base sm:text-lg font-bold text-gray-300">
              {formatPrice(displayPrice)}
            </span>
            {product.original_price && product.original_price > displayPrice && (
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>

          {product.original_price && product.original_price > displayPrice && (
            <div className="mb-1">
              <span className="text-xs text-green-400 font-medium">
                Ahorras: {formatPrice(product.original_price - displayPrice)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Borde decorativo - más sutil */}
      <div className="absolute inset-0 border border-transparent group-hover:border-gray-300/20 rounded-xl transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};

export default ProductCard;