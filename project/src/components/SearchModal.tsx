import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, SlidersHorizontal, Star, Tag, Sparkles } from 'lucide-react';
import { Product } from '../types/index';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { buildMediaUrl } from '../utils/storage';
import { isProductNew } from '../utils/product';
import { supabase } from '../lib/supabase';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, categories, metalTypes, loading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMetalTypeId, setSelectedMetalTypeId] = useState<string>('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(false);

  const navigate = useNavigate();

  const getProductDetails = (product: Product) => {
    let currentPrice = product.price;
    let originalPrice = product.original_price ?? null;
    let image = product.image;
    let stock = product.stock ?? 0;
    let hasDiscount = false;
    let discountPercentage = 0;
    let selectedModel = '';
  
    // Obtener material del producto
    const material = product.material || '';
  
    if (product.variants && product.variants.length > 0) {
      const defaultModel = getDefaultModel(product);
      const defaultSize = getDefaultSize(product, defaultModel);
      const selectedVariant = product.variants.find(v => v.model === defaultModel && v.size === defaultSize) || 
                             product.variants.find(v => v.model === defaultModel) || 
                             product.variants.find(v => v.size === defaultSize) || 
                             product.variants[0];
  
      if (selectedVariant) {
        currentPrice = selectedVariant.price;
        originalPrice = selectedVariant.original_price ?? product.original_price ?? null;
        image = selectedVariant.image || product.image;
        stock = selectedVariant.stock ?? 0;
        selectedModel = selectedVariant.model || defaultModel || '';
      }
    }
  
    if (originalPrice && originalPrice > currentPrice) {
      hasDiscount = true;
      discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
  
    const category = categories.find(c => c.id === product.category_id);
    const categoryName = category ? category.name : '';
  
    return {
      inStock: stock > 0,
      stock,
      price: currentPrice,
      originalPrice,
      hasDiscount,
      discountPercentage,
      image,
      isFeatured: product.is_featured ?? false,
      isNew: isProductNew(product),
      categoryName,
      model: selectedModel,
      material: material // Agregado material aquí
    };
  };

  const getDefaultModel = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return '';
    const firstModel = product.variants.find(v => v.model) || product.variants[0];
    return firstModel?.model || '';
  };

  const getDefaultSize = (product: Product, model: string) => {
    const sizes = product.variants?.filter(v => v.model === model).map(v => v.size).filter(Boolean) || [];
    return sizes.length > 0 ? sizes[0] : '';
  };

  const filteredAndSortedProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    // Filtrar productos activos y variantes activas
    let filtered = products.filter(product => {
      if (product.is_active === false) return false;
      // Si tiene variantes, al menos una debe estar activa
      if (product.variants && product.variants.length > 0) {
        return product.variants.some(v => v.is_active !== false);
      }
      return true;
    });
    
    if (term) {
      filtered = filtered.filter(product => {
        const category = categories.find(c => c.id === product.category_id);
        const categoryName = category?.name.toLowerCase() || '';
        
        const matchesCategory = selectedCategory === 'all' || 
                             (category && category.name === selectedCategory);
        
        const matchesSearch =
          product.name.toLowerCase().includes(term) ||
          (product.material?.toLowerCase().includes(term) ?? false) ||
          (product.description?.toLowerCase().includes(term) ?? false) ||
          categoryName.includes(term);
        
        return matchesCategory && matchesSearch;
      });
    } else {
      filtered = [];
    }
  
    filtered = filtered.filter(product => {
      const { price } = getProductDetails(product);
      const matchesPrice = price >= priceRange.min && price <= priceRange.max;
      const matchesMetalType = selectedMetalTypeId === 'all' ||
        (product.variants && product.variants.some((v: any) => v.metal_type != null && String(v.metal_type) === selectedMetalTypeId));
      return matchesPrice && matchesMetalType;
    });
  
    if (sortBy === 'featured') {
      filtered = filtered.filter(product => product.is_featured);
    }

    if (showOnlyDiscounted) {
      filtered = filtered.filter(product => {
        const { hasDiscount } = getProductDetails(product);
        return hasDiscount;
      });
    }
  
    filtered = [...filtered].sort((a, b) => {
      const detailsA = getProductDetails(a);
      const detailsB = getProductDetails(b);
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return detailsA.price - detailsB.price;
        case 'price-high':
          return detailsB.price - detailsA.price;
        case 'featured':
          return a.name.localeCompare(b.name);
        case 'discount':
          return (detailsB.discountPercentage) - (detailsA.discountPercentage);
        default:
          return 0;
      }
    });
  
    return filtered;
  }, [products, searchTerm, selectedCategory, selectedMetalTypeId, priceRange, sortBy, showOnlyDiscounted, categories]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedCategory('all');
      setSelectedMetalTypeId('all');
      setPriceRange({ min: 0, max: 100000 });
      setShowFilters(false);
      setSortBy('name');
      setShowOnlyDiscounted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const SimplifiedProductCard = ({ product }: { product: Product }) => {
    const [selectedModel, setSelectedModel] = useState('');
    const [variantImage, setVariantImage] = useState<string | null>(null);

    const getDefaultVariant = () =>
      product.variants?.find(v => v.is_default === true) ?? null;

    const getAvailableModels = () => {
      if (!product.variants || product.variants.length === 0) return [];
      const def = getDefaultVariant();
      const defModelNorm = (def?.model ?? '').trim().toLowerCase();
      const others = product.variants.filter(v => {
        if (v.is_active === false) return false;
        if (def && v.id === def.id) return false;
        return !((defModelNorm && (v.model ?? '').trim().toLowerCase() === defModelNorm));
      });
      const map = new Map<string, { index: number }>();
      let idx = 1;
      others.forEach(v => { const k = (v.model ?? '').trim(); if (!map.has(k)) map.set(k, { index: idx++ }); });
      return Array.from(map.entries()).map(([model, d]) => ({ model, index: d.index }));
    };

    const defaultVariant = getDefaultVariant();
    const availableModels = getAvailableModels();
    const selectedVariant = selectedModel
      ? product.variants?.find(v => v.model === selectedModel && v.is_active !== false)
      : defaultVariant;

    useEffect(() => {
      const load = async () => {
        if (!selectedVariant || selectedVariant.use_product_images) { setVariantImage(null); return; }
        const vid = selectedVariant.id;
        if (!vid || !Number.isInteger(vid) || vid <= 0) { setVariantImage(null); return; }
        try {
          const { data, error } = await supabase.rpc('get_variant_images', { p_variant_id: vid });
          if (error) { setVariantImage(null); return; }
          const imgs = (data || []).sort((a: any, b: any) => (a.ordering || 0) - (b.ordering || 0));
          setVariantImage(imgs.length > 0 && imgs[0].url ? imgs[0].url : null);
        } catch { setVariantImage(null); }
      };
      load();
    }, [selectedVariant]);

    const displayImage = buildMediaUrl(
      !selectedVariant || selectedVariant.use_product_images ? product.image : (variantImage || product.image)
    );
    const displayPrice = selectedVariant?.price ?? product.price;
    const displayOriginalPrice = selectedVariant?.original_price ?? product.original_price;
    const hasDiscount = !!(displayOriginalPrice && displayOriginalPrice > displayPrice);
    const discountPct = hasDiscount
      ? Math.round(((displayOriginalPrice! - displayPrice) / displayOriginalPrice!) * 100)
      : 0;
    const isSoldOut = product.variants && product.variants.length > 0
      ? !product.variants.some(v => v.is_active !== false && (v.stock ?? 0) > 0)
      : false;
    const isNew = isProductNew(product);
    const isFeatured = !!product.is_featured;
    const { categoryName } = getProductDetails(product);
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    return (
      <div
        className="group relative bg-gray-900 rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/5 border border-gray-800/60 hover:border-gray-700/80"
        onClick={() => { navigate(`/producto/${product.id}`); onClose(); }}
      >
        {/* Imagen */}
        <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-950">
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {isSoldOut && (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
              <span className="text-white text-xs font-semibold tracking-[0.2em] uppercase px-3 py-1.5 border border-white/20 rounded-full bg-black/40">
                Agotado
              </span>
            </div>
          )}

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

        {/* Info */}
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

          {categoryName && (
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">{categoryName}</span>
          )}

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
                  {defaultVariant?.model || 'Principal'}
                </button>
                {availableModels.map(m => (
                  <button
                    key={m.model || `model-${m.index}`}
                    onClick={e => { e.stopPropagation(); setSelectedModel(m.model); }}
                    className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-150 whitespace-nowrap ${
                      selectedModel === m.model
                        ? 'bg-yellow-400 text-black border-yellow-400'
                        : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {m.model || `Modelo ${m.index}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Precio */}
          <div className="mt-auto pt-1">
            {hasDiscount ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-yellow-400">{formatPrice(displayPrice)}</span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded-full">
                    <Tag className="h-2.5 w-2.5" />
                    -{discountPct}%
                  </span>
                </div>
                <span className="text-xs text-gray-600 line-through">{formatPrice(displayOriginalPrice!)}</span>
              </div>
            ) : (
              <span className="text-base font-bold text-yellow-400">{formatPrice(displayPrice)}</span>
            )}
          </div>
        </div>

        <div className="absolute inset-0 rounded-2xl border border-yellow-400/0 group-hover:border-yellow-400/10 transition-all duration-300 pointer-events-none" />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-16 pb-4"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-gradient-to-b from-gray-900 to-black rounded-lg shadow-lg max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 bg-gray-800 text-white rounded-full p-2 hover:bg-gray-700 transition-colors duration-150"
          aria-label="Cerrar búsqueda"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center space-x-2 p-3 border-b border-gray-800">
          <Search className="h-4 w-4 text-gray-300" />
          <h2 className="text-base font-bold text-white">Buscar Productos</h2>
        </div>

        <div className="p-2 border-b border-gray-800 bg-black/60 sticky top-0 z-20">
          <input
            type="text"
            className="w-full bg-gray-800 text-white rounded p-2 border border-gray-700 focus:ring-1 focus:ring-yellow-400 text-sm placeholder-gray-400"
            placeholder="Buscar por nombre, material, modelo, metal..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="p-2 border-b border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs ${
                showFilters 
                  ? 'border-gray-300 bg-gray-300/10 text-gray-300' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filtros</span>
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:outline-none"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>

            <select
              value={selectedMetalTypeId}
              onChange={(e) => setSelectedMetalTypeId(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:outline-none"
            >
              <option value="all">Todos los metales</option>
              {metalTypes.map(mt => (
                <option key={mt.id} value={mt.id}>{mt.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:outline-none"
            >
              <option value="name">Nombre A-Z</option>
              <option value="price-low">Precio: Menor a Mayor</option>
              <option value="price-high">Precio: Mayor a Menor</option>
              <option value="featured">Destacados</option>
              <option value="discount">Mayor descuento</option>
            </select>

            <button
              onClick={() => setShowOnlyDiscounted(!showOnlyDiscounted)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs ${
                showOnlyDiscounted
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Ofertas</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-700">
              <h3 className="text-sm font-medium text-white mb-3">Filtros Avanzados</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Rango de Precio: {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio mínimo</label>
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="100"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({...priceRange, min: parseInt(e.target.value)})}
                        className="w-full h-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio máximo</label>
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="100"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value)})}
                        className="w-full h-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-300"></div>
              <span className="ml-2 text-gray-300 text-sm">Cargando productos...</span>
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-6">
              <Search className="h-9 w-9 text-gray-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-300 mb-1">No se encontraron productos</h3>
              <p className="text-gray-400 text-xs">Intenta ajustar los filtros o términos de búsqueda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredAndSortedProducts.map((product) => (
                <SimplifiedProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;