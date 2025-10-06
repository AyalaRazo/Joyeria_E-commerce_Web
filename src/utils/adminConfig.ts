// Configuración de administradores por email
// Esta es una solución temporal hasta que se arreglen las políticas RLS

export const ADMIN_EMAILS = [
  'ayalajuliocesar13@gmail.com',
  'administrator@joyeria.com',
  // Agregar más emails de admin aquí
];

export const WORKER_EMAILS = [
  'worker@joyeria.com',
  'empleado@joyeria.com',
  // Agregar más emails de worker aquí
];

// Función para verificar si un email es admin
export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Función para verificar si un email es worker
export const isWorkerEmail = (email: string): boolean => {
  return WORKER_EMAILS.includes(email.toLowerCase());
};

// Función para obtener el rol basado en el email
export const getRoleFromEmail = (email: string): 'admin' | 'worker' | 'customer' => {
  if (isAdminEmail(email)) return 'admin';
  if (isWorkerEmail(email)) return 'worker';
  return 'customer';
};

// Función para agregar un admin temporalmente
export const addAdminEmail = (email: string): void => {
  if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
    ADMIN_EMAILS.push(email.toLowerCase());
    console.log(`✅ Email ${email} agregado como admin`);
  }
};

// Función para agregar un worker temporalmente
export const addWorkerEmail = (email: string): void => {
  if (!WORKER_EMAILS.includes(email.toLowerCase())) {
    WORKER_EMAILS.push(email.toLowerCase());
    console.log(`✅ Email ${email} agregado como worker`);
  }
};

