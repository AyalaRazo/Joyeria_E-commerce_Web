import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Order, ProductVariant, UserRole } from '../types';
import { Search, Package, RefreshCw, X, Save, Edit, Plus, Trash2, RotateCcw, Eye, AlertCircle } from 'lucide-react';
import { useReturns } from '../hooks/useReturns';
import { useUserManagement } from '../hooks/useUserManagement';
import { useAuth } from '../hooks/useAuth';

const AdminPanel: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { returns, processReturn } = useReturns();
  const { users, assignRole } = useUserManagement();
  
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'returns' | 'users'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string | number, ProductVariant[]>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState({
    products: true,
    orders: true,
    returns: false,
    users: false
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
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<{
    show: boolean;
    orderId: number | null;
  }>({ show: false, orderId: null });
  const [returnReason, setReturnReason] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    original_price: 0,
    image: '',
    description: '',
    material: '',
    category_id: 1,
    stock: 0,
    in_stock: true,
    is_new: false,
    is_featured: false
  });

  // Fetch data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'products':
      fetchProducts();
        break;
      case 'orders':
      fetchOrders();
        break;
      case 'returns':
        setLoading(prev => ({ ...prev, returns: true }));
        setTimeout(() => setLoading(prev => ({ ...prev, returns: false })), 500);
        break;
      case 'users':
        setLoading(prev => ({ ...prev, users: true }));
        setTimeout(() => setLoading(prev => ({ ...prev, users: false })), 500);
        break;
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
        const { error } = await supabase
          .from('product_variants')
          .update({ stock: editingStock.value })
          .eq('id', editingStock.variantId);

        if (error) throw error;

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
        const { error } = await supabase
          .from('products')
          .update({ stock: editingStock.value })
          .eq('id', editingStock.productId);

        if (error) throw error;

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

  const handleAddProduct = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .insert([newProduct]);

      if (error) throw error;

      setNewProduct({
        name: '',
        price: 0,
        original_price: 0,
        image: '',
        description: '',
        material: '',
        category_id: 1,
        stock: 0,
        in_stock: true,
        is_new: false,
        is_featured: false
      });
      setShowAddProduct(false);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleProcessReturn = async () => {
    if (!showReturnModal.orderId || !user) return;

    try {
      const success = await processReturn(showReturnModal.orderId, returnReason, user.id);
      if (success) {
        setShowReturnModal({ show: false, orderId: null });
        setReturnReason('');
        fetchOrders();
      }
    } catch (error) {
      console.error('Error processing return:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await assignRole(userId, newRole);
    } catch (error) {
      console.error('Error changing role:', error);
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

  const filteredReturns = returns.filter(ret =>
    ret.id.toString().includes(searchTerm.toLowerCase()) ||
    ret.order_id.toString().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(userItem =>
    userItem.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userItem.name && userItem.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              Usuario: {user?.name || user?.email}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              user?.role === 'admin' ? 'bg-red-500/20 text-red-400' :
              user?.role === 'worker' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {user?.role?.toUpperCase() || 'CUSTOMER'}
            </span>
          </div>
        </div>
        
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
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'returns' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('returns')}
          >
            Devoluciones
          </button>
          {isAdmin() && (
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'users' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setActiveTab('users')}
            >
              Usuarios
            </button>
          )}
        </div>
        
        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
              placeholder={`Buscar ${activeTab === 'products' ? 'productos' : activeTab === 'orders' ? 'órdenes' : activeTab === 'returns' ? 'devoluciones' : 'usuarios'}...`}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          </div>
          {activeTab === 'products' && isAdmin() && (
            <button
              onClick={() => setShowAddProduct(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Producto</span>
            </button>
          )}
        </div>
        
        {/* Content */}
        {activeTab === 'products' && (
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
                          <div className="flex items-center space-x-2">
                          <button
                            className="text-blue-400 hover:text-blue-300"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {isAdmin() && (
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Eliminar producto"
                              >
                                <Trash2 className="h-4 w-4" />
                          </button>
                            )}
                          </div>
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
        )}

        {activeTab === 'orders' && (
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
                              : order.status === 'devuelto'
                              ? 'bg-orange-500/20 text-orange-400'
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
                        <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-400 hover:text-blue-300"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {order.status !== 'devuelto' && order.status !== 'cancelado' && (
                            <button
                              onClick={() => setShowReturnModal({ show: true, orderId: order.id })}
                              className="text-orange-400 hover:text-orange-300"
                              title="Procesar devolución"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.returns ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID Devolución</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Orden ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Razón</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Procesado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredReturns.map((returnItem) => (
                    <tr key={returnItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">#{returnItem.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">#{returnItem.order_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(returnItem.returned_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-300">{returnItem.reason || 'Sin razón especificada'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-300">{returnItem.admin?.email || 'Sistema'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'users' && isAdmin() && (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading.users ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-yellow-400" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Rol Actual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha Registro</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{userItem.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300">{userItem.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userItem.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                          userItem.role === 'worker' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {userItem.role?.toUpperCase() || 'CUSTOMER'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300">
                          {userItem.created_at ? new Date(userItem.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={userItem.role || 'customer'}
                          onChange={(e) => handleRoleChange(userItem.id, e.target.value as UserRole)}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        >
                          <option value="customer">Customer</option>
                          <option value="worker">Worker</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal para agregar producto */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Agregar Nuevo Producto</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nombre del producto"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
              <input
                type="number"
                placeholder="Precio"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="URL de imagen"
                value={newProduct.image}
                onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
              <textarea
                placeholder="Descripción"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                rows={3}
              />
              <input
                type="number"
                placeholder="Stock"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para procesar devolución */}
      {showReturnModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              <h3 className="text-lg font-bold">Procesar Devolución</h3>
            </div>
            <p className="text-gray-300 mb-4">
              ¿Estás seguro de que quieres procesar la devolución de la orden #{showReturnModal.orderId}?
              Esto restaurará el stock de los productos.
            </p>
            <textarea
              placeholder="Razón de la devolución (opcional)"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-4"
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowReturnModal({ show: false, orderId: null })}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessReturn}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded"
              >
                Procesar Devolución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;