import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { supabase } from '../lib/supabase';
import type { Product, ProductVariant, Review } from '../types';
import { buildMediaUrl, isVideoUrl } from '../utils/storage';

const ProductPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  // Estados del producto
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Estados para reseñas
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewPermission, setReviewPermission] = useState<'checking' | 'can-review' | 'already-reviewed' | 'not-purchased'>('not-purchased');

  // Estados para productos relacionados
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Scroll al principio al cargar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Cargar producto y datos relacionados
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const productId = parseInt(id);
        
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            variants:product_variants(
              *,
              variant_images:variant_images(*)
            ),
            images:product_images(*),
            category:categories(*)
          `)
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        if (!productData) throw new Error('Product not found');

        setProduct(productData);
        
        // Resetear selección de variantes y establecer valores por defecto
        // Si hay variantes, no seleccionar ninguna por defecto para mostrar el producto principal
        const defaultModel = '';
        setSelectedModel(defaultModel);
        
        // Si hay un modelo seleccionado, obtener los tamaños disponibles
        if (defaultModel) {
          const sizes = productData.variants
            ?.filter((v: ProductVariant) => v.model === defaultModel)
            .map((v: ProductVariant) => v.size)
            .filter(Boolean) || [];
          const defaultSize = sizes.length > 0 ? (sizes[0] as string || '') : '';
          setSelectedSize(defaultSize);
        } else {
          setSelectedSize('');
        }
        
        setCurrentImageIndex(0);

        // Cargar reseñas
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (!reviewsError && reviewsData) {
          setReviews(reviewsData);
        }

        // Verificar si el usuario puede dejar reseña
        if (user) {
          await checkReviewPermission(productId);
        }
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, user]);

  // Meta Ads: ViewContent cuando el producto esté disponible
  useEffect(() => {
    if (product) {
      try {
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'ViewContent', {
            content_ids: [product.id],
            content_type: 'product',
            value: product.price,
            currency: 'MXN',
          });
        }
      } catch {}
    }
  }, [product]);

  // Cargar productos relacionados
  useEffect(() => {
    if (product?.category_id) {
      const fetchRelatedProducts = async () => {
        try {
          const { data, error } = await supabase
            .from('products')
            .select(`
              *,
              variants:product_variants(*),
              images:product_images(*),
              category:categories(*)
            `)
            .eq('category_id', product.category_id)
            .neq('id', product.id)
            .limit(8);

          if (error) throw error;
          setRelatedProducts(data || []);
        } catch (error) {
          console.error('Error loading related products:', error);
        }
      };

      fetchRelatedProducts();
    }
  }, [product?.category_id, product?.id]);

  const checkReviewPermission = async (productId: number) => {
    if (!user) {
      setReviewPermission('not-purchased');
      return;
    }
    
    setReviewPermission('checking');
    try {
      // Verificar si el usuario ya ha dejado reseña
      const { data: existingReview, error: reviewError } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (reviewError) throw reviewError;

      if (existingReview) {
        setReviewPermission('already-reviewed');
        return;
      }

      // Verificar si el usuario ha comprado el producto
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setReviewPermission('not-purchased');
        return;
      }

      // Verificar si entre esas órdenes está el producto
      const orderIds = orders.map(order => order.id);
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('product_id', productId)
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      if (orderItems && orderItems.length > 0) {
        setReviewPermission('can-review');
      } else {
        setReviewPermission('not-purchased');
      }
    } catch (error) {
      console.error('Error checking review permission:', error);
      setReviewPermission('not-purchased');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;
    
    setReviewSubmitting(true);
    
    try {
      const userData = await supabase.auth.getUser();
      const userName = userData.data.user?.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     'Anónimo';

      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          product_id: product.id,
          user_id: user.id,
          user_name: userName,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        }])
        .select();
      
      if (error) throw error;
      
      setReviews([...reviews, data[0]]);
      setReviewForm({ rating: 5, comment: '' });
      setReviewPermission('already-reviewed');
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getAllImages = (): string[] => {
    if (!product) return [];
    
    const selectedVariant = product.variants?.find(v => 
      (v.model === selectedModel || !v.model) && 
      (v.size === selectedSize || !v.size)
    );

    if (selectedVariant && (selectedVariant.variant_images?.length || selectedVariant.image)) {
      const variantImages: string[] = [];
      
      if (selectedVariant.image) {
        variantImages.push(buildMediaUrl(selectedVariant.image));
      }
      
      if (selectedVariant.variant_images?.length) {
        selectedVariant.variant_images.forEach(img => {
          if (img.url) variantImages.push(buildMediaUrl(img.url));
        });
      }
      
      return variantImages;
    }
    
    const productImages: string[] = [];
    
    if (product.image) {
      productImages.push(buildMediaUrl(product.image));
    }
    
    if (product.images?.length) {
      product.images.forEach(img => {
        if (img.url) productImages.push(buildMediaUrl(img.url));
      });
    }
    
    return productImages;
  };

  // Handlers para swipe en móvil
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const allImages = getAllImages();
    
    if (isLeftSwipe && modalImageIndex < allImages.length - 1) {
      setModalImageIndex(modalImageIndex + 1);
    }
    if (isRightSwipe && modalImageIndex > 0) {
      setModalImageIndex(modalImageIndex - 1);
    }
  };

  const handleImageClick = () => {
    setModalImageIndex(currentImageIndex);
    setShowImageModal(true);
  };

  const handleModalNext = () => {
    const allImages = getAllImages();
    if (modalImageIndex < allImages.length - 1) {
      setModalImageIndex(modalImageIndex + 1);
    }
  };

  const handleModalPrev = () => {
    if (modalImageIndex > 0) {
      setModalImageIndex(modalImageIndex - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      const selectedVariant = product.variants?.find(v =>
        (v.model === selectedModel || !v.model) &&
        (v.size === selectedSize || !v.size)
      );

      const stock = selectedVariant?.stock ?? product.stock ?? 0;
      if (stock <= 0) {
        throw new Error('Este producto está agotado');
      }

      // Usar el hook addToCart que ya maneja la lógica de agrupación
      await addToCart(product, quantity, selectedVariant);

      // Meta Ads: AddToCart
      try {
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'AddToCart', {
            content_ids: [product.id],
            content_type: 'product',
            value: selectedVariant?.price ?? product.price,
            currency: 'MXN',
            num_items: quantity,
          });
        }
      } catch {}

      // Disparar evento personalizado para actualizar el carrito
      const cartUpdateEvent = new CustomEvent('cart-updated', { 
        detail: { action: 'add', productId: product.id, quantity } 
      });
      window.dispatchEvent(cartUpdateEvent);

      // Feedback visual
      const button = document.getElementById('add-to-cart-button');
      if (button) {
        button.textContent = '✓ Añadido';
        setTimeout(() => {
          button.textContent = stock > 0 ? 'AÑADIR AL CARRITO' : 'AGOTADO';
        }, 2000);
      }
    } catch (error) {
      console.error('Error al añadir al carrito:', error);
      if (error instanceof Error && error.message.includes('autenticado')) {
        navigate('/login', { state: { from: window.location.pathname } });
      }
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Producto no encontrado</h1>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const selectedVariant = product.variants?.find(v => 
    (v.model === selectedModel || !v.model) && 
    (v.size === selectedSize || !v.size)
  );

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const allImages = getAllImages();
  const currentImage = allImages[currentImageIndex] || buildMediaUrl(product.image);
  const currentImageIsVideo = isVideoUrl(currentImage);
  const discountPercentage = product.original_price && product.original_price > currentPrice 
    ? Math.round(((product.original_price - currentPrice) / product.original_price) * 100)
    : 0;
  const stock = selectedVariant?.stock ?? product?.stock ?? 0;

  // Widget de estimación de entrega (sin dependencias externas)
  const addBusinessDays = (date: Date, days: number) => {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) added++;
    }
    return result;
  };
  const getDeliveryEstimate = (now = new Date(), cutoffHour = 14) => {
    const handlingDays = 1;
    const shippingMin = 3;
    const shippingMax = 5;
    const orderDate = now.getHours() >= cutoffHour ? addBusinessDays(now, 1) : now;
    const shipDate = addBusinessDays(orderDate, handlingDays);
    const minDate = addBusinessDays(shipDate, shippingMin);
    const maxDate = addBusinessDays(shipDate, shippingMax);
    const format = (d: Date) => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    return { shipDate: format(shipDate), range: `${format(minDate)} – ${format(maxDate)}` };
  };
  const { shipDate, range } = getDeliveryEstimate();

  const shippingTimeline = [
    {
      title: '1. Cómpralo ahora',
      detail: 'Confirma tu pedido hoy mismo para asegurar disponibilidad.',
    },
    {
      title: `2. Se envía ${shipDate}`,
      detail: 'Preparamos y despachamos tu joya antes de las 2 p.m.',
    },
    {
      title: `3. Recíbelo entre ${range}`,
      detail: 'Ventana estimada de entrega con nuestro envío asegurado.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black" ref={topRef}>
      {/* Header con navegación */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Volver</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`p-2 rounded-full transition-colors ${
                  isWishlisted 
                    ? 'text-red-500 bg-red-500/10' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                }`}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              
              
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Galería de imágenes */}
          <div className="w-full flex flex-col items-center md:flex-row md:items-start gap-4">
            {allImages.length > 1 && (
              <div className="md:min-w-[5rem] flex md:flex-col gap-2 md:mr-4 mb-2 md:mb-0 overflow-x-auto md:overflow-y-auto md:max-h-80 max-w-full md:max-w-none scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 relative" style={{ maxHeight: '450px' }}>
                {allImages.map((img, idx) => {
                  const isVideo = isVideoUrl(img);
                  return (
                    <button
                      key={`${img}-${idx}`}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`border-2 rounded-lg overflow-hidden w-16 h-16 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                        idx === currentImageIndex
                          ? 'border-yellow-400' 
                          : 'border-gray-700'
                      }`}
                      style={{ background: '#111' }}
                    >
                      {isVideo ? (
                        <video src={img} className="object-contain w-full h-full" muted playsInline />
                      ) : (
                        <img src={img} alt={`Vista ${idx + 1}`} className="object-contain w-full h-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div 
              className="w-full max-w-md h-[28rem] flex items-center justify-center rounded-2xl shadow-2xl border-2 border-gray-800 bg-black mb-6 p-4 cursor-pointer"
              onClick={handleImageClick}
            >
              {currentImageIsVideo ? (
                <video
                  src={currentImage}
                  className="w-full h-full object-contain rounded-xl drop-shadow-xl"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-xl drop-shadow-xl"
                />
              )}
            </div>
          </div>
          
          {/* Información del producto */}
          <div className="w-full flex flex-col justify-center">
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">{product.name}</h1>
            <p className="text-lg text-yellow-400 font-semibold mb-2 tracking-wide">{product.material}</p>
            <p className="text-gray-300 text-xl mb-6 leading-relaxed">{product.description}</p>
            
            <div className="flex items-center space-x-4 mb-6">
              <span className="text-4xl font-bold text-yellow-300 drop-shadow-sm">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(currentPrice)}
              </span>

              {product.original_price && product.original_price > currentPrice && (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-2xl text-gray-500 line-through">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(product.original_price)}
                  </span>
                  <span className="bg-red-600 text-white px-2 py-1 rounded-md text-sm font-bold">
                    {discountPercentage}% OFF
                  </span>
                </div>
              )}
            </div>

            {/* Widgets de optimización de conversiones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Widget de envío gratis */}
              <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-green-400 text-2xl mb-2">🚚</div>
                <h4 className="text-green-300 font-semibold text-sm mb-1">Envío Gratis</h4>
                <p className="text-green-200 text-xs">A partir de $5,000 MXN</p>
              </div>

              {/* Widget de garantía */}
              {product.has_warranty && (
                <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-500/30 rounded-lg p-4 text-center">
                  <div className="text-blue-400 text-2xl mb-2">🛡️</div>
                  <h4 className="text-blue-300 font-semibold text-sm mb-1">Garantía</h4>
                  <p className="text-blue-200 text-xs">
                    {product.warranty_period} {product.warranty_unit}
                    {product.warranty_description && (
                      <span className="block mt-1 text-xs opacity-80">{product.warranty_description}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Widget de devoluciones */}
              <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-500/30 rounded-lg p-4 text-center">
                <div className="text-purple-400 text-2xl mb-2">↩️</div>
                <h4 className="text-purple-300 font-semibold text-sm mb-1">Devoluciones</h4>
                <p className="text-purple-200 text-xs">Hasta 1 mes después de recibir</p>
              </div>
            </div>

            {/* Widget de estimación de entrega */}
            <div className="mb-6 bg-gray-800/40 border border-gray-700 rounded-lg p-4">
              <div className="space-y-3">
                {shippingTimeline.map((step, index) => (
                  <div key={step.title} className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold text-sm border border-yellow-500/40">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{step.title}</p>
                      <p className="text-gray-300 text-xs">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Selector de variantes */}
            {product.variants && product.variants.length > 0 && (
              <div className="w-full mb-6">
                {product.variants.some((v: ProductVariant) => v.model) && (
                  <>
                    <label className="block text-gray-300 text-sm font-semibold mb-2 tracking-wide">Modelo:</label>
                    <select
                      className="w-full bg-gray-900 text-white rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-yellow-400 text-base font-medium shadow-sm transition-all duration-200 mb-4"
                      value={selectedModel}
                      onChange={e => {
                        setSelectedModel(e.target.value);
                        const sizes = product.variants
                          ?.filter((v: ProductVariant) => v.model === e.target.value)
                          .map((v: ProductVariant) => v.size)
                          .filter(Boolean) || [];
                        setSelectedSize(sizes[0] || '');
                      }}
                    >
                      <option value="">Producto Principal</option>
                      {[...new Set(product.variants.map((v: ProductVariant) => v.model).filter(Boolean))].map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </>
                )}
                
                {product.variants.some((v: ProductVariant) => v.size && v.model === selectedModel) && (
                  <>
                    <label className="block text-gray-300 text-sm font-semibold mb-2 tracking-wide">Tamaño:</label>
                    <select
                      className="w-full bg-gray-900 text-white rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-yellow-400 text-base font-medium shadow-sm transition-all duration-200"
                      value={selectedSize}
                      onChange={e => setSelectedSize(e.target.value)}
                    >
                      {[...new Set(product.variants
                        .filter((v: ProductVariant) => v.model === selectedModel)
                        .map((v: ProductVariant) => v.size)
                        .filter(Boolean)
                      )].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}
            
            {/* Cantidad y botón agregar */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Cantidad
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold text-white w-16 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                id="add-to-cart-button"
                onClick={handleAddToCart}
                disabled={stock <= 0}
                className={`w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-4 px-6 rounded-xl font-bold text-2xl tracking-wide hover:shadow-2xl hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                {stock > 0 ? 'AÑADIR AL CARRITO' : 'AGOTADO'}
              </button>
            </div>
            
            {/* Estado de stock */}
            <div className="flex items-center gap-2 mt-6">
              <div className={`w-2 h-2 rounded-full ${stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock > 0 ? 'Disponible' : 'Agotado'}
              </span>
            </div>
          </div>
        </div>

        {/* Sección de productos relacionados */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-white mb-6">Más de {product?.category?.name || 'esta categoría'}</h3>
            
            <div className="relative">
              <div className="overflow-hidden">
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                  {relatedProducts.map((relatedProduct) => (
                    <div 
                      key={relatedProduct.id} 
                      className="flex-shrink-0 w-64 bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 hover:border-yellow-400 transition-colors cursor-pointer"
                      onClick={() => navigate(`/producto/${relatedProduct.id}`)}
                    >
                      <div className="h-48 bg-black flex items-center justify-center p-4">
                        {isVideoUrl(relatedProduct.image) ? (
                          <video 
                            src={buildMediaUrl(relatedProduct.image)} 
                            className="max-h-full max-w-full object-contain"
                            muted
                            playsInline
                            loop
                            autoPlay
                          />
                        ) : (
                          <img 
                            src={buildMediaUrl(relatedProduct.image)}
                            alt={relatedProduct.name} 
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="text-white font-semibold truncate">{relatedProduct.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-yellow-400 font-bold">
                            {new Intl.NumberFormat('es-MX', { 
                              style: 'currency', 
                              currency: 'MXN' 
                            }).format(relatedProduct.price)}
                          </span>
                          {relatedProduct.original_price && (
                            <span className="text-gray-500 text-sm line-through">
                              {new Intl.NumberFormat('es-MX', { 
                                style: 'currency', 
                                currency: 'MXN' 
                              }).format(relatedProduct.original_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección de reseñas */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-white mb-6">Reseñas de clientes</h3>
          
          {reviews.length > 0 ? (
            <div className="space-y-6 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
              {reviews.map(review => (
                <div key={review.id} className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-800">
                  <div className="flex items-center mb-2">
                    <span className="font-bold text-yellow-400 mr-2">{review.user_name}</span>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={16} 
                          fill={i < review.rating ? 'currentColor' : 'none'} 
                          className="mr-1" 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 text-base mb-2">{review.comment}</p>
                  <span className="text-xs text-gray-500">
                    {review.created_at ? new Date(review.created_at).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Aún no hay reseñas para este producto.</p>
          )}
        </div>

        {/* Formulario de reseña */}
        {reviewPermission === 'can-review' && (
          <div className="mt-10 bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-800 max-w-xl mx-auto">
            <h4 className="text-xl font-bold text-white mb-4">Deja tu reseña</h4>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Calificación:</label>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, rating: star})}
                      className="mr-2 focus:outline-none"
                    >
                      <Star 
                        size={24} 
                        fill={star <= reviewForm.rating ? 'currentColor' : 'none'} 
                        className={`${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-400'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Comentario:</label>
                <textarea
                  className="w-full bg-gray-800 text-white rounded p-2 border border-gray-700"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                  rows={3}
                  required
                  minLength={10}
                  placeholder="Escribe tu experiencia con este producto (mínimo 10 caracteres)"
                />
              </div>
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-xl font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {reviewSubmitting ? 'Enviando...' : 'Enviar reseña'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal de imágenes */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setShowImageModal(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>

          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModalPrev();
                }}
                disabled={modalImageIndex === 0}
                className="absolute left-4 z-10 text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-12 w-12" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModalNext();
                }}
                disabled={modalImageIndex === allImages.length - 1}
                className="absolute right-4 z-10 text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-12 w-12" />
              </button>
            </>
          )}

          <div 
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideoUrl(allImages[modalImageIndex]) ? (
              <video
                src={allImages[modalImageIndex]}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={allImages[modalImageIndex]}
                alt={`${product.name} - Vista ${modalImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalImageIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === modalImageIndex ? 'bg-yellow-400 w-8' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductPage;