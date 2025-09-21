const BaseTool = require('./base');
const fs = require('fs');
const path = require('path');

class BizumTool extends BaseTool {
  constructor() {
    super(
      'bizum',
      'Simula envíos de dinero mediante Bizum a contactos',
      {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Cantidad a enviar en euros (máximo 1000€)',
            minimum: 0.01,
            maximum: 1000
          },
          recipient: {
            type: 'string',
            description: 'Nombre del destinatario, número de teléfono, email, o ID de contacto específico (contact_xxx)'
          },
          concept: {
            type: 'string',
            description: 'Concepto del envío (opcional)',
            default: 'Bizum'
          },
          action: {
            type: 'string',
            description: 'Acción a realizar: send, request, history',
            enum: ['send', 'request', 'history'],
            default: 'send'
          },
          userId: {
            type: 'string',
            description: 'ID del usuario que realiza la operación (opcional, se detecta automáticamente)',
            default: 'default'
          }
        },
        required: ['amount', 'recipient']
      }
    );

    this.dataDir = path.join(__dirname, '../../data/users');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getUserTransactionFile(userId) {
    return path.join(this.dataDir, `${userId}_bizum.json`);
  }

  ensureUserFile(userId) {
    const userFile = this.getUserTransactionFile(userId);
    if (!fs.existsSync(userFile)) {
      fs.writeFileSync(userFile, JSON.stringify([], null, 2));
    }
  }

  async execute(args) {
    const { amount, recipient, concept = 'Bizum', action = 'send', userId = 'default' } = args;

    try {
      // Generar userId único si no se proporciona
      const actualUserId = userId === 'default' ? this.generateUserId() : userId;
      this.ensureUserFile(actualUserId);

      if (action === 'history') {
        return this.getTransactionHistory(actualUserId);
      }

      // Buscar en contactos si el recipient es un nombre
      const resolvedRecipient = await this.resolveRecipient(actualUserId, recipient);

      // Verificar si el destinatario es inválido (no es contacto ni número)
      if (resolvedRecipient.invalidRecipient) {
        return {
          success: false,
          invalidRecipient: true,
          error: resolvedRecipient.error,
          suggestions: [
            `Usar número directo: "Envía ${amount}€ a +34XXXXXXXXX"`,
            `Agregar contacto: "Agrega a ${resolvedRecipient.searchTerm} con teléfono +34XXXXXXXXX"`,
            `Ver contactos: "Muestra mis contactos"`
          ]
        };
      }

      // Verificar si necesita desambiguación
      if (resolvedRecipient.needsDisambiguation) {
        const contactsList = resolvedRecipient.matches.map((contact, index) =>
          `${index + 1}. ${contact.name} (${contact.phone}) - ${contact.email || 'Sin email'}`
        ).join('\n');

        return {
          success: false,
          needsDisambiguation: true,
          error: `${resolvedRecipient.error}\n\n${contactsList}\n\nPuedes especificar:\n- El número completo: "Envía ${amount}€ a ${resolvedRecipient.matches[0].phone}"\n- Más detalles del nombre: "Envía ${amount}€ a ${resolvedRecipient.matches[0].name}"\n- O usar el email si lo conoces`,
          matches: resolvedRecipient.matches
        };
      }

      // Validaciones
      const validation = this.validateTransaction(amount, resolvedRecipient.value);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Simular proceso de envío
      const transaction = {
        id: this.generateTransactionId(),
        userId: actualUserId,
        type: action,
        amount: parseFloat(amount.toFixed(2)),
        recipient: resolvedRecipient.displayName,
        recipientPhone: resolvedRecipient.phone || resolvedRecipient.value,
        fromContact: resolvedRecipient.fromContact,
        concept: concept.trim(),
        timestamp: new Date().toISOString(),
        status: 'completed',
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES')
      };

      // Guardar transacción
      this.saveTransaction(transaction, actualUserId);

      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));

      const actionText = action === 'send' ? 'enviado' : 'solicitado';
      const preposition = action === 'send' ? 'a' : 'de';

      return {
        success: true,
        transaction: {
          id: transaction.id,
          userId: actualUserId,
          amount: `${transaction.amount}€`,
          recipient: transaction.recipient,
          concept: transaction.concept,
          status: transaction.status,
          timestamp: `${transaction.date} ${transaction.time}`
        },
        message: `✅ Bizum ${actionText} correctamente`,
        details: `Has ${actionText} ${transaction.amount}€ ${preposition} ${transaction.recipient}${transaction.fromContact ? ' (desde contactos)' : ''}`,
        reference: `Referencia: ${transaction.id}`,
        userInfo: `Usuario: ${actualUserId}`,
        contactUsed: transaction.fromContact
      };

    } catch (error) {
      return {
        success: false,
        error: `Error en la transacción Bizum: ${error.message}`
      };
    }
  }

  async resolveRecipient(userId, recipient) {
    // Si parece un número de teléfono, devolverlo directamente
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    if (phoneRegex.test(recipient.replace(/\s/g, ''))) {
      return {
        value: recipient,
        displayName: recipient,
        phone: recipient,
        fromContact: false
      };
    }

    // Si es un ID de contacto específico
    if (recipient.startsWith('contact_')) {
      try {
        const ContactsTool = require('./contacts');
        const contactsTool = new ContactsTool();
        const contact = contactsTool.findContactById(userId, recipient);

        if (contact) {
          return {
            value: contact.phone,
            displayName: contact.name,
            phone: contact.phone,
            fromContact: true,
            alias: contact.alias
          };
        }
      } catch (error) {
        // Continuar con búsqueda normal si hay error
      }
    }

    // Si parece un email, buscar por email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(recipient)) {
      try {
        const ContactsTool = require('./contacts');
        const contactsTool = new ContactsTool();
        const contacts = contactsTool.getAllContacts(userId);
        const contact = contacts.find(c => c.email.toLowerCase() === recipient.toLowerCase());

        if (contact) {
          return {
            value: contact.phone,
            displayName: contact.name,
            phone: contact.phone,
            fromContact: true,
            alias: contact.alias
          };
        }
      } catch (error) {
        // Continuar con búsqueda normal si hay error
      }
    }

    // Buscar en contactos por nombre/alias
    try {
      const ContactsTool = require('./contacts');
      const contactsTool = new ContactsTool();
      const contactResult = contactsTool.findContactByName(userId, recipient);

      if (!contactResult) {
        // No se encontró contacto - rechazar la transacción
        return {
          invalidRecipient: true,
          searchTerm: recipient,
          error: `No se encontró ningún contacto con el nombre "${recipient}". Para enviar dinero debes:\n\n1. Usar un número de teléfono: "+34XXXXXXXXX"\n2. Agregar el contacto primero: "Agrega a ${recipient} con teléfono +34XXXXXXXXX"\n3. Buscar en tus contactos: "Muestra mis contactos"`
        };
      }

      if (contactResult.isMultiple) {
        // Múltiples contactos encontrados - necesita desambiguación
        return {
          needsDisambiguation: true,
          searchTerm: recipient,
          matches: contactResult.matches,
          error: `Se encontraron ${contactResult.matches.length} contactos con el nombre "${recipient}". Especifica cuál quieres usar:`
        };
      }

      // Un solo contacto encontrado
      return {
        value: contactResult.phone,
        displayName: contactResult.name,
        phone: contactResult.phone,
        fromContact: true,
        alias: contactResult.alias
      };

    } catch (error) {
      // Si hay error accediendo a contactos, usar valor original
      return {
        value: recipient,
        displayName: recipient,
        phone: null,
        fromContact: false
      };
    }
  }

  validateTransaction(amount, recipient) {
    // Validar cantidad
    if (amount <= 0) {
      return { valid: false, error: 'La cantidad debe ser mayor que 0€' };
    }

    if (amount > 1000) {
      return { valid: false, error: 'El límite máximo por transacción es 1000€' };
    }

    if (amount < 0.01) {
      return { valid: false, error: 'La cantidad mínima es 0.01€' };
    }

    // Validar destinatario
    if (!recipient || recipient.trim().length === 0) {
      return { valid: false, error: 'Debe especificar un destinatario' };
    }

    if (recipient.trim().length < 2) {
      return { valid: false, error: 'El nombre del destinatario debe tener al menos 2 caracteres' };
    }

    // Validar si es un número de teléfono
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    const isPhone = phoneRegex.test(recipient.replace(/\s/g, ''));

    // Validar si es un nombre
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/;
    const isName = nameRegex.test(recipient.trim());

    if (!isPhone && !isName) {
      return {
        valid: false,
        error: 'El destinatario debe ser un nombre válido o un número de teléfono español'
      };
    }

    return { valid: true };
  }

  generateTransactionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BZ${timestamp.slice(-8)}${random}`;
  }

  generateUserId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6);
    return `user_${timestamp.slice(-6)}_${random}`;
  }

  saveTransaction(transaction, userId) {
    try {
      const userFile = this.getUserTransactionFile(userId);
      let transactions = [];

      if (fs.existsSync(userFile)) {
        const data = fs.readFileSync(userFile, 'utf8');
        transactions = JSON.parse(data);
      }

      transactions.push(transaction);

      // Mantener solo las últimas 100 transacciones por usuario
      if (transactions.length > 100) {
        transactions = transactions.slice(-100);
      }

      fs.writeFileSync(userFile, JSON.stringify(transactions, null, 2));
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }

  getTransactionHistory(userId) {
    try {
      const userFile = this.getUserTransactionFile(userId);

      if (!fs.existsSync(userFile)) {
        return {
          success: true,
          message: 'No hay transacciones registradas para este usuario',
          transactions: [],
          userId: userId
        };
      }

      const data = fs.readFileSync(userFile, 'utf8');
      const transactions = JSON.parse(data);

      // Ordenar por fecha más reciente
      const sortedTransactions = transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10) // Últimas 10 transacciones
        .map(t => ({
          id: t.id,
          type: t.type === 'send' ? 'Envío' : 'Solicitud',
          amount: `${t.amount}€`,
          recipient: t.recipient,
          phone: t.recipientPhone || 'N/A',
          fromContact: t.fromContact ? '📱' : '',
          concept: t.concept,
          date: t.date,
          time: t.time,
          status: t.status === 'completed' ? 'Completado' : t.status
        }));

      return {
        success: true,
        message: `Últimas ${sortedTransactions.length} transacciones Bizum`,
        transactions: sortedTransactions,
        userId: userId,
        totalTransactions: transactions.length
      };

    } catch (error) {
      return {
        success: false,
        error: `Error al obtener el historial: ${error.message}`
      };
    }
  }

  // Método para obtener estadísticas de todos los usuarios (admin)
  getAllUsersStats() {
    try {
      const users = [];
      const files = fs.readdirSync(this.dataDir);

      for (const file of files) {
        if (file.endsWith('_bizum.json')) {
          const userId = file.replace('_bizum.json', '');
          const userFile = path.join(this.dataDir, file);
          const data = fs.readFileSync(userFile, 'utf8');
          const transactions = JSON.parse(data);

          const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
          const totalTransactions = transactions.length;

          users.push({
            userId,
            totalTransactions,
            totalAmount: `${totalAmount.toFixed(2)}€`,
            lastTransaction: transactions.length > 0 ?
              transactions[transactions.length - 1].date : 'Nunca'
          });
        }
      }

      return {
        success: true,
        message: `Estadísticas de ${users.length} usuarios`,
        users: users
      };

    } catch (error) {
      return {
        success: false,
        error: `Error al obtener estadísticas: ${error.message}`
      };
    }
  }
}

module.exports = BizumTool;