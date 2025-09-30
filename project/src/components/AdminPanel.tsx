import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Order, ProductVariant } from '../types';
import { Search, Package, RefreshCw, Check, X, Save, Edit } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string | number, ProductVariant[]>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState({
    products: true,
    orders: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStock, setEditingStock] = useState<{
    productId: string | number;
    variantId: string | number | null;
    value: number;
  } | null>(null);
  const [editingTracking, setEditingTracking] = useState<{
    orderId: string | number;
    value: string;
  } | null>(null);

  // Fetch products and variants
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchProducts = async () => {
    setLoading(prev => ({ ...prev, products: true }));
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*');

      if (variantsError) throw variantsError;

      const variantsMap = variantsData?.reduce((acc, variant) => {
        const productId = variant.product_id;
        if (!acc[productId]) {
          acc[productId] = [];
        }
        acc[productId].push(variant);
        return acc;
      }, {} as Record<string | number, ProductVariant[]>);

      setProducts(productsData || []);
      setVariants(variantsMap || {});
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const fetchOrders = async () => {
    setLoading(prev => ({ ...prev, orders: true }));
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*))')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  };

  const handleStockUpdate = async () => {
    if (!editingStock) return;

    try {
      if (editingStock.variantId) {
        // Update variant stock
        const { error } = await supabase
          .from('product_variants')
          .update({ stock: editingStock.value })
          .eq('id', editingStock.variantId);

        if (error) throw error;

        // Update variants state
        setVariants(prev => {
          const updatedVariants = { ...prev };
          const variantIndex = updatedVariants[editingStock.productId]?.findIndex(
            v => v.id === editingStock.variantId
          );
          if (variantIndex !== undefined && variantIndex !== -1) {
            updatedVariants[editingStock.productId][variantIndex].stock = editingStock.value;
          }
          return updatedVariants;
        });
      } else {
        // Update product stock
        const { error } = await supabase
          .from('products')
          .update({ stock: editingStock.value })
          .eq('id', editingStock.productId);

        if (error) throw error;

        // Update products state
        setProducts(prev =>
          prev.map(p =>
            p.id === editingStock.productId ? { ...p, stock: editingStock.value } : p
          )
        );
      }
    } catch (error) {
      console.error('Error updating stock:', error);
    } finally {
      setEditingStock(null);
    }
  };

  const handleTrackingUpdate = async () => {
    if (!editingTracking) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_code: editingTracking.value })
        .eq('id', editingTracking.orderId);

      if (error) throw error;

      // Update orders state
      setOrders(prev =>
        prev.map(o =>
          o.id === editingTracking.orderId
            ? { ...o, tracking_code: editingTracking.value }
            : o
        )
      );
    } catch (error) {
      console.error('Error updating tracking code:', error);
    } finally {
      setEditingTracking(null);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.toString().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(order =>
    order.id.toString().includes(searchTerm.toLowerCase()) ||
    (order.tracking_code && order.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'products' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('products')}
          >
            Productos
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'orders' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('orders')}
          >
            Órdenes
          </button>
        </div>
        
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Buscar ${activeTab === 'products' ? 'productos' : 'órdenes'}...`}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Content */}
        {activeTab === 'products' ? (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.products ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Variantes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredProducts.map((product) => (
                    <React.Fragment key={product.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                            <div className="ml-4">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-gray-400 text-sm">ID: {product.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingStock?.productId === product.id && !editingStock.variantId ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={editingStock.value}
                                onChange={(e) =>
                                  setEditingStock({
                                    ...editingStock,
                                    value: parseInt(e.target.value) || 0
                                  })
                                }
                                className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1"
                              />
                              <button
                                onClick={handleStockUpdate}
                                className="text-green-400 hover:text-green-300"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingStock(null)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span>{product.stock}</span>
                              <button
                                onClick={() =>
                                  setEditingStock({
                                    productId: product.id,
                                    variantId: null,
                                    value: product.stock || 0
                                  })
                                }
                                className="ml-2 text-yellow-400 hover:text-yellow-300"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {variants[product.id]?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              // Implementar lógica para ver/editar variantes si es necesario
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Ver variantes
                          </button>
                        </td>
                      </tr>
                      {/* Variants rows */}
                      {variants[product.id]?.map((variant) => (
                        <tr key={variant.id} className="bg-gray-750">
                          <td className="px-6 py-4 whitespace-nowrap pl-16">
                            <div className="flex items-center">
                              {variant.image && (
                                <img
                                  src={variant.image}
                                  alt={variant.name}
                                  className="h-10 w-10 rounded-md object-cover mr-4"
                                />
                              )}
                              <div>
                                <div className="font-medium">{variant.name}</div>
                                <div className="text-gray-400 text-sm">
                                  {variant.size && `Talla: ${variant.size}`}
                                  {variant.model && ` | Modelo: ${variant.model}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingStock?.variantId === variant.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  value={editingStock.value}
                                  onChange={(e) =>
                                    setEditingStock({
                                      ...editingStock,
                                      value: parseInt(e.target.value) || 0
                                    })
                                  }
                                  className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1"
                                />
                                <button
                                  onClick={handleStockUpdate}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingStock(null)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span>{variant.stock}</span>
                                <button
                                  onClick={() =>
                                    setEditingStock({
                                      productId: product.id,
                                      variantId: variant.id,
                                      value: variant.stock || 0
                                    })
                                  }
                                  className="ml-2 text-yellow-400 hover:text-yellow-300"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-gray-400">
                            Variante
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.orders ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Orden ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Código de Rastreo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">#{order.id}</div>
                        <div className="text-gray-400 text-sm">
                          {order.order_items?.length || 0} producto(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'entregado'
                              ? 'bg-green-500/20 text-green-400'
                              : order.status === 'cancelado'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTracking?.orderId === order.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingTracking.value}
                              onChange={(e) =>
                                setEditingTracking({
                                  ...editingTracking,
                                  value: e.target.value
                                })
                              }
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 flex-1"
                              placeholder="Código de rastreo"
                            />
                            <button
                              onClick={handleTrackingUpdate}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingTracking(null)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            {order.tracking_code ? (
                              <>
                                <Package className="h-4 w-4 mr-2 text-yellow-400" />
                                <span>{order.tracking_code}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">Sin código</span>
                            )}
                            <button
                              onClick={() =>
                                setEditingTracking({
                                  orderId: order.id,
                                  value: order.tracking_code || ''
                                })
                              }
                              className="ml-2 text-yellow-400 hover:text-yellow-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            // Implementar lógica para ver detalles del pedido
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;