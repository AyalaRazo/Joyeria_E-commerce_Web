import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Mail, Copy, Check, FileText, Clock, ChevronRight } from 'lucide-react';

const BILLING_EMAIL = 'facturacion@empresa.com';

const InvoiceHelp: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchRecentOrders(session.user.id);
      }
    });
  }, []);

  const fetchRecentOrders = async (userId: string) => {
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total, billing_snapshot')
        .eq('user_id', userId)
        .eq('status', 'pagado')
        .order('created_at', { ascending: false })
        .limit(5);
      setOrders(data || []);
    } catch {
      // silencioso
    } finally {
      setLoadingOrders(false);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(BILLING_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Órdenes del mes en curso
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const ordersThisMonth = orders.filter(o => {
    const d = new Date(o.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const ordersOtherMonths = orders.filter(o => {
    const d = new Date(o.created_at);
    return !(d.getMonth() === currentMonth && d.getFullYear() === currentYear);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <header className="text-center space-y-3">
          <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Factura tu compra</p>
          <h1 className="text-4xl font-bold text-white">Solicita tu CFDI</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Emitimos facturas electrónicas para compras realizadas durante el mes en curso.
          </p>
        </header>

        {/* Aviso de tiempo */}
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4">
          <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200">
            <span className="font-semibold">Importante:</span> Solo podemos facturar compras realizadas dentro del mismo mes calendario.
            Pasado el mes, no es posible emitir el CFDI.
          </p>
        </div>

        {/* Escenario 1: Solicitó factura en checkout */}
        <div className="bg-gray-900/70 border border-gray-700/60 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-green-500/10 border-b border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-white">Ya solicité factura durante mi compra</h2>
              <p className="text-xs text-gray-400 mt-0.5">Activaste la opción "¿Requieres factura?" en el checkout</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-300">
              Tus datos fiscales ya están guardados en tu pedido. Solo necesitamos tu número de orden para emitir el CFDI.
            </p>
            <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Envía un correo con:</p>
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <ChevronRight className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                Tu número de pedido (ej: <span className="font-mono text-yellow-400">#ORD-0042</span>)
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <ChevronRight className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                Confirma el correo al que quieres recibir la factura (si es diferente al de tu cuenta)
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Verificaremos tus datos fiscales guardados y emitiremos el CFDI en un plazo de 1-2 días hábiles.
            </p>
          </div>
        </div>

        {/* Escenario 2: NO solicitó factura */}
        <div className="bg-gray-900/70 border border-gray-700/60 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 border-b border-blue-500/20">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-white">No solicité factura durante mi compra</h2>
              <p className="text-xs text-gray-400 mt-0.5">No activaste la opción de facturación en el checkout</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-300">
              No tenemos tus datos fiscales registrados. Necesitas enviarnos toda la información para poder emitir el CFDI.
            </p>
            <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Envía un correo con:</p>
              {[
                'Número de pedido',
                'RFC (12 o 13 caracteres)',
                'Razón Social o Nombre Fiscal',
                'Código Postal del domicilio fiscal',
                'Régimen Fiscal',
                'Uso de CFDI',
                'Constancia de Situación Fiscal actualizada (adjunto)',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-200">
                  <ChevronRight className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Si falta alguno de estos datos no podremos emitir la factura. Asegúrate de que el RFC corresponda a la Constancia de Situación Fiscal.
            </p>
          </div>
        </div>

        {/* Órdenes del usuario (si está logueado) */}
        {user && (
          <div className="bg-gray-900/70 border border-gray-700/60 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700/50">
              <FileText className="h-5 w-5 text-yellow-400" />
              <h2 className="text-base font-semibold text-white">Tus pedidos recientes</h2>
            </div>
            <div className="px-6 py-5">
              {loadingOrders ? (
                <p className="text-sm text-gray-500 text-center py-4">Cargando pedidos...</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No tienes pedidos pagados recientes.</p>
              ) : (
                <div className="space-y-3">
                  {ordersThisMonth.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Este mes — facturables</p>
                      {ordersThisMonth.map(order => (
                        <OrderRow key={order.id} order={order} facturableThisMonth />
                      ))}
                    </>
                  )}
                  {ordersOtherMonths.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-4">Meses anteriores — no facturables</p>
                      {ordersOtherMonths.map(order => (
                        <OrderRow key={order.id} order={order} facturableThisMonth={false} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contacto */}
        <div className="bg-gray-900/70 border border-gray-700/60 rounded-2xl px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-yellow-400" />
            <h2 className="text-base font-semibold text-white">Envía tu solicitud a</h2>
          </div>
          <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
            <span className="text-yellow-400 font-medium text-sm">{BILLING_EMAIL}</span>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer ml-3"
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">Copiado</span></>
              ) : (
                <><Copy className="h-3.5 w-3.5" />Copiar</>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Tiempo de respuesta habitual: 1-2 días hábiles. Recibirás el CFDI en el correo que nos indiques.
          </p>
        </div>

      </div>
    </div>
  );
};

// Sub-componente para mostrar una fila de orden
const OrderRow: React.FC<{ order: any; facturableThisMonth: boolean }> = ({ order, facturableThisMonth }) => {
  const hasBillingData = !!order.billing_snapshot;
  const date = new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
      facturableThisMonth
        ? 'bg-gray-800/40 border-gray-700/40'
        : 'bg-gray-800/20 border-gray-700/20 opacity-50'
    }`}>
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium text-white">
            #{order.order_number || order.id}
          </p>
          <p className="text-xs text-gray-500">{date} · ${Number(order.total).toFixed(2)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hasBillingData ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Datos guardados
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-700/40 border border-gray-600/30 px-2 py-0.5 rounded-full">
            <AlertCircle className="h-3 w-3" />
            Sin datos fiscales
          </span>
        )}
        {!facturableThisMonth && (
          <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
            Expirado
          </span>
        )}
      </div>
    </div>
  );
};

export default InvoiceHelp;
