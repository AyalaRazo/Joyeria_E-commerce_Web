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
          <div className="w-full flex flex-col items-center md:flex-row md:items-start gap-3">
            {allImages.length > 1 && (
              <div className="md:min-w-[4rem] flex md:flex-col gap-1.5 md:mr-3 mb-1.5 md:mb-0 overflow-x-auto md:overflow-y-auto md:max-h-64 max-w-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                {allImages.map((img, idx) => {
                  const isVideo = isVideoUrl(img);
                  return (
                    <button
                      key={`${img}-${idx}`}
                      onClick={() => setCurrentImageIndex(idx)}
                      onMouseEnter={() => setCurrentImageIndex(idx)}
                      className={`border rounded-md overflow-hidden w-14 h-14 flex-shrink-0 flex items-center justify-center transition-all duration-150 ${
                        idx === currentImageIndex
                          ? 'border-yellow-400' 
                          : 'border-gray-700'
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
            <div 
              className="w-full max-w-sm h-[24rem] flex items-center justify-center rounded-xl shadow-lg border border-gray-800 bg-black mb-4 p-3 cursor-pointer"
              onClick={handleImageClick}
            >
              {currentImageIsVideo ? (
                <video
                  src={currentImage}
                  className="w-full h-full object-contain rounded-lg"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              )}
            </div>
          </div>
          
          {/* Información del producto - más compacta */}
          <div className="w-full flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-snug">{product.name}</h1>
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

            {/* Widgets de optimización - más compactos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 border border-green-500/20 rounded-md p-3 text-center">
                <div className="text-green-400 text-xl mb-1">🚚</div>
                <h4 className="text-green-300 font-medium text-xs mb-0.5">Envío Gratis</h4>
                <p className="text-green-200 text-[10px]">Desde $5,000</p>
              </div>

              {product.has_warranty && (
                <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/20 rounded-md p-3 text-center">
                  <div className="text-blue-400 text-xl mb-1">🛡️</div>
                  <h4 className="text-blue-300 font-medium text-xs mb-0.5">Garantía</h4>
                  <p className="text-blue-200 text-[10px]">
                    {product.warranty_unit === 'lifetime'
                      ? 'De por vida'
                      : `${product.warranty_period} ${product.warranty_unit}`}
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-500/20 rounded-md p-3 text-center">
                <div className="text-purple-400 text-xl mb-1">🔙</div>
                <h4 className="text-purple-300 font-medium text-xs mb-0.5">Devoluciones</h4>
                <p className="text-purple-200 text-[10px]">Hasta 1 mes</p>
              </div>
            </div>

            {/* Widget de entrega - más compacto */}
            <div className="mb-4 bg-gray-800/30 border border-gray-700 rounded-md p-3">
              <div className="space-y-2">
                {shippingTimeline.map((step, index) => (
                  <div key={step.title} className="flex items-start space-x-2">
                    <div className="h-6 w-6 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold text-xs border border-yellow-500/40">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{step.title}</p>
                      <p className="text-gray-300 text-[10px]">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Selector de variantes - más compacto */}
            {product.variants && product.variants.length > 0 && (() => {
              // Obtener modelos únicos (incluyendo default si tiene nombre)
              const defaultVariantWithModel = product.variants.find((v: ProductVariant) => 
                v.is_default === true && v.model && v.is_active !== false
              );
              const availableModels = [...new Set(product.variants
                .filter((v: ProductVariant) => v.is_active !== false && v.model)
                .map((v: ProductVariant) => v.model)
                .filter(Boolean))];
              
              // Determinar si hay variantes default con tallas
              const defaultVariants = product.variants.filter((v: ProductVariant) => 
                v.is_default === true && v.is_active !== false
              );
              const hasDefaultSizes = defaultVariants.some((v: ProductVariant) => v.size);
              
              // Si no hay modelos y no hay tallas en default, no mostrar selectores
              if (availableModels.length === 0 && !hasDefaultSizes) return null;
              
              return (
                <div className="w-full mb-4 space-y-3">
                  {/* Selector de Modelo */}
                  {(availableModels.length > 0 || defaultVariantWithModel) && (
                    <div>
                      <label className="block text-gray-300 text-xs font-medium mb-1.5">Modelo:</label>
                      <select
                        className="w-full bg-gray-900 text-white rounded-md p-2 border border-gray-700 focus:ring-1 focus:ring-yellow-400 text-sm font-medium shadow-sm transition-all duration-150"
                        value={selectedModel}
                        onChange={e => {
                          setSelectedModel(e.target.value);
                          // Resetear talla y metal_type al cambiar modelo
                          const sizes = product.variants
                            ?.filter((v: ProductVariant) => {
                              if (e.target.value === '') {
                                return v.is_default === true && v.is_active !== false;
                              }
                              return v.model === e.target.value && v.is_active !== false;
                            })
                            .map((v: ProductVariant) => v.size)
                            .filter(Boolean) || [];
                          setSelectedSize(sizes[0] || '');
                          
                          setSelectedMetalType(null);
                          setSelectedCarat(null);
                        }}
                      >
                        <option value="">
                          {defaultVariantWithModel ? defaultVariantWithModel.model : 'Principal'}
                        </option>
                        {availableModels
                          .filter((m): m is string => m !== undefined && m !== null && m !== defaultVariantWithModel?.model)
                          .map((model: string) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Selector de Talla - mostrar si hay tallas para el modelo seleccionado o default */}
                  {(() => {
                    const currentModel = selectedModel || '';
                    const variantsForModel = product.variants.filter((v: ProductVariant) => {
                      if (currentModel === '') {
                        return v.is_default === true && v.is_active !== false;
                      }
                      return v.model === currentModel && v.is_active !== false;
                    });
                    
                    const availableSizes = [...new Set(variantsForModel
                      .map((v: ProductVariant) => v.size)
                      .filter((s): s is string => s !== undefined && s !== null))];
                    
                    if (availableSizes.length === 0) return null;
                    
                    return (
                      <div>
                        <label className="block text-gray-300 text-xs font-medium mb-1.5">Talla:</label>
                        <select
                          className="w-full bg-gray-900 text-white rounded-md p-2 border border-gray-700 focus:ring-1 focus:ring-yellow-400 text-sm font-medium shadow-sm transition-all duration-150"
                          value={selectedSize}
                          onChange={e => {
                            setSelectedSize(e.target.value);
                            const variantForSize = variantsForModel.find((v: ProductVariant) => v.size === e.target.value);
                            if (variantForSize) {
                              setSelectedMetalType(variantForSize.metal_type ?? null);
                              setSelectedCarat(variantForSize.carat ?? null);
                            } else {
                              setSelectedMetalType(null);
                              setSelectedCarat(null);
                            }
                          }}
                        >
                          {availableSizes.map((size: string) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                  
                  {/* Selector Kilataje: metal_type + carat (mismo modelo y talla, distintos quilates) */}
                  {(() => {
                    const currentModel = selectedModel || '';
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
                    if (uniqueMetalCarat.length === 0) return null;
                    const getOptionLabel = (item: { metal_type: number | null; carat: number | null; variant: ProductVariant }) => {
                      const name = (item.variant as any)?.metal_type_info?.name || (item.metal_type != null ? `Metal ${item.metal_type}` : '');
                      const caratStr = item.carat != null && item.carat > 0 ? ` ${item.carat}k` : '';
                      return (name + caratStr).trim() || 'Kilataje';
                    };
                    return (
                      <div>
                        <label className="block text-gray-300 text-xs font-medium mb-1.5">Kilataje:</label>
                        <select
                          className="w-full bg-gray-900 text-white rounded-md p-2 border border-gray-700 focus:ring-1 focus:ring-yellow-400 text-sm font-medium shadow-sm transition-all duration-150"
                          value={selectedMetalType != null || selectedCarat != null ? `${selectedMetalType ?? 'n'}_${selectedCarat ?? 0}` : ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) {
                              setSelectedMetalType(null);
                              setSelectedCarat(null);
                              return;
                            }
                            const item = uniqueMetalCarat.find(
                              x => `${x.metal_type ?? 'n'}_${x.carat ?? 0}` === val
                            );
                            if (item) {
                              setSelectedMetalType(item.metal_type);
                              setSelectedCarat(item.carat);
                            }
                          }}
                        >
                          {uniqueMetalCarat.map((item) => {
                            const key = `${item.metal_type ?? 'n'}_${item.carat ?? 0}`;
                            return (
                              <option key={key} value={key}>
                                {getOptionLabel(item)}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
            
            {/* Cantidad y botón agregar - más compacto */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">Cantidad</label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center text-white text-lg font-bold"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold text-white w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center text-white text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                id="add-to-cart-button"
                onClick={handleAddToCart}
                disabled={stock <= 0}
                className={`w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-lg font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-yellow-400/20 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                {stock > 0 ? 'AÑADIR AL CARRITO' : 'AGOTADO'}
              </button>
            </div>
            
            {/* Estado de stock - más compacto */}
            <div className="flex items-center gap-1.5 mt-4">
              <div className={`w-1.5 h-1.5 rounded-full ${stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock > 0 ? 'Disponible' : 'Agotado'}
              </span>
            </div>
          </div>
        </div>

        {/* Sección de productos relacionados - más compacta */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-white mb-4">Más de {product?.category?.name || 'esta categoría'}</h3>
            
            <div className="relative">
              <div className="overflow-hidden">
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                  {relatedProducts.map((relatedProduct) => (
                    <div 
                      key={relatedProduct.id} 
                      className="flex-shrink-0 w-56 bg-gray-900 rounded-lg overflow-hidden shadow border border-gray-800 hover:border-yellow-400 transition-colors cursor-pointer"
                      onClick={() => navigate(`/producto/${relatedProduct.id}`)}
                    >
                      <div className="h-40 bg-black flex items-center justify-center p-3">
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
                      <div className="p-3">
                        <h4 className="text-white font-medium text-sm truncate">{relatedProduct.name}</h4>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-yellow-400 font-bold text-base">
                            {new Intl.NumberFormat('es-MX', { 
                              style: 'currency', 
                              currency: 'MXN' 
                            }).format(relatedProduct.price)}
                          </span>
                          {relatedProduct.original_price && (
                            <span className="text-gray-500 text-xs line-through">
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

        {/* Sección de reseñas - más compacta */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-white mb-4">Reseñas de clientes</h3>
          
          {reviews.length > 0 ? (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
              {reviews.map(review => (
                <div key={review.id} className="bg-gray-900 rounded-lg p-4 shadow border border-gray-800">
                  <div className="flex items-center mb-1.5">
                    <span className="font-medium text-yellow-400 mr-2 text-sm">{review.user_name}</span>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={14} 
                          fill={i < review.rating ? 'currentColor' : 'none'} 
                          className="mr-0.5" 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm mb-1.5">{review.comment}</p>
                  <span className="text-xs text-gray-500">
                    {review.created_at ? new Date(review.created_at).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Aún no hay reseñas para este producto.</p>
          )}
        </div>

        {/* Formulario de reseña - más compacto */}
        {reviewPermission === 'can-review' && (
          <div className="mt-8 bg-gray-900 rounded-lg p-4 shadow border border-gray-800 max-w-lg mx-auto">
            <h4 className="text-lg font-bold text-white mb-3">Deja tu reseña</h4>
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Calificación:</label>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, rating: star})}
                      className="mr-1.5 focus:outline-none"
                    >
                      <Star 
                        size={20} 
                        fill={star <= reviewForm.rating ? 'currentColor' : 'none'} 
                        className={`${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-400'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-medium">Comentario:</label>
                <textarea
                  className="w-full bg-gray-800 text-white rounded p-2 border border-gray-700 text-sm"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                  rows={2}
                  required
                  minLength={10}
                  placeholder="Escribe tu experiencia (mínimo 10 caracteres)"
                />
              </div>
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-2.5 px-4 rounded-lg font-bold text-base tracking-wide hover:shadow hover:shadow-yellow-400/20 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {reviewSubmitting ? 'Enviando...' : 'Enviar reseña'}
              </button>
            </form>
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