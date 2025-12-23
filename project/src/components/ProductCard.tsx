import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Star, Sparkles } from 'lucide-react';
import { buildMediaUrl, isVideoUrl } from '../utils/storage';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  
  // Lógica para manejar variantes - mostrar producto principal primero
  const getDefaultModel = () => {
    if (!product.variants || product.variants.length === 0) return '';
    // Si hay variantes, no seleccionar ninguna por defecto para mostrar el producto principal
    return '';
  };

  const [selectedModel, setSelectedModel] = useState(getDefaultModel());

  useEffect(() => {
    const defModel = getDefaultModel();
    setSelectedModel(defModel);
  }, [product.id]);

  // Solo usar variante si está seleccionada, sino usar producto principal
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

  // La disponibilidad se maneja en ProductPage

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navegación directa sin condiciones
    console.log('Navigating to:', `/producto/${product.id}`);
    navigate(`/producto/${product.id}`);
  };

  const handleSelectChange = (e: React.MouseEvent) => {
    e.stopPropagation();
  };



  return (
    <div
      className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl hover:shadow-gray-400/20 transition-all duration-500 transform hover:scale-105 h-full flex flex-col cursor-pointer"
      onClick={handleClick}
    >

      {/* Imagen o Video */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden">
        {isVideo ? (
          <video
            src={displayImage}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            muted
            loop
            playsInline
            autoPlay
          />
        ) : (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Sparkles className="h-5 w-5 text-gray-300 animate-pulse" />
        </div>

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-white font-bold tracking-widest">AGOTADO</span>
          </div>
        )}

        {/* Badges pequeños en la parte inferior de la imagen */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-start">
          {product.is_new && (
            <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">NUEVO</span>
          )}
          {product.is_featured && (
            <span className="bg-gray-300 text-black px-2 py-0.5 rounded-full text-[10px] font-bold">DESTACADO</span>
          )}
          {product.original_price && product.original_price > displayPrice && (
            <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">OFERTA</span>
          )}
        </div>
      </div>

      {/* Información del producto */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-base lg:text-lg font-bold text-white mb-1 group-hover:text-gray-300 transition-colors duration-300 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm lg:text-sm font-medium tracking-wide text-yellow-400">
            {product.material}
          </p>
        </div>


        {/* Selector de modelo (solo si hay variantes con modelo) */}
        {product.variants && product.variants.some(v => v.model) && (
          <div className="mb-4">
            <label className="block text-gray-400 text-xs mb-1">Modelo:</label>
            <select
              className="w-full bg-gray-800 text-white rounded p-4 md:p-2 border border-gray-700 text-xs sm:text-sm"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              onClick={handleSelectChange}
            >
              <option value="">Producto Principal</option>
              {[...new Set(product.variants.map(v => v.model).filter(Boolean))].map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sección de precios */}
        <div className="mt-auto">
          {/* Precio actual y original en línea */}
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-sm sm:text-xl font-bold text-gray-300">
              {formatPrice(displayPrice)}
            </span>
            {product.original_price && product.original_price > displayPrice && (
              <span className="text-xs sm:text-lg text-gray-500 line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>

          {/* Ahorro debajo */}
          {product.original_price && product.original_price > displayPrice && (
            <div className="mb-2">
              <span className="text-sm text-green-400 font-medium">
                Ahorras: {formatPrice(product.original_price - displayPrice)}
              </span>
            </div>
          )}

          {/* Estado de stock removido: ahora se maneja en ProductPage */}
        </div>
      </div>

      {/* Borde decorativo */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-gray-300/30 rounded-2xl transition-all duration-500 pointer-events-none"></div>
    </div>
  );
};

export default ProductCard;