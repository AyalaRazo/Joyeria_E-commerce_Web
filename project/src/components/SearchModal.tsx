import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, SlidersHorizontal, Star, Tag, ShoppingBag } from 'lucide-react';
import { Product } from '../types/index';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, categories, loading } = useProducts();
  const { addToCart } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(false);

  const navigate = useNavigate();

  // Función para obtener detalles del producto
  const getProductDetails = (product: Product) => {
    let currentPrice = product.price;
    let originalPrice = product.original_price ?? null;
    let image = product.image;
    let stock = product.stock ?? 0;
    let hasDiscount = false;
    let discountPercentage = 0;

    // Manejo de variantes
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
      }
    }

    // Calcular descuentos
    if (originalPrice && originalPrice > currentPrice) {
      hasDiscount = true;
      discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }

    // Obtener nombre de categoría para mostrar
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
      categoryName
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
    let filtered = products;
    
    // Filtrado por término de búsqueda
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
  
    // Filtrado por rango de precio
    filtered = filtered.filter(product => {
      const { price } = getProductDetails(product);
      return price >= priceRange.min && price <= priceRange.max;
    });
  
    // Filtrado por destacados
    if (sortBy === 'featured') {
      filtered = filtered.filter(product => product.is_featured);
    }

    // Filtrado por productos con descuento
    if (showOnlyDiscounted) {
      filtered = filtered.filter(product => {
        const { hasDiscount } = getProductDetails(product);
        return hasDiscount;
      });
    }
  
    // Ordenamiento
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

  // Reset search when modal closes
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

  // Componente de tarjeta de producto simplificada
  const SimplifiedProductCard = ({ product }: { product: Product }) => {
    const {
      inStock,
      stock,
      price,
      originalPrice,
      hasDiscount,
      discountPercentage,
      image,
      isFeatured,
      isNew,
      categoryName
    } = getProductDetails(product);

    const [showStockCount, setShowStockCount] = useState(false);

    return (
      <div 
        className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-gray-400/10 transition-all duration-300 cursor-pointer h-full"
        onClick={() => navigate(`/producto/${product.id}`)}
      >
        {/* Imagen */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 z-10 flex flex-col space-y-1">
            {isNew && (
              <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                NUEVO
              </span>
            )}
            {isFeatured && (
              <span className="bg-gradient-to-r from-gray-300 to-gray-500 text-black px-2 py-0.5 rounded-full text-xs font-bold flex items-center space-x-1">
                <Star className="h-3 w-3" fill="currentColor" />
                <span>DESTACADO</span>
              </span>
            )}
            {hasDiscount && (
              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                -{discountPercentage}%
              </span>
            )}
          </div>
        </div>

        {/* Información del producto */}
        <div className="p-3">
          <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
            {categoryName} • {product.material || 'Material no especificado'}
          </p>
          
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-300">
                {formatPrice(price)}
              </span>
              {hasDiscount && originalPrice && (
                <span className="text-xs line-through text-gray-500">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 justify-between">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-xs ${inStock ? 'text-green-400' : 'text-red-400'}`}>
                  {inStock ? (showStockCount ? `${stock}` : 'Disponible') : 'Agotado'}
                </span>
              </div>
              {hasDiscount && originalPrice && (
                <span className="text-xs font-bold text-green-400">
                  Ahorras {formatPrice(originalPrice - price)}
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
      className="fixed inset-0 z-50 flex items-start justify-center px-2 sm:px-6 pt-20 pb-6"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black rounded-full p-3 shadow-lg hover:scale-110 transition-all duration-200"
          aria-label="Cerrar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 p-4 border-b border-gray-700">
          <Search className="h-5 w-5 text-gray-300" />
          <h2 className="text-lg font-bold text-white">Buscar Productos</h2>
        </div>

        {/* Input de búsqueda */}
        <div className="sm:p-2 border-b border-gray-800 bg-black/60 sticky top-0 z-20">
          <input
            type="text"
            className="w-full bg-gray-800 text-white rounded-lg p-2 border border-gray-700 focus:ring-2 focus:ring-yellow-400 text-lg font-medium shadow-sm transition-all duration-200 placeholder-gray-400"
            placeholder="Buscar por nombre, descripción o material..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        {/* Filtros */}
        <div className="p-2 sm:p-4 border-b border-gray-700">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border transition-all duration-300 ${
                showFilters 
                  ? 'border-gray-300 bg-gray-300/10 text-gray-300' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros</span>
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-gray-300 focus:outline-none transition-colors duration-300"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-gray-300 focus:outline-none transition-colors duration-300"
            >
              <option value="name">Nombre A-Z</option>
              <option value="price-low">Precio: Menor a Mayor</option>
              <option value="price-high">Precio: Mayor a Menor</option>
              <option value="featured">Destacados</option>
              <option value="discount">Mayor descuento</option>
            </select>

            <button
              onClick={() => setShowOnlyDiscounted(!showOnlyDiscounted)}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border transition-all duration-300 ${
                showOnlyDiscounted
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <Tag className="h-4 w-4" />
              <span className="text-sm font-medium">Ofertas</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-2 p-2 sm:mt-4 sm:p-4 bg-gray-800 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Filtros Avanzados</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Rango de Precio: {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio mínimo</label>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({...priceRange, min: parseInt(e.target.value)})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio máximo</label>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({...priceRange, max: parseInt(e.target.value)})}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
              <span className="ml-2 text-gray-300">Cargando productos...</span>
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No se encontraron productos</h3>
              <p className="text-gray-400">Intenta ajustar los filtros o términos de búsqueda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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