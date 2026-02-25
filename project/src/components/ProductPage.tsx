import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Heart, X, ChevronLeft, ChevronRight, Truck, Shield, RotateCcw, ShoppingCart, Package, MapPin, ZoomIn, Lock, CreditCard } from 'lucide-react';
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
  const [selectedMetalType, setSelectedMetalType] = useState<number | null>(null);
  const [selectedCarat, setSelectedCarat] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [variantImages, setVariantImages] = useState<string[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [checkingFavorite, setCheckingFavorite] = useState(false);
  
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
              variant_images:variant_images(*),
              metal_type_info:metal_types(id, name)
            ),
            images:product_images(*),
            category:categories(*)
          `)
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        if (!productData) throw new Error('Product not found');

        setProduct(productData);
        
        // Obtener la variante default
        const defaultVariant = productData.variants?.find((v: ProductVariant) => v.is_default === true);
        
        // Resetear selección de variantes - empezar con la default (modelo vacío = default)
        setSelectedModel('');
        setSelectedSize('');
        setSelectedMetalType(defaultVariant?.metal_type ?? null);
        setSelectedCarat(defaultVariant?.carat ?? null);
        
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
          await checkFavoriteStatus(productId);
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

  const checkFavoriteStatus = async (productId: number) => {
    if (!user) {
      setIsWishlisted(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) throw error;
      setIsWishlisted(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsWishlisted(false);
    }
  };

  const handleToggleFavorite = async () => {
    // No permitir agregar a favoritos si no hay sesión
    if (!user) {
      return;
    }
    if (!product) {
      return;
    }
    if (checkingFavorite) return;
    try {
      setCheckingFavorite(true);
      const { data, error } = await supabase.rpc('toggle_favorite', {
        p_user_id: user.id,
        p_product_id: product.id
      });

      if (error) throw error;
      setIsWishlisted(data);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setCheckingFavorite(false);
    }
  };

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

  // Función para obtener imágenes de variante usando la función SQL get_variant_images
  const fetchVariantImages = async (variantId: number): Promise<string[]> => {
    try {
      const { data, error } = await supabase.rpc('get_variant_images', {
        p_variant_id: variantId
      });
      
      if (error) {
        console.error('Error fetching variant images:', error);
        return [];
      }
      
      // Ordenar por ordering y retornar solo las URLs
      const images: string[] = (data || [])
        .sort((a: any, b: any) => (a.ordering || 0) - (b.ordering || 0))
        .map((img: any) => buildMediaUrl(img.url));
      
      return images;
    } catch (error) {
      console.error('Error in fetchVariantImages:', error);
      return [];
    }
  };

  // Efecto para cargar imágenes de variante cuando cambia la selección
  useEffect(() => {
    const loadVariantImages = async () => {
      if (!product) {
        setVariantImages([]);
        return;
      }
      
      // Determinar qué variante usar
      let selectedVariant: ProductVariant | undefined;
      
      if (!selectedModel) {
        // Si no hay modelo seleccionado, usar variante default
        const defaultCandidates = product.variants?.filter(v => 
          v.is_default === true &&
          v.is_active !== false &&
          (v.size === selectedSize || !selectedSize || !v.size)
        ) || [];
        
        if (selectedMetalType != null || selectedCarat != null) {
          const match = defaultCandidates.find(v =>
            (selectedMetalType == null || v.metal_type === selectedMetalType) &&
            (selectedCarat == null || (v.carat != null && v.carat === selectedCarat))
          );
          if (match) selectedVariant = match;
          else selectedVariant = defaultCandidates[0];
        } else {
          selectedVariant = defaultCandidates[0];
        }
      } else {
        const variantsWithModel = product.variants?.filter(v =>
          v.model === selectedModel && v.is_active !== false
        ) || [];
        if (variantsWithModel.length === 0) {
          setVariantImages([]);
          return;
        }
        const candidates = variantsWithModel.filter(v =>
          (v.size === selectedSize || !selectedSize || !v.size)
        );
        if (selectedMetalType != null || selectedCarat != null) {
          const match = candidates.find(v =>
            (selectedMetalType == null || v.metal_type === selectedMetalType) &&
            (selectedCarat == null || (v.carat != null && v.carat === selectedCarat))
          );
          if (match) selectedVariant = match;
          else selectedVariant = candidates[0];
        } else {
          selectedVariant = candidates[0];
        }
      }
      if (!selectedVariant) {
        setVariantImages([]);
        return;
      }
      if (selectedVariant.use_product_images) {
        setVariantImages([]);
        return;
      }
      const images = await fetchVariantImages(selectedVariant.id);
      setVariantImages(images);
    };
    loadVariantImages();
  }, [product, selectedModel, selectedSize, selectedMetalType, selectedCarat]);

  const getAllImages = (): string[] => {
    if (!product) return [];
    
    // Determinar qué variante usar
    let selectedVariant: ProductVariant | undefined;
    
    if (!selectedModel) {
      // Si no hay modelo seleccionado, usar variante default
      const defaultCandidates = product.variants?.filter(v => 
        v.is_default === true &&
        v.is_active !== false &&
        (v.size === selectedSize || !selectedSize || !v.size)
      ) || [];
      
      if (selectedMetalType != null || selectedCarat != null) {
        const match = defaultCandidates.find(v =>
          (selectedMetalType == null || v.metal_type === selectedMetalType) &&
          (selectedCarat == null || (v.carat != null && v.carat === selectedCarat))
        );
        if (match) selectedVariant = match;
        else selectedVariant = defaultCandidates[0];
      } else {
        selectedVariant = defaultCandidates[0];
      }
    } else {
      const variantsWithModel = product.variants?.filter(v =>
        v.model === selectedModel && v.is_active !== false
      ) || [];
      if (variantsWithModel.length === 0) {
        const productImages: string[] = [];
        if (product.image) productImages.push(buildMediaUrl(product.image));
        if (product.images?.length) product.images.forEach(img => { if (img.url) productImages.push(buildMediaUrl(img.url)); });
        return productImages;
      }
      const candidates = variantsWithModel.filter(v =>
        (v.size === selectedSize || !selectedSize || !v.size)
      );
      if (selectedMetalType != null || selectedCarat != null) {
        const match = candidates.find(v =>
          (selectedMetalType == null || v.metal_type === selectedMetalType) &&
          (selectedCarat == null || (v.carat != null && v.carat === selectedCarat))
        );
        if (match) selectedVariant = match;
        else selectedVariant = candidates[0];
      } else {
        selectedVariant = candidates[0];
      }
    }
    if (!selectedVariant) {
      const productImages: string[] = [];
      if (product.image) productImages.push(buildMediaUrl(product.image));
      if (product.images?.length) product.images.forEach(img => { if (img.url) productImages.push(buildMediaUrl(img.url)); });
      return productImages;
    }
    if (selectedVariant.use_product_images) {
      const productImages: string[] = [];
      if (product.image) productImages.push(buildMediaUrl(product.image));
      if (product.images?.length) product.images.forEach(img => { if (img.url) productImages.push(buildMediaUrl(img.url)); });
      return productImages;
    }
    // Imagen principal primero: product.image o imagen de variante, luego el resto
    if (variantImages.length > 0) {
      const mainUrl = product.image ? buildMediaUrl(product.image) : (selectedVariant.image ? buildMediaUrl(selectedVariant.image) : variantImages[0]);
      const rest = variantImages.filter(url => url !== mainUrl);
      return [mainUrl, ...rest];
    }
    const productImages: string[] = [];
    if (product.image) productImages.push(buildMediaUrl(product.image));
    if (product.images?.length) product.images.forEach(img => { if (img.url) productImages.push(buildMediaUrl(img.url)); });
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
      // Obtener la variante default o la seleccionada
      const defaultVariant = product.variants?.find(v => v.is_default === true);
      
      const findSelectedVariant = () => {
        if (!selectedModel) {
          const defaultCandidates = product.variants?.filter(v =>
            v.is_default === true && v.is_active !== false &&
            (v.size === selectedSize || !selectedSize || !v.size)
          ) || [];
          if (selectedMetalType != null || selectedCarat != null) {
            const match = defaultCandidates.find(v =>
              (selectedMetalType == null || v.metal_type === selectedMetalType) &&
              (selectedCarat == null || (v.carat != null && v.carat === selectedCarat))
            );
            if (match) return match;
          }
          return defaultCandidates[0] || defaultVariant;
        }
        const candidates = product.variants?.filter(v =>
          v.model === selectedModel && v.is_active !== false &&
          (v.size === selectedSize || !selectedSize || !v.size)
        ) || [];
        if (selectedMetalType != null || selectedCarat != null) {
          const match = candidates.find(v =>
            (selectedMetalType == null || v.metal_type === selectedMetalType) &&
            (selectedCarat == null || (v.carat != null && v.carat === selectedCarat))
          );
          if (match) return match;
        }
        return candidates[0] || defaultVariant;
      };
      
      const selectedVariant = findSelectedVariant();

      // Si no hay variante disponible, no se puede agregar
      if (!selectedVariant || selectedVariant.is_active === false) {
        throw new Error('Esta variante no está disponible');
      }

      const stock = selectedVariant.stock ?? 0;
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

  const defaultVariant = product.variants?.find(v => v.is_default === true);
  const getSelectedVariant = (): ProductVariant | undefined => {
    const base = !selectedModel
      ? product.variants?.filter(v => v.is_default === true && v.is_active !== false && (v.size === selectedSize || !selectedSize || !v.size)) || []
      : product.variants?.filter(v => v.model === selectedModel && v.is_active !== false && (v.size === selectedSize || !selectedSize || !v.size)) || [];
    if (selectedMetalType != null || selectedCarat != null) {
      const match = base.find(v =>
        (selectedMetalType == null || v.metal_type === selectedMetalType) &&
        (selectedCarat == null || (v.carat != null && v.carat === selectedCarat))
      );
      return match || base[0];
    }
    return base[0];
  };
  const selectedVariant = getSelectedVariant();

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentOriginalPrice = selectedVariant?.original_price ?? product.original_price;
  const allImages = getAllImages();
  const currentImage = allImages[currentImageIndex] || buildMediaUrl(product.image);
  const currentImageIsVideo = isVideoUrl(currentImage);
  const discountPercentage = currentOriginalPrice && currentOriginalPrice > currentPrice 
    ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
    : 0;
  const stock = selectedVariant?.stock ?? 0;

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
      {/* Header con navegación - más compacto */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-1.5 text-gray-300 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </button>
            
            <div className="flex items-center space-x-3">
              {user && (
                <button
                  onClick={handleToggleFavorite}
                  disabled={checkingFavorite}
                  className={`p-1.5 rounded-full transition-colors ${
                    isWishlisted 
                      ? 'text-red-500 bg-red-500/10' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                  } ${checkingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal - más compacto */}
      <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Galería de imágenes - más compacta */}
          {/* Galería — thumbnails izquierda en desktop, abajo en móvil */}
          <div className="w-full flex flex-col md:flex-row md:items-start gap-3">
            {/* Imagen principal */}
            <div className="flex-1 order-1 md:order-2">
              <div
                className="group relative w-full h-[28rem] sm:h-[34rem] flex items-center justify-center rounded-2xl border border-gray-800 bg-black cursor-pointer overflow-hidden"
                onClick={handleImageClick}
              >
                {currentImageIsVideo ? (
                  <video
                    src={currentImage}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                  />
                ) : (
                  <>
                    <img
                      src={currentImage}
                      alt={product.name}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 rounded-full p-3">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* Thumbnails — fila horizontal en móvil, columna vertical en desktop */}
            {allImages.length > 1 && (
              <div className="flex md:hidden order-2 flex-row gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {allImages.map((img, idx) => {
                  const isVideo = isVideoUrl(img);
                  const isActive = idx === currentImageIndex;
                  return (
                    <button
                      key={`mob-${img}-${idx}`}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                        isActive
                          ? 'border-yellow-400 shadow-md shadow-yellow-400/30'
                          : 'border-gray-800'
                      }`}
                      style={{ background: '#111' }}
                    >
                      {isVideo ? (
                        <video src={img} className="object-contain w-full h-full" muted playsInline loop controls={false} />
                      ) : (
                        <img src={img} alt={`Vista ${idx + 1}`} className="object-contain w-full h-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Thumbnails — columna vertical en desktop */}
            {allImages.length > 1 && (
              <div className="hidden md:flex order-1 flex-col gap-2 w-16 flex-shrink-0 max-h-[34rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {allImages.map((img, idx) => {
                  const isVideo = isVideoUrl(img);
                  const isActive = idx === currentImageIndex;
                  return (
                    <button
                      key={`${img}-${idx}`}
                      onClick={() => setCurrentImageIndex(idx)}
                      onMouseEnter={() => setCurrentImageIndex(idx)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                        isActive
                          ? 'border-yellow-400 shadow-md shadow-yellow-400/30'
                          : 'border-gray-800 hover:border-gray-600'
                      }`}
                      style={{ background: '#111' }}
                    >
                      {isVideo ? (
                        <video src={img} className="object-contain w-full h-full" muted playsInline loop controls={false} />
                      ) : (
                        <img src={img} alt={`Vista ${idx + 1}`} className="object-contain w-full h-full" />
                      )}
                      {isActive && (
                        <div className="absolute inset-0 ring-1 ring-yellow-400/40 rounded-xl pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Información del producto - más compacta */}
          <div className="w-full flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-snug">{product.name}</h1>
            {/* Promedio de reseñas */}
            {reviews.length > 0 && (() => {
              const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
              return (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        size={14}
                        fill={i <= Math.round(avg) ? 'currentColor' : 'none'}
                        className={i <= Math.round(avg) ? 'text-yellow-400' : 'text-gray-700'}
                      />
                    ))}
                  </div>
                  <span className="text-yellow-400 text-sm font-semibold">{avg.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})</span>
                </div>
              );
            })()}
            <p className="text-base text-yellow-400 font-medium mb-1.5">{product.material}</p>
            <p className="text-gray-300 text-base mb-4 leading-relaxed">{product.description}</p>
            
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl sm:text-3xl font-bold text-yellow-300">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(currentPrice)}
              </span>

              {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-xl text-gray-500 line-through">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(currentOriginalPrice)}
                  </span>
                  <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                    {discountPercentage}% OFF
                  </span>
                </div>
              )}
            </div>

            {/* Widgets de beneficios — barra unificada */}
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl divide-y divide-gray-800 mb-4 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Envío gratis</p>
                  <p className="text-gray-500 text-[10px]">En compras desde $5,000 MXN</p>
                </div>
              </div>
              {product.has_warranty && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">Garantía incluida</p>
                    <p className="text-gray-500 text-[10px]">
                      {product.warranty_unit === 'lifetime'
                        ? 'De por vida'
                        : `${product.warranty_period} ${product.warranty_unit}`}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Devoluciones</p>
                  <p className="text-gray-500 text-[10px]">Hasta 30 días desde tu compra</p>
                </div>
              </div>
            </div>

            {/* Widget de entrega — timeline */}
            <div className="mb-4 bg-gray-900/40 border border-gray-800 rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3">Estimación de entrega</p>
              <div className="space-y-0">
                {[
                  { icon: ShoppingCart, title: 'Cómpralo ahora', detail: 'Confirma tu pedido hoy para asegurar disponibilidad', highlight: false },
                  { icon: Package, title: `Se envía ${shipDate}`, detail: 'Preparamos y despachamos tu joya antes de las 2 p.m.', highlight: false },
                  { icon: MapPin, title: `Llega entre ${range}`, detail: 'Ventana estimada con envío asegurado', highlight: true },
                ].map((step, index, arr) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${step.highlight ? 'bg-yellow-400/20 border border-yellow-400/40' : 'bg-gray-800 border border-gray-700'}`}>
                        <step.icon className={`w-3.5 h-3.5 ${step.highlight ? 'text-yellow-400' : 'text-gray-500'}`} />
                      </div>
                      {index < arr.length - 1 && (
                        <div className="w-px flex-1 border-l border-dashed border-gray-800 my-1" />
                      )}
                    </div>
                    <div className={`pb-3 ${index < arr.length - 1 ? '' : ''}`}>
                      <p className={`text-xs font-semibold ${step.highlight ? 'text-yellow-400' : 'text-white'}`}>{step.title}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Selectores de variantes — botones horizontales */}
            {product.variants && product.variants.length > 0 && (() => {
              const defaultVariantWithModel = product.variants.find((v: ProductVariant) =>
                v.is_default === true && v.model && v.is_active !== false
              );
              const availableModels = [...new Set(product.variants
                .filter((v: ProductVariant) => v.is_active !== false && v.model)
                .map((v: ProductVariant) => v.model)
                .filter(Boolean))];

              const defaultVariants = product.variants.filter((v: ProductVariant) =>
                v.is_default === true && v.is_active !== false
              );
              const hasDefaultSizes = defaultVariants.some((v: ProductVariant) => v.size);

              if (availableModels.length === 0 && !hasDefaultSizes) return null;

              // Variantes del modelo actualmente seleccionado
              const currentModel = selectedModel || '';
              const variantsForModel = product.variants.filter((v: ProductVariant) => {
                if (currentModel === '') return v.is_default === true && v.is_active !== false;
                return v.model === currentModel && v.is_active !== false;
              });

              const availableSizes = [...new Set(variantsForModel
                .map((v: ProductVariant) => v.size)
                .filter((s): s is string => s !== undefined && s !== null))];

              // Variantes filtradas por modelo + talla para el selector de kilataje
              const currentSize = selectedSize || '';
              const variantsForSelection = product.variants.filter((v: ProductVariant) => {
                if (currentModel === '') {
                  const ok = v.is_default === true && v.is_active !== false;
                  return currentSize ? ok && v.size === currentSize : ok;
                }
                const ok = v.model === currentModel && v.is_active !== false;
                return currentSize ? ok && v.size === currentSize : ok;
              });

              const uniqueMetalCarat = Array.from(
                new Map(
                  variantsForSelection
                    .filter((v: ProductVariant) => v.metal_type != null || (v.carat != null && v.carat > 0))
                    .map((v: ProductVariant) => [
                      `${v.metal_type ?? 'n'}_${v.carat ?? 0}`,
                      { metal_type: v.metal_type ?? null, carat: v.carat ?? null, variant: v }
                    ])
                ).values()
              );

              const getMetalLabel = (item: { metal_type: number | null; carat: number | null; variant: ProductVariant }) => {
                const name = (item.variant as any)?.metal_type_info?.name || (item.metal_type != null ? `Metal ${item.metal_type}` : '');
                const caratStr = item.carat != null && item.carat > 0 ? ` ${item.carat}k` : '';
                return (name + caratStr).trim() || 'Kilataje';
              };

              const selectedMetalKey = selectedMetalType != null || selectedCarat != null
                ? `${selectedMetalType ?? 'n'}_${selectedCarat ?? 0}`
                : '';

              return (
                <div className="w-full mb-4 space-y-4">
                  {/* Selector de Modelo */}
                  {(availableModels.length > 0 || defaultVariantWithModel) && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Modelo</p>
                      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        <button
                          onClick={() => {
                            setSelectedModel('');
                            const vars = product.variants
                              ?.filter((v: ProductVariant) => v.is_default === true && v.is_active !== false) || [];
                            const sizes = vars.map((v: ProductVariant) => v.size).filter(Boolean);
                            const firstSize = sizes[0] || '';
                            setSelectedSize(firstSize);
                            const sizeVars = firstSize ? vars.filter((v: ProductVariant) => v.size === firstSize) : vars;
                            const firstMetal = sizeVars.find((v: ProductVariant) => v.metal_type != null || (v.carat != null && v.carat > 0));
                            setSelectedMetalType(firstMetal?.metal_type ?? null);
                            setSelectedCarat(firstMetal?.carat ?? null);
                          }}
                          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap ${
                            selectedModel === ''
                              ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/20'
                              : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white'
                          }`}
                        >
                          {defaultVariantWithModel ? defaultVariantWithModel.model : 'Principal'}
                        </button>
                        {availableModels
                          .filter((m): m is string => m !== undefined && m !== null && m !== defaultVariantWithModel?.model)
                          .map((model: string) => (
                            <button
                              key={model}
                              onClick={() => {
                                setSelectedModel(model);
                                const vars = product.variants
                                  ?.filter((v: ProductVariant) => v.model === model && v.is_active !== false) || [];
                                const sizes = vars.map((v: ProductVariant) => v.size).filter(Boolean);
                                const firstSize = sizes[0] || '';
                                setSelectedSize(firstSize);
                                const sizeVars = firstSize ? vars.filter((v: ProductVariant) => v.size === firstSize) : vars;
                                const firstMetal = sizeVars.find((v: ProductVariant) => v.metal_type != null || (v.carat != null && v.carat > 0));
                                setSelectedMetalType(firstMetal?.metal_type ?? null);
                                setSelectedCarat(firstMetal?.carat ?? null);
                              }}
                              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap ${
                                selectedModel === model
                                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/20'
                                  : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white'
                              }`}
                            >
                              {model}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Selector de Talla */}
                  {availableSizes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                        Talla{selectedSize && <span className="text-yellow-400 ml-1.5 font-bold normal-case">{selectedSize}</span>}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {availableSizes.map((size: string) => {
                          const hasStock = variantsForModel.some((v: ProductVariant) => v.size === size && (v.stock ?? 0) > 0);
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              onClick={() => {
                                if (!hasStock) return;
                                setSelectedSize(size);
                                const variantForSize = variantsForModel.find((v: ProductVariant) => v.size === size);
                                if (variantForSize) {
                                  setSelectedMetalType(variantForSize.metal_type ?? null);
                                  setSelectedCarat(variantForSize.carat ?? null);
                                } else {
                                  setSelectedMetalType(null);
                                  setSelectedCarat(null);
                                }
                              }}
                              title={!hasStock ? 'Agotado' : undefined}
                              className={`relative flex-shrink-0 min-w-[2.5rem] h-10 px-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                                isSelected
                                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/20'
                                  : hasStock
                                    ? 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white'
                                    : 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'
                              }`}
                            >
                              {size}
                              {!hasStock && (
                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="block w-full border-t border-gray-600 absolute" style={{ transform: 'rotate(-20deg)' }} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selector de Kilataje */}
                  {uniqueMetalCarat.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Kilataje</p>
                      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {uniqueMetalCarat.map((item) => {
                          const key = `${item.metal_type ?? 'n'}_${item.carat ?? 0}`;
                          const isSelected = selectedMetalKey === key;
                          const hasStock = (item.variant.stock ?? 0) > 0;
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                if (!hasStock) return;
                                setSelectedMetalType(item.metal_type);
                                setSelectedCarat(item.carat);
                              }}
                              title={!hasStock ? 'Agotado' : undefined}
                              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap ${
                                isSelected
                                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/20'
                                  : hasStock
                                    ? 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500 hover:text-white'
                                    : 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed line-through'
                              }`}
                            >
                              {getMetalLabel(item)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* Cantidad + CTA */}
            <div className="space-y-3">
              {/* Fila: selector cantidad + indicador de stock */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-full border border-gray-700 hover:border-gray-500 flex items-center justify-center text-white text-lg font-bold transition-colors"
                  >
                    −
                  </button>
                  <span className="text-xl font-bold text-white w-10 text-center tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-full border border-gray-700 hover:border-gray-500 flex items-center justify-center text-white text-lg font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
                {/* Indicador de stock */}
                {stock > 0 ? (
                  stock < 5 ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Quedan {stock} unidades
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Disponible
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Agotado
                  </span>
                )}
              </div>

              {/* Botón principal */}
              <button
                id="add-to-cart-button"
                onClick={handleAddToCart}
                disabled={stock <= 0}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-4 px-4 rounded-xl font-bold text-base tracking-wide hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <ShoppingCart className="w-4 h-4" />
                {stock > 0 ? 'Añadir al carrito' : 'Agotado'}
              </button>

              {/* Sellos de confianza */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <span className="flex items-center gap-1 text-gray-600 text-[10px]">
                  <Lock className="w-3 h-3" /> Pago seguro
                </span>
                <span className="flex items-center gap-1 text-gray-600 text-[10px]">
                  <CreditCard className="w-3 h-3" /> Múltiples métodos
                </span>
                <span className="flex items-center gap-1 text-gray-600 text-[10px]">
                  <Shield className="w-3 h-3" /> Compra protegida
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">Más de <span className="text-yellow-400">{product?.category?.name || 'esta categoría'}</span></h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  className="group flex-shrink-0 w-52 bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-yellow-400/50 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/producto/${relatedProduct.id}`)}
                >
                  {/* Imagen con overlay */}
                  <div className="relative h-52 bg-black flex items-center justify-center p-3 overflow-hidden">
                    {isVideoUrl(relatedProduct.image) ? (
                      <video
                        src={buildMediaUrl(relatedProduct.image)}
                        className="max-h-full max-w-full object-contain"
                        muted playsInline loop autoPlay
                      />
                    ) : (
                      <img
                        src={buildMediaUrl(relatedProduct.image)}
                        alt={relatedProduct.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    {/* Badge Nuevo */}
                    {relatedProduct.is_new && (
                      <span className="absolute top-2 left-2 bg-yellow-400 text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Nuevo
                      </span>
                    )}
                    {/* Overlay hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-full">
                        Ver producto
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <h4 className="text-white font-medium text-sm line-clamp-2 leading-snug mb-2">{relatedProduct.name}</h4>
                    <div className="flex items-end justify-between gap-1">
                      <span className="text-yellow-400 font-bold text-sm">
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(relatedProduct.price)}
                      </span>
                      {relatedProduct.original_price && relatedProduct.original_price > relatedProduct.price && (
                        <span className="text-gray-600 text-xs line-through">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(relatedProduct.original_price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de reseñas */}
        <div className="mt-16 max-w-4xl mx-auto">
          {/* Encabezado */}
          <div className="flex items-center gap-3 mb-8">
            <h3 className="text-2xl font-bold text-white">Reseñas</h3>
            {reviews.length > 0 && (
              <span className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold px-2.5 py-1 rounded-full">
                {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
              </span>
            )}
          </div>

          {reviews.length > 0 ? (() => {
            const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
            const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
              star,
              count: reviews.filter(r => r.rating === star).length,
            }));
            return (
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Panel resumen */}
                <div className="lg:w-56 flex-shrink-0">
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center">
                    <p className="text-6xl font-black text-white leading-none mb-1">
                      {avgRating.toFixed(1)}
                    </p>
                    <div className="flex justify-center gap-0.5 my-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          size={16}
                          fill={i <= Math.round(avgRating) ? 'currentColor' : 'none'}
                          className="text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs mb-5">{reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'}</p>
                    <div className="space-y-2">
                      {ratingCounts.map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-3 text-right">{star}</span>
                          <Star size={10} fill="currentColor" className="text-yellow-400 flex-shrink-0" />
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-500"
                              style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-gray-600 text-xs w-4 text-left">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lista de reseñas */}
                <div className="flex-1 space-y-4 max-h-[32rem] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {reviews.map(review => {
                    const initials = review.user_name
                      .split(' ')
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    return (
                      <div
                        key={review.id}
                        className="group bg-gray-900/50 hover:bg-gray-900/80 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-black font-bold text-xs">{initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-white font-semibold text-sm">{review.user_name}</span>
                              <span className="text-gray-600 text-xs">
                                {review.created_at
                                  ? new Date(review.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—'}
                              </span>
                            </div>
                            {/* Estrellas */}
                            <div className="flex gap-0.5 mt-1 mb-2">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                  key={i}
                                  size={13}
                                  fill={i <= review.rating ? 'currentColor' : 'none'}
                                  className={i <= review.rating ? 'text-yellow-400' : 'text-gray-700'}
                                />
                              ))}
                            </div>
                            {review.comment && (
                              <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                <Star size={24} className="text-gray-700" />
              </div>
              <p className="text-gray-400 font-medium mb-1">Sin reseñas todavía</p>
              <p className="text-gray-600 text-sm">Sé el primero en compartir tu experiencia.</p>
            </div>
          )}
        </div>

        {/* Formulario de reseña */}
        {reviewPermission === 'can-review' && (
          <div className="mt-10">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Header del form */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-800">
                <h4 className="text-lg font-bold text-white">Tu opinión importa</h4>
                <p className="text-gray-500 text-xs mt-0.5">Comparte tu experiencia con este producto</p>
              </div>
              <form onSubmit={handleReviewSubmit} className="p-6 space-y-5">
                {/* Selector de estrellas */}
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
                    Calificación
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="group/star focus:outline-none transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          size={28}
                          fill={star <= reviewForm.rating ? 'currentColor' : 'none'}
                          className={`transition-colors duration-100 ${
                            star <= reviewForm.rating
                              ? 'text-yellow-400'
                              : 'text-gray-700 group-hover/star:text-gray-500'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-gray-500 text-sm">
                      {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][reviewForm.rating]}
                    </span>
                  </div>
                </div>
                {/* Comentario */}
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
                    Comentario
                  </label>
                  <textarea
                    className="w-full bg-gray-800/60 text-white rounded-xl p-3.5 border border-gray-700 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 text-sm resize-none outline-none transition-colors placeholder-gray-600"
                    value={reviewForm.comment}
                    onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={2}
                    required
                    minLength={10}
                    placeholder="Cuéntanos qué te pareció el producto..."
                  />
                  <p className="text-gray-700 text-xs mt-1 text-right">{reviewForm.comment.length} / mín. 10</p>
                </div>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-xl font-bold text-sm tracking-wide hover:shadow-lg hover:shadow-yellow-400/20 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {reviewSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : 'Publicar reseña'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modal de imágenes - ajustado */}
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
            className="absolute top-3 right-3 z-10 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModalPrev();
                }}
                disabled={modalImageIndex === 0}
                className="absolute left-3 z-10 text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModalNext();
                }}
                disabled={modalImageIndex === allImages.length - 1}
                className="absolute right-3 z-10 text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <div 
            className="relative w-full h-full flex items-center justify-center p-3"
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
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalImageIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === modalImageIndex ? 'bg-yellow-400 w-6' : 'bg-gray-600'
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