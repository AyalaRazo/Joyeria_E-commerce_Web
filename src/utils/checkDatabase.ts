import { supabase } from '../lib/supabase';

export const checkDatabase = async () => {
  console.log('🔍 Verificando estado de la base de datos...');
  
  const results = {
    products: { count: 0, error: null as any },
    categories: { count: 0, error: null as any },
    product_variants: { count: 0, error: null as any },
    product_images: { count: 0, error: null as any },
    user_roles: { count: 0, error: null as any }
  };

  // Verificar productos
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    results.products = { count: count || 0, error };
    console.log('📦 Productos:', count || 0, error ? `Error: ${error.message}` : 'OK');
  } catch (err) {
    results.products.error = err;
    console.error('❌ Error verificando productos:', err);
  }

  // Verificar categorías
  try {
    const { count, error } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });
    results.categories = { count: count || 0, error };
    console.log('📂 Categorías:', count || 0, error ? `Error: ${error.message}` : 'OK');
  } catch (err) {
    results.categories.error = err;
    console.error('❌ Error verificando categorías:', err);
  }

  // Verificar variantes
  try {
    const { count, error } = await supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true });
    results.product_variants = { count: count || 0, error };
    console.log('🔧 Variantes:', count || 0, error ? `Error: ${error.message}` : 'OK');
  } catch (err) {
    results.product_variants.error = err;
    console.error('❌ Error verificando variantes:', err);
  }

  // Verificar imágenes
  try {
    const { count, error } = await supabase
      .from('product_images')
      .select('*', { count: 'exact', head: true });
    results.product_images = { count: count || 0, error };
    console.log('🖼️ Imágenes:', count || 0, error ? `Error: ${error.message}` : 'OK');
  } catch (err) {
    results.product_images.error = err;
    console.error('❌ Error verificando imágenes:', err);
  }

  // Verificar roles
  try {
    const { count, error } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true });
    results.user_roles = { count: count || 0, error };
    console.log('👥 Roles:', count || 0, error ? `Error: ${error.message}` : 'OK');
  } catch (err) {
    results.user_roles.error = err;
    console.error('❌ Error verificando roles:', err);
  }

  // Resumen
  console.log('\n📊 RESUMEN DE LA BASE DE DATOS:');
  console.log('================================');
  Object.entries(results).forEach(([table, result]) => {
    const status = result.error ? '❌' : '✅';
    const count = result.count;
    const error = result.error ? ` (Error: ${result.error.message})` : '';
    console.log(`${status} ${table}: ${count} registros${error}`);
  });

  // Verificar si hay datos suficientes
  const hasProducts = results.products.count > 0;
  const hasCategories = results.categories.count > 0;
  
  console.log('\n🎯 DIAGNÓSTICO:');
  console.log('================');
  
  if (!hasProducts) {
    console.log('⚠️ PROBLEMA: No hay productos en la base de datos');
    console.log('💡 SOLUCIÓN: Agrega algunos productos a la tabla "products"');
  }
  
  if (!hasCategories) {
    console.log('⚠️ PROBLEMA: No hay categorías en la base de datos');
    console.log('💡 SOLUCIÓN: Agrega algunas categorías a la tabla "categories"');
  }
  
  if (hasProducts && hasCategories) {
    console.log('✅ La base de datos parece estar configurada correctamente');
  }

  return results;
};

// Función para insertar datos de ejemplo
export const insertSampleData = async () => {
  console.log('🔄 Insertando datos de ejemplo...');
  
  try {
    // Insertar categorías
    const { error: categoriesError } = await supabase
      .from('categories')
      .insert([
        { name: 'Anillos', description: 'Anillos de lujo' },
        { name: 'Collares', description: 'Collares exclusivos' },
        { name: 'Pulseras', description: 'Pulseras elegantes' },
        { name: 'Pendientes', description: 'Pendientes únicos' }
      ]);
    
    if (categoriesError) {
      console.log('⚠️ Error insertando categorías (puede que ya existan):', categoriesError.message);
    } else {
      console.log('✅ Categorías insertadas');
    }

    // Insertar productos de ejemplo
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (categoryData && categoryData.length > 0) {
      const { error: productsError } = await supabase
        .from('products')
        .insert([
          {
            name: 'Anillo de Compromiso Diamante',
            price: 15000,
            original_price: 18000,
            image: '/images/anillos/anillo-compromiso_diamante_solitario.jpg',
            description: 'Anillo de compromiso con diamante solitario de 1 quilate',
            material: 'Oro blanco 18k',
            in_stock: true,
            is_new: true,
            is_featured: true,
            category_id: categoryData[0].id,
            stock: 5
          },
          {
            name: 'Collar Riviere Oro Blanco',
            price: 8500,
            original_price: 10000,
            image: '/images/collares/collar_riviere_oro_blanco_con_diamantes.png',
            description: 'Collar riviere con diamantes en oro blanco',
            material: 'Oro blanco 18k',
            in_stock: true,
            is_new: false,
            is_featured: true,
            category_id: categoryData[0].id,
            stock: 3
          }
        ]);
      
      if (productsError) {
        console.log('⚠️ Error insertando productos:', productsError.message);
      } else {
        console.log('✅ Productos de ejemplo insertados');
      }
    }
    
  } catch (err) {
    console.error('❌ Error insertando datos de ejemplo:', err);
  }
};


