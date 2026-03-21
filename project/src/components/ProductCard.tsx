import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Sparkles, Star, Tag } from 'lucide-react';
import { buildMediaUrl, isVideoUrl } from '../utils/storage';
import { isProductNew } from '../utils/product';
import { supabase } from '../lib/supabase';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();

  const getDefaultVariant = () => {
    if (!product.variants || product.variants.length === 0) return null;
    return product.variants.find(v => v.is_default === true) || null;
  };

  const getAvailableModels = () => {
    if (!product.variants || product.variants.length === 0) return [];
    const defaultVariant = getDefaultVariant();
    const defaultModelNorm = (defaultVariant?.model ?? '').trim().toLowerCase();
    const nonDefaultVariants = product.variants.filter(v => {
      if (v.is_active === false) return false;
      if (defaultVariant && v.id === defaultVariant.id) return false;
      const vModel = (v.model ?? '').trim().toLowerCase();
      if (defaultModelNorm && vModel === defaultModelNorm) return false;
      return true;
    });
    const modelMap = new Map<string, { index: number }>();
    let modelIndex = 1;
    nonDefaultVariants.forEach(variant => {
      const modelKey = (variant.model ?? '').trim();
      if (!modelMap.has(modelKey)) modelMap.set(modelKey, { index: modelIndex++ });
    });
    return Array.from(modelMap.entries()).map(([model, data]) => ({ model, index: data.index }));
  };

  const getModelDisplayName = (model: string | null | undefined, isDefault: boolean, modelIndex?: number): string => {
    if (isDefault) return model || 'Principal';
    if (!model || model.trim() === '') return `Modelo ${modelIndex || 1}`;
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

  const selectedVariant = selectedModel
    ? product.variants?.find(v => v.model === selectedModel && v.is_active !== false)
    : defaultVariant;

  useEffect(() => {
    const loadVariantImage = async () => {
      if (!selectedVariant) { setVariantImage(null); return; }
      if (selectedVariant.use_product_images) { setVariantImage(null); return; }
      const vid = selectedVariant.id;
      if (!vid || !Number.isInteger(vid) || vid <= 0) { setVariantImage(null); return; }
      try {
        const { data, error } = await supabase.rpc('get_variant_images', { p_variant_id: vid });
        if (error) { setVariantImage(null); return; }
        const images = (data || []).sort((a: any, b: any) => (a.ordering || 0) - (b.ordering || 0));
        setVariantImage(images.length > 0 && images[0].url ? images[0].url : null);
      } catch { setVariantImage(null); }
    };
    loadVariantImage();
  }, [selectedVariant]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  const getDisplayImage = () => {
    if (!selectedVariant) return product.image;
    if (selectedVariant.use_product_images) return product.image;
    if (variantImage) return variantImage;
    return product.image;
  };

  const displayImage = buildMediaUrl(getDisplayImage());
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayOriginalPrice = selectedVariant?.original_price ?? product.original_price;
  const isVideo = isVideoUrl(displayImage);

  const hasVariantStock = product.variants && product.variants.length > 0
    ? product.variants.some(v => v.is_active !== false && (v.stock ?? 0) > 0)
    : false;
  const isSoldOut = !hasVariantStock;
  const selectedVariantSoldOut = !isSoldOut && selectedVariant != null && (selectedVariant.stock ?? 0) <= 0;

  const hasDiscount = !!(displayOriginalPrice && displayOriginalPrice > displayPrice);
  const discountPct = hasDiscount
    ? Math.round(((displayOriginalPrice! - displayPrice) / displayOriginalPrice!) * 100)
    : 0;

  const isNew = isProductNew(product);
  const isFeatured = !!product.is_featured;

  const handleClick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); navigate(`/producto/${product.id}`); };
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="group relative bg-gray-900 rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/5 border border-gray-800/60 hover:border-gray-700/80"
      onClick={handleClick}
    >
      {/* ── Imagen ── */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-950">
        {isVideo ? (
          <video
            src={displayImage}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            muted loop playsInline autoPlay
          />
        ) : (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        )}

        {/* Gradiente inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Agotado */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-white text-xs font-semibold tracking-[0.2em] uppercase px-3 py-1.5 border border-white/20 rounded-full bg-black/40">
              Agotado
            </span>
          </div>
        )}
        {selectedVariantSoldOut && (
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-orange-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-orange-400/30">
              MODELO AGOTADO
            </span>
          </div>
        )}

        {/* ── Badges ── */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
              <Sparkles className="h-2.5 w-2.5 fill-emerald-300" />
              NUEVO
            </span>
          )}
          {isFeatured && (
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-[9px] font-bold bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 backdrop-blur-sm">
              <Star className="h-2.5 w-2.5 fill-yellow-300" />
              DESTACADO
            </span>
          )}
        </div>
      </div>

      {/* ── Info ── */}
      <div className="p-3.5 flex-1 flex flex-col gap-2.5">

        {/* Estrellas */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => {
              const fill = Math.min(Math.max((product.avg_rating ?? 0) - (i - 1), 0), 1);
              return (
                <span key={i} className="relative inline-block w-3 h-3">
                  <Star className="absolute inset-0 h-3 w-3 text-gray-700" />
                  {fill > 0 && (
                    <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {(product.review_count ?? 0) > 0 ? (
            <span className="text-[10px] text-gray-500">{product.avg_rating?.toFixed(1)} ({product.review_count})</span>
          ) : (
            <span className="text-[10px] text-gray-700">Sin reseñas</span>
          )}
        </div>

        {/* Nombre */}
        <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors duration-200 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {/* Selector de modelo */}
        {availableModels.length > 0 && (
          <div onClick={stopProp}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Modelo</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={e => { e.stopPropagation(); setSelectedModel(''); }}
                className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-150 whitespace-nowrap ${
                  selectedModel === ''
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                }`}
              >
                {defaultVariant ? getModelDisplayName(defaultVariant.model, true) : 'Principal'}
              </button>
              {availableModels.map(modelData => (
                <button
                  key={modelData.model || `model-${modelData.index}`}
                  onClick={e => { e.stopPropagation(); setSelectedModel(modelData.model); }}
                  className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-150 whitespace-nowrap ${
                    selectedModel === modelData.model
                      ? 'bg-yellow-400 text-black border-yellow-400'
                      : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {getModelDisplayName(modelData.model, false, modelData.index)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Precios ── */}
        <div className="mt-auto pt-1">
          {hasDiscount ? (
            <div className="space-y-0.5">
              {/* Precio actual + ahorro */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-yellow-400">{formatPrice(displayPrice)}</span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded-full">
                  <Tag className="h-2.5 w-2.5" />
                  -{discountPct}%
                </span>
              </div>
              {/* Precio original tachado */}
              <span className="text-xs text-gray-600 line-through">{formatPrice(displayOriginalPrice!)}</span>
            </div>
          ) : (
            <span className="text-base font-bold text-yellow-400">{formatPrice(displayPrice)}</span>
          )}
        </div>
      </div>

      {/* Borde glow en hover */}
      <div className="absolute inset-0 rounded-2xl border border-yellow-400/0 group-hover:border-yellow-400/10 transition-all duration-300 pointer-events-none" />
    </div>
  );
};

export default ProductCard;
