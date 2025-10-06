# Sistema de Roles y Panel de Administración

## Descripción

Este proyecto implementa un sistema completo de roles de usuario para una aplicación de joyería, con las siguientes funcionalidades:

### Roles de Usuario

1. **Admin**: Acceso completo al panel de administración
   - Gestión de productos (agregar, modificar, eliminar)
   - Gestión de órdenes
   - Procesamiento de devoluciones
   - Asignación de roles a otros usuarios

2. **Worker**: Acceso limitado al panel de administración
   - Gestión de órdenes (ver y actualizar códigos de rastreo)
   - Procesamiento de devoluciones
   - NO puede gestionar productos ni asignar roles

3. **Customer**: Usuarios regulares
   - Solo pueden ver sus pedidos
   - No tienen acceso al panel de administración

## Funcionalidades Implementadas

### Panel de Administración (`/admin`)

#### Gestión de Productos
- Ver lista de productos con stock
- Editar stock de productos y variantes
- Agregar nuevos productos (solo admin)
- Eliminar productos (solo admin)
- Ver detalles de variantes

#### Gestión de Órdenes
- Ver todas las órdenes
- Actualizar códigos de rastreo
- Procesar devoluciones con restauración automática de stock
- Ver detalles de órdenes

#### Sistema de Devoluciones
- Procesar devoluciones usando la función PostgreSQL `process_return`
- Restauración automática de stock
- Registro de devoluciones con razón y administrador responsable

#### Gestión de Usuarios (Solo Admin)
- Ver lista de usuarios
- Asignar roles (customer, worker, admin)
- Cambiar roles de usuarios existentes

### Componentes de Protección de Rutas

- `RequireAdmin`: Solo permite acceso a administradores
- `RequireWorker`: Permite acceso a workers y administradores
- `RequireUserAuth`: Requiere autenticación de usuario

### Hooks Personalizados

- `useAuth`: Gestión de autenticación y roles
- `useReturns`: Gestión de devoluciones
- `useUserManagement`: Gestión de usuarios y roles

## Configuración de la Base de Datos

### Tablas Requeridas

```sql
-- Tabla de roles de usuario
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
);

-- Tabla de devoluciones
CREATE TABLE returns (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id),
  admin_id UUID REFERENCES auth.users(id),
  reason TEXT,
  returned_at TIMESTAMPTZ DEFAULT NOW(),
  items_returned JSONB
);

-- Función para procesar devoluciones
CREATE OR REPLACE FUNCTION process_return(order_id_param BIGINT)
RETURNS VOID AS $$
BEGIN
  -- Restaurar stock
  UPDATE product_variants pv
  SET stock = pv.stock + oi.quantity
  FROM order_items oi
  WHERE oi.order_id = order_id_param AND oi.variant_id = pv.id;
  
  UPDATE products p
  SET stock = p.stock + oi.quantity
  FROM order_items oi
  WHERE oi.order_id = order_id_param AND oi.product_id = p.id AND oi.variant_id IS NULL;
  
  -- Marcar orden como devuelta
  UPDATE orders 
  SET status = 'devuelto', return_status = 'returned'
  WHERE id = order_id_param;
END;
$$ LANGUAGE plpgsql;
```

## Uso

### Asignar Roles Iniciales

Para asignar roles de administrador o worker a usuarios existentes:

```typescript
import { assignAdminRole, assignWorkerRole } from './utils/initializeRoles';

// Asignar rol de admin
await assignAdminRole('user-uuid-here');

// Asignar rol de worker
await assignWorkerRole('user-uuid-here');
```

### Acceso al Panel de Administración

1. Los usuarios con rol `admin` o `worker` verán un botón "Panel Admin" en el menú de usuario
2. Al hacer clic, serán redirigidos a `/admin`
3. El panel mostrará diferentes opciones según el rol del usuario

### Procesar Devoluciones

1. En la pestaña "Órdenes", hacer clic en el ícono de devolución
2. Ingresar la razón de la devolución (opcional)
3. Confirmar la devolución
4. El sistema automáticamente:
   - Restaura el stock de los productos
   - Marca la orden como "devuelto"
   - Registra la devolución en la tabla `returns`

## Seguridad

- Todas las rutas administrativas están protegidas por componentes de autorización
- Los roles se verifican tanto en el frontend como en el backend
- Solo los administradores pueden asignar roles a otros usuarios
- Los workers no pueden modificar productos ni gestionar usuarios

## Estructura de Archivos

```
src/
├── components/
│   ├── AdminPanel.tsx          # Panel principal de administración
│   ├── RequireAdmin.tsx        # Protección para admin
│   ├── RequireWorker.tsx       # Protección para worker/admin
│   └── Header.tsx              # Header con botón de admin
├── hooks/
│   ├── useAuth.ts              # Hook de autenticación con roles
│   ├── useReturns.ts           # Hook para devoluciones
│   └── useUserManagement.ts    # Hook para gestión de usuarios
├── types/
│   └── index.ts                # Tipos TypeScript actualizados
└── utils/
    └── initializeRoles.ts      # Utilidades para inicializar roles
```
