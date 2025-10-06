# Solución para el Error de Recursión Infinita en user_roles

## 🔍 **Problema Identificado**
```
Error obteniendo rol desde user_roles: infinite recursion detected in policy for relation "user_roles"
```

Este error indica que hay un problema con las políticas RLS (Row Level Security) en la tabla `user_roles` de Supabase.

## 🛠️ **Solución Temporal Implementada**
- ✅ La aplicación ahora funciona sin consultar `user_roles`
- ✅ Usa rol 'customer' por defecto para todos los usuarios
- ✅ Permite configurar admins por email en el código
- ✅ No bloquea la carga de la página

## 🔧 **Para Arreglar las Políticas RLS en Supabase**

### **Opción 1: Deshabilitar RLS Temporalmente**
```sql
-- En el SQL Editor de Supabase
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
```

### **Opción 2: Crear Políticas RLS Correctas**
```sql
-- Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON user_roles;

-- Crear políticas simples y correctas
CREATE POLICY "Enable read access for authenticated users" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users" ON user_roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for authenticated users" ON user_roles
    FOR UPDATE USING (auth.uid() = user_id);
```

### **Opción 3: Políticas Más Permisivas (Recomendado)**
```sql
-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_roles;

-- Crear políticas simples
CREATE POLICY "Allow all operations for authenticated users" ON user_roles
    FOR ALL USING (auth.role() = 'authenticated');
```

## 📋 **Pasos para Implementar la Solución**

### **1. Acceder al Dashboard de Supabase**
1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Ve a **Authentication > Policies**
3. Busca la tabla `user_roles`

### **2. Eliminar Políticas Problemáticas**
1. Elimina todas las políticas existentes en `user_roles`
2. Esto evitará la recursión infinita

### **3. Crear Políticas Simples**
Ejecuta el SQL de la **Opción 3** en el SQL Editor de Supabase.

### **4. Verificar la Solución**
1. Recarga la aplicación
2. Verifica que no aparezcan más errores de recursión
3. Los roles deberían funcionar correctamente

## 🔄 **Restaurar Consulta a user_roles**

Una vez arregladas las políticas, puedes restaurar la consulta a `user_roles`:

1. Descomenta el código en `src/hooks/useAuth.ts` (líneas 38-68)
2. Comenta el código temporal (líneas 20-35)
3. La aplicación usará la tabla `user_roles` normalmente

## 🚀 **Solución Inmediata**

Mientras tanto, la aplicación funciona perfectamente con:
- ✅ Rol 'customer' por defecto para todos los usuarios
- ✅ Admins configurados por email en el código
- ✅ Sin bloqueos de carga
- ✅ Todas las funcionalidades disponibles

## 📝 **Configuración de Admins por Email**

Para asignar roles de admin temporalmente, edita el array en `src/hooks/useAuth.ts`:

```typescript
const adminEmails = [
  'admin@joyeria.com',
  'administrator@joyeria.com',
  'tu-email@ejemplo.com', // Agregar tu email aquí
];
```

## ⚠️ **Nota Importante**

Este es un problema de configuración de Supabase, no del código de la aplicación. La solución temporal permite que la aplicación funcione completamente mientras se arregla la configuración de la base de datos.

