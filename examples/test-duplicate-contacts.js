const AIAgentApp = require('../src/index');

async function testDuplicateContacts() {
  console.log('👥 Probando gestión de contactos duplicados...\n');

  const app = new AIAgentApp();

  try {
    await app.initialize();
    console.log('✅ Agent inicializado\n');

    const userId = 'test_duplicates_user';

    // 1. Agregar contactos con nombres similares para crear duplicados
    console.log('➕ 1. Agregando contactos con nombres similares:');

    const contactsToAdd = [
      'Agrega a María López con teléfono +34678111111 y email maria.lopez1@email.com',
      'Agrega a María López con teléfono +34678222222 y email maria.lopez2@email.com',
      'Agrega a Pedro García con teléfono +34678333333',
      'Agrega a Pedro García Martínez con teléfono +34678444444'
    ];

    for (const addCommand of contactsToAdd) {
      console.log(`📱 ${addCommand}`);
      const result = await app.processMessage(addCommand, userId);
      console.log(`🤖 ${result.response}`);
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 2. Listar contactos para verificar que se crearon
    console.log('📋 2. Listando todos los contactos:');
    let result = await app.processMessage('Muestra mis contactos', userId);
    console.log(`🤖 ${result.response}`);
    console.log('');

    // 3. Intentar enviar Bizum a nombre ambiguo
    console.log('💰 3. Intentando enviar Bizum a nombre ambiguo "María":');
    result = await app.processMessage('Envía 25€ a María', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Detectó duplicados?: ${result.success ? 'No (problema)' : 'Sí (correcto)'}`);
    console.log('');

    // 4. Intentar con "María López" (también ambiguo)
    console.log('💰 4. Intentando enviar Bizum a "María López":');
    result = await app.processMessage('Envía 30€ a María López', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Detectó duplicados?: ${result.success ? 'No (problema)' : 'Sí (correcto)'}`);
    console.log('');

    // 5. Usar número específico para resolver ambigüedad
    console.log('💰 5. Resolviendo ambigüedad con número específico:');
    result = await app.processMessage('Envía 25€ a +34678111111', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Funcionó?: ${result.success ? 'Sí' : 'No'}`);
    console.log('');

    // 6. Usar email para resolver ambigüedad
    console.log('💰 6. Resolviendo ambigüedad con email:');
    result = await app.processMessage('Envía 40€ a maria.lopez2@email.com', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Funcionó?: ${result.success ? 'Sí' : 'No'}`);
    console.log('');

    // 7. Buscar contacto ambiguo
    console.log('🔍 7. Buscando contacto ambiguo "Pedro":');
    result = await app.processMessage('Busca el contacto de Pedro', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log('');

    // 8. Intentar con nombre más específico
    console.log('💰 8. Enviando a nombre más específico:');
    result = await app.processMessage('Envía 20€ a Pedro García Martínez', userId);
    console.log(`🤖 Respuesta: ${result.response}`);
    console.log(`✅ ¿Funcionó?: ${result.success ? 'Sí' : 'No'}`);
    console.log('');

    // 9. Ver historial para verificar transacciones exitosas
    console.log('📊 9. Verificando historial de transacciones:');
    result = await app.processMessage('Muestra mi historial de Bizum', userId);
    console.log(`🤖 Historial: ${result.response}`);
    console.log('');

    // 10. Agregar contacto con nombre único y probarlo
    console.log('➕ 10. Agregando contacto único y probándolo:');
    result = await app.processMessage('Agrega a Roberto Único con teléfono +34678555555', userId);
    console.log(`🤖 ${result.response}`);

    await new Promise(resolve => setTimeout(resolve, 500));

    result = await app.processMessage('Envía 15€ a Roberto', userId);
    console.log(`🤖 Bizum a Roberto: ${result.response}`);
    console.log(`✅ ¿Funcionó sin problema?: ${result.success ? 'Sí' : 'No'}`);

    console.log('\n🏁 Pruebas de contactos duplicados completadas');

    console.log('\n📋 Resultados esperados:');
    console.log('✅ Detectar cuando hay múltiples contactos con el mismo nombre');
    console.log('✅ Mostrar lista de opciones cuando hay ambigüedad');
    console.log('✅ Permitir resolución con número de teléfono específico');
    console.log('✅ Permitir resolución con email específico');
    console.log('✅ Funcionar normalmente con nombres únicos');
    console.log('✅ Dar sugerencias claras de cómo resolver la ambigüedad');

  } catch (error) {
    console.error('❌ Error en las pruebas de duplicados:', error.message);
  }
}

if (require.main === module) {
  testDuplicateContacts();
}