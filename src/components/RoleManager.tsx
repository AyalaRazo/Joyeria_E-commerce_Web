import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { assignRoleToUser, syncUserRoles } from '../utils/assignUserRoles';
import { getRoleFromEmail } from '../utils/adminConfig';

const RoleManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Obtener usuarios de la tabla user_roles
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          user:auth.users(id, email, user_metadata)
        `);
      
      if (error) throw error;
      
      setUsers(userRoles || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setMessage('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRoles = async () => {
    setLoading(true);
    setMessage('Sincronizando roles...');
    
    try {
      await syncUserRoles();
      setMessage('✅ Roles sincronizados correctamente');
      await loadUsers(); // Recargar la lista
    } catch (error) {
      console.error('Error sincronizando roles:', error);
      setMessage('❌ Error sincronizando roles');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, email: string, newRole: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      setMessage(`✅ Rol ${newRole} asignado correctamente`);
      await loadUsers(); // Recargar la lista
    } catch (error) {
      console.error('Error asignando rol:', error);
      setMessage('❌ Error asignando rol');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Gestión de Roles</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.includes('✅') ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'
        }`}>
          {message}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={handleSyncRoles}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg"
        >
          {loading ? 'Sincronizando...' : 'Sincronizar Roles'}
        </button>
      </div>

      {loading && users.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto"></div>
          <p className="text-gray-400 mt-2">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((userRole) => (
            <div key={userRole.user_id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    {userRole.user?.email || 'Email no disponible'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    ID: {userRole.user_id}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    userRole.role === 'admin' ? 'bg-red-900/20 text-red-300' :
                    userRole.role === 'worker' ? 'bg-yellow-900/20 text-yellow-300' :
                    'bg-gray-900/20 text-gray-300'
                  }`}>
                    {userRole.role}
                  </span>
                  
                  <select
                    value={userRole.role}
                    onChange={(e) => handleAssignRole(userRole.user_id, userRole.user?.email || '', e.target.value)}
                    className="bg-gray-600 text-white rounded px-3 py-1"
                    disabled={loading}
                  >
                    <option value="customer">Customer</option>
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay usuarios con roles asignados</p>
          <button
            onClick={handleSyncRoles}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Sincronizar Roles
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleManager;






















