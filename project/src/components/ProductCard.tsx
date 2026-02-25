import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Sparkles } from 'lucide-react';
import { buildMediaUrl, isVideoUrl } from '../utils/storage';
import { supabase } from '../lib/supabase';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  
  // Obtener la variante default
  const getDefaultVariant = () => {
    if (!product.variants || product.variants.length === 0) return null;
    return product.variants.find(v => v.is_default === true) || null;
  };

  // Obtener modelos disponibles (excluyendo el default; ningún modelo se repite)
  const getAvailableModels = () => {
    if (!product.variants || product.variants.length === 0) return [];
    const defaultVariant = getDefaultVariant();
    const defaultModelNorm = (defaultVariant?.model ?? '').trim().toLowerCase();
    // Excluir variantes inactivas, la default por id, o con el mismo nombre de modelo que la default
    const nonDefaultVariants = product.variants.filter(v => {
      if (v.is_active === false) return false;
      if (defaultVariant && v.id === defaultVariant.id) return false;
      const vModel = (v.model ?? '').trim().toLowerCase();
      if (defaultModelNorm && vModel === defaultModelNorm) return false;
      return true;
    });

    // Agrupar por modelo (sin duplicados) y asignar índices
    const modelMap = new Map<string, { index: number }>();
    let modelIndex = 1;
    nonDefaultVariants.forEach(variant => {
      const modelKey = (variant.model ?? '').trim();
      if (!modelMap.has(modelKey)) {
        modelMap.set(modelKey, { index: modelIndex++ });
      }
    });

    return Array.from(modelMap.entries()).map(([model, data]) => ({ model, index: data.index }));
  };
  
  // Obtener nombre de modelo para mostrar
  const getModelDisplayName = (model: string | null | undefined, isDefault: boolean, modelIndex?: number): string => {
    if (isDefault) {
      return model || 'Principal';
    }
    
    if (!model || model.trim() === '') {
      // Si no tiene nombre, usar "Modelo {número}"
      return `Modelo ${modelIndex || 1}`;
    }
    
    return model;
  };

  const defaultVariant = getDefaultVariant();
  const availableModels = getAvailableModels();
  const [selectedModel, setSelectedModel] = useState('');
  const [variantImage, setVariantImage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedModel('');
    setVariantImage(null);
  }, [product.id]);

  // Si hay un modelo seleccionado, buscar esa variante, sino usar la default
  const selectedVariant = selectedModel 
    ? product.variants?.find(v => v.model === selectedModel && v.is_active !== false)
    : defaultVariant;

  // Cargar imagen de variante cuando cambia la selección
  useEffect(() => {
    const loadVariantImage = async () => {
      if (!selectedVariant) {
        setVariantImage(null);
        return;
      }
      
      // Si use_product_images es true, usar imagen del producto
      if (selectedVariant.use_product_images) {
        setVariantImage(null);
        return;
      }
      
      // Obtener primera imagen usando la función SQL
      try {
        const { data, error } = await supabase.rpc('get_variant_images', {
          p_variant_id: selectedVariant.id
        });
        
        if (error) {
          console.error('Error fetching variant image:', error);
          setVariantImage(null);
          return;
        }
        
        // Obtener la primera imagen ordenada
        const images = (data || [])
          .sort((a: any, b: any) => (a.ordering || 0) - (b.ordering || 0));
        
        if (images.length > 0 && images[0].url) {
          setVariantImage(images[0].url);
        } else {
          setVariantImage(null);
        }
      } catch (error) {
        console.error('Error in loadVariantImage:', error);
        setVariantImage(null);
      }
    };
    
    loadVariantImage();
  }, [selectedVariant]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  // Determinar qué imagen usar
  const getDisplayImage = () => {
    if (!selectedVariant) return product.image;
    
    // Si use_product_images es true, usar imagen del producto
    if (selectedVariant.use_product_images) {
      return product.image;
    }
    
    // Si hay imagen de variante cargada, usarla
    if (variantImage) {
      return variantImage;
    }
    
    // Fallback a imagen del producto
    return product.image;
  };

  const displayImage = buildMediaUrl(getDisplayImage());
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayOriginalPrice = selectedVariant?.original_price ?? product.original_price;
  const isVideo = isVideoUrl(displayImage);
  
  // Stock: verificar si hay stock en alguna variante activa
  const hasVariantStock = product.variants && product.variants.length > 0
    ? product.variants.some(variant => variant.is_active !== false && (variant.stock ?? 0) > 0)
    : false;
  const isSoldOut = !hasVariantStock;
  // La variante seleccionada en particular está agotada (pero hay otras disponibles)
  const selectedVariantSoldOut = !isSoldOut && selectedVariant != null && (selectedVariant.stock ?? 0) <= 0;

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
        {selectedVariantSoldOut && (
          <div className="absolute top-2 left-2">
            <span className="bg-orange-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              ESTE MODELO AGOTADO
            </span>
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
          {displayOriginalPrice && displayOriginalPrice > displayPrice && (
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

        {/* Selector de modelo — botones horizontales */}
        {availableModels.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">Modelo</p>
            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5"
              style={{ scrollbarWidth: 'none' }}
              onClick={handleSelectChange}
            >
              <button
                onClick={e => { e.stopPropagation(); setSelectedModel(''); }}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-semibold border transition-all duration-150 whitespace-nowrap ${
                  selectedModel === ''
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                }`}
              >
                {defaultVariant ? getModelDisplayName(defaultVariant.model, true) : 'Principal'}
              </button>
              {availableModels.map((modelData) => {
                const displayName = getModelDisplayName(modelData.model, false, modelData.index);
                return (
                  <button
                    key={modelData.model || `model-${modelData.index}`}
                    onClick={e => { e.stopPropagation(); setSelectedModel(modelData.model); }}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-semibold border transition-all duration-150 whitespace-nowrap ${
                      selectedModel === modelData.model
                        ? 'bg-yellow-400 text-black border-yellow-400'
                        : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sección de precios - más compacta */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-base sm:text-lg font-bold text-gray-300">
              {formatPrice(displayPrice)}
            </span>
            {displayOriginalPrice && displayOriginalPrice > displayPrice && (
              <>
                <span className="text-xs sm:text-sm text-gray-500 line-through">
                  {formatPrice(displayOriginalPrice)}
                </span>
                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {Math.round(((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {displayOriginalPrice && displayOriginalPrice > displayPrice && (
            <div className="mb-1">
              <span className="text-xs text-green-400 font-medium">
                Ahorras: {formatPrice(displayOriginalPrice - displayPrice)}
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