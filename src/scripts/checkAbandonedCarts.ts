// scripts/checkAbandonedCarts.ts
import { supabase } from '../hooks/useAuth';
import { sendEmail } from '../services/emailService'; // Deberás implementar este servicio

const DAYS_OF_INACTIVITY = 7; // 1 semana

export const checkAbandonedCarts = async () => {
  try {
    // Calcular la fecha límite (hace 7 días)
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - DAYS_OF_INACTIVITY);
    
    // Obtener carritos inactivos
    const { data: abandonedCarts, error } = await supabase
      .from('carts')
      .select('user_id, items, updated_at, user:users(email, name)')
      .not('items', 'is', null) // Que no estén vacíos
      .lt('updated_at', limitDate.toISOString()) // No actualizados en los últimos 7 días
      .neq('items', '[]'); // Que tengan items
    
    if (error) throw error;

    // Procesar cada carrito abandonado
    for (const cart of abandonedCarts) {
      if (cart.user && cart.user.email) {
        // Enviar correo electrónico
        await sendReminderEmail(cart.user.email, cart.user.name, cart.items);
        console.log(`Email sent to ${cart.user.email}`);
      }
    }

    console.log(`Processed ${abandonedCarts.length} abandoned carts`);
  } catch (error) {
    console.error('Error checking abandoned carts:', error);
  }
};

const sendReminderEmail = async (email: string, name: string, items: any[]) => {
  const subject = '¡No olvides tu carrito de compras!';
  const html = `
    <h1>Hola ${name},</h1>
    <p>Vemos que tienes ${items.length} productos en tu carrito que aún no has comprado.</p>
    <p>¡No pierdas la oportunidad! Estos artículos podrían agotarse pronto.</p>
    <a href="https://tutienda.com/carrito" style="
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin-top: 16px;
    ">Ver mi carrito</a>
    <p style="margin-top: 24px;">Atentamente,<br>El equipo de Tu Tienda</p>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html
    });
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
};

// Ejecutar el script
checkAbandonedCarts();