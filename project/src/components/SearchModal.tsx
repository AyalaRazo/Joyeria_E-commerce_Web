import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, SlidersHorizontal, Plus, Star, Tag, Box, Gem } from 'lucide-react';
// Agrega 'Gem' o 'Diamond' para representar materiales
import { Product } from '../types/index';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { buildMediaUrl } from '../utils/storage';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, categories, loading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
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
      isNew: product.is_new ?? false,
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
      return price >= priceRange.min && price <= priceRange.max;
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
  }, [products, searchTerm, selectedCategory, priceRange, sortBy, showOnlyDiscounted, categories]);

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
      setPriceRange({ min: 0, max: 10000 });
      setShowFilters(false);
      setSortBy('name');
      setShowOnlyDiscounted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const SimplifiedProductCard = ({ product }: { product: Product }) => {
    const {
      inStock,
      price,
      originalPrice,
      hasDiscount,
      discountPercentage,
      image,
      isFeatured,
      isNew,
      categoryName,
      model,
      material
    } = getProductDetails(product);

    return (
      <div 
        className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow hover:shadow-gray-400/5 transition-all duration-200 cursor-pointer h-full border border-gray-700 flex flex-col"
        onClick={() => navigate(`/producto/${product.id}`)}
      >
        <div className="relative aspect-square overflow-hidden bg-gray-900">
          <img
            src={buildMediaUrl(image)}
            alt={product.name}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Badges con iconos en esquina inferior izquierda */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 justify-start">
            {isNew && (
              <span className="bg-green-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center">
                <Plus className="h-3 w-3" fill="currentColor" />
              </span>
            )}
            {isFeatured && (
              <span className="bg-gray-300 text-black px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center">
                <Star className="h-2.5 w-2.5" fill="currentColor" />
              </span>
            )}
            {hasDiscount && (
              <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center">
                -{discountPercentage}%
              </span>
            )}
          </div>
        </div>

        <div className="p-3 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="text-xs font-bold text-white mb-1.5 line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
            
            {/* Mostrar materiales si existen */}
            {material && (
              <div className="flex items-center gap-1 mb-1.5">
                <Gem className="h-2.5 w-2.5 text-yellow-400" /> {/* Cambiado a amarillo */}
                <span className="text-[10px] text-yellow-400 truncate"> {/* Cambiado a amarillo */}
                  {material}
                </span>
              </div>
            )}
            
            {/* Mostrar modelo si existe - color blanco */}
            {model && (
              <div className="flex items-center gap-1 mb-1.5">
                <Box className="h-2.5 w-2.5 text-gray-400" />
                <span className="text-[10px] text-white font-medium truncate">
                  Modelo: {model}
                </span>
              </div>
            )}
            
            <p className="text-[10px] text-gray-400 mb-2 line-clamp-1">
              {categoryName}
            </p>
          </div>
          
          <div className="space-y-1.5 pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-300">
                {formatPrice(price)}
              </span>
              {hasDiscount && originalPrice && (
                <span className="text-[10px] line-through text-gray-500">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-[10px] ${inStock ? 'text-green-400' : 'text-red-400'}`}>
                  {inStock ? 'Disponible' : 'Agotado'}
                </span>
              </div>
              {hasDiscount && originalPrice && (
                <span className="text-[10px] font-bold text-green-400">
                  Ahorra {formatPrice(originalPrice - price)}
                </span>
              )}
            </div>
          </div>
        </div>
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
            placeholder="Buscar por nombre, material, modelo..."
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
                        max="10000"
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