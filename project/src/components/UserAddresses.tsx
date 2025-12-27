import React, { useEffect, useMemo, useState } from 'react';
import { Plus, MapPin, Pencil, Trash2, Star } from 'lucide-react';
import { useAddresses } from '../hooks/useAddresses';
import type { UserAddress } from '../types';

const emptyAddress: Omit<UserAddress, 'id' | 'user_id'> = {
  label: 'Casa',
  name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'MX',
  is_default: false,
};

const UserAddresses: React.FC = () => {
  const { addresses, loading, error, create, update, remove, setDefault } = useAddresses();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<Omit<UserAddress, 'id' | 'user_id'>>({ ...emptyAddress });

  const sorted = useMemo(() => {
    return [...addresses].sort((a, b) => Number(b.is_default) - Number(a.is_default));
  }, [addresses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await update(editing.id, form);
    } else {
      await create(form);
    }
    setFormOpen(false);
    setEditing(null);
    setForm({ ...emptyAddress });
  };

  const startEdit = (addr: UserAddress) => {
    setEditing(addr);
    setForm({
      label: addr.label || 'Casa',
      name: addr.name || '',
      phone: addr.phone || '',
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || '',
      city: addr.city,
      state: addr.state || '',
      postal_code: addr.postal_code || '',
      country: addr.country || 'MX',
      is_default: !!addr.is_default,
    });
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-100">Mis Direcciones</h1>
          <button
            onClick={() => { setEditing(null); setForm({ ...emptyAddress, is_default: addresses.length === 0 }); setFormOpen(true); }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva dirección</span>
          </button>
        </div>

        {error && <div className="text-red-400 mb-4">{error}</div>}
        {loading && <div className="text-gray-300">Cargando...</div>}

        {!loading && sorted.length === 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-center text-gray-300">
            No tienes direcciones aún. Agrega una y será la predeterminada.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(addr => (
            <div key={addr.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-yellow-400 mt-1" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-semibold">{addr.label || 'Dirección'}</h3>
                      {addr.is_default && (
                        <span className="inline-flex items-center text-xs text-yellow-400">
                          <Star className="h-3 w-3 mr-1" /> Predeterminada
                        </span>
                      )}
                    </div>
                    {addr.name && <p className="text-gray-300 text-sm">{addr.name}</p>}
                    <p className="text-gray-300 text-sm">{addr.address_line1}</p>
                    {addr.address_line2 && <p className="text-gray-400 text-xs">{addr.address_line2}</p>}
                    <p className="text-gray-400 text-xs">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code || ''}</p>
                    <p className="text-gray-500 text-xs">{addr.country || 'MX'} {addr.phone ? `· ${addr.phone}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!addr.is_default && (
                    <button
                      onClick={() => setDefault(addr.id)}
                      className="px-2 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded"
                    >Hacer predeterminada</button>
                  )}
                  <button onClick={() => startEdit(addr)} className="p-2 text-gray-300 hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(addr.id)} className="p-2 text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {formOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold text-white mb-4">{editing ? 'Editar dirección' : 'Nueva dirección'}</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Etiqueta (Casa, Oficina)" value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} />
                  <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Nombre del receptor" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Teléfono" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })} />
                  <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Código Postal" value={form.postal_code || ''} onChange={e => setForm({ ...form, postal_code: e.target.value.replace(/[^0-9]/g, '').slice(0, 5) })} />
                </div>
                <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Colonia/Fraccionamiento" value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} required />
                <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Calle y número" value={form.address_line2 || ''} onChange={e => setForm({ ...form, address_line2: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Municipio" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
                  <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" placeholder="Estado" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white cursor-not-allowed" placeholder="País" value={form.country || 'MX'} readOnly />
                  <label className="inline-flex items-center space-x-2 text-gray-300 text-sm">
                    <input type="checkbox" checked={!!form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
                    <span>Marcar como predeterminada</span>
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setFormOpen(false); setEditing(null); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-semibold">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAddresses;


