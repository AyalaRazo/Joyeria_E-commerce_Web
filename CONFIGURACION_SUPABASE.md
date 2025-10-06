# Configuración de Supabase

## Problema Identificado
La página web se queda cargando porque no se han configurado las variables de entorno de Supabase.

## Solución

### 1. Crear archivo .env
Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
VITE_SUPABASE_URL=tu_url_de_supabase_aqui
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

### 2. Obtener las credenciales de Supabase
1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Ve a Settings > API
3. Copia la URL del proyecto y la clave anónima
4. Reemplaza los valores en el archivo .env

### 3. Ejemplo de configuración
```env
VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Reiniciar el servidor
Después de crear el archivo .env, reinicia el servidor de desarrollo:

```bash
npm run dev
```

## Mejoras Implementadas

### 1. Manejo de Errores Mejorado
- Timeout de 10 segundos para evitar cargas infinitas
- Mensajes de error más informativos
- Fallback a datos de ejemplo en caso de error

### 2. Configuración Temporal
- La aplicación ahora funciona sin variables de entorno (con advertencias)
- Mensajes de advertencia en la consola para guiar la configuración

### 3. Interfaz de Usuario
- Pantalla de error amigable con instrucciones
- Indicadores de carga mejorados
- Mensajes de error específicos

## Verificación
Una vez configurado correctamente, deberías ver:
- Los productos se cargan normalmente
- No hay mensajes de error en la consola
- La aplicación funciona completamente

## Notas Adicionales
- Asegúrate de que tu base de datos de Supabase tenga las tablas necesarias
- Verifica que las políticas de RLS estén configuradas correctamente
- Revisa la consola del navegador para más detalles sobre errores específicos
