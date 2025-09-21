const BaseTool = require('./base');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

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
    this.pendingConfirmations = new Map();
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

      // Generate confirmation ID and prepare transaction data
      const confirmationId = this.generateConfirmationId();
      const transactionData = {
        id: this.generateTransactionId(),
        userId: actualUserId,
        type: action,
        amount: parseFloat(amount.toFixed(2)),
        recipient: resolvedRecipient.displayName,
        recipientPhone: resolvedRecipient.phone || resolvedRecipient.value,
        fromContact: resolvedRecipient.fromContact,
        concept: concept.trim(),
        timestamp: new Date().toISOString(),
        status: 'pending_confirmation',
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES')
      };

      // Store pending confirmation
      this.pendingConfirmations.set(confirmationId, {
        transactionData,
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
      });

      // Return confirmation request instead of completed transaction
      return {
        success: true,
        requiresConfirmation: true,
        confirmationId: confirmationId,
        confirmationType: 'bizum_confirmation',
        transactionData: {
          amount: transactionData.amount,
          recipient: transactionData.recipient,
          concept: transactionData.concept,
          action: action
        },
        message: `💳 Confirmación requerida para Bizum de ${transactionData.amount}€ a ${transactionData.recipient}`,
        details: 'Para completar la transacción, confirma con tu firma digital en el navegador.'
      };

    } catch (error) {
      return {
        success: false,
        error: `Error en la transacción Bizum: ${error.message}`
      };
    }
  }

  async resolveRecipient(userId, recipient) {
    // Si parece un número de teléfono español válido, devolverlo directamente
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    const cleanRecipient = recipient.replace(/\s/g, '');

    if (phoneRegex.test(cleanRecipient)) {
      // Normalizar el número al formato +34XXXXXXXXX
      let normalizedPhone = cleanRecipient;
      if (normalizedPhone.startsWith('0034')) {
        normalizedPhone = '+34' + normalizedPhone.slice(4);
      } else if (normalizedPhone.startsWith('34')) {
        normalizedPhone = '+34' + normalizedPhone.slice(2);
      } else if (!normalizedPhone.startsWith('+34')) {
        normalizedPhone = '+34' + normalizedPhone;
      }

      return {
        value: normalizedPhone,
        displayName: normalizedPhone,
        phone: normalizedPhone,
        fromContact: false
      };
    }

    // Si no es un número de teléfono válido, sugerir usar contactos o número completo
    return {
      invalidRecipient: true,
      searchTerm: recipient,
      error: `"${recipient}" no es un número de teléfono válido. Para enviar un Bizum:\n\n1. Usa un número de teléfono español: "+34XXXXXXXXX" o "6XXXXXXXX"\n2. O primero busca el contacto: "Busca el contacto de ${recipient}"\n3. O ve tus contactos: "Muestra mis contactos"`
    };
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

  generateConfirmationId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CONF${timestamp.slice(-8)}${random}`;
  }

  async confirmTransaction(confirmationId, confirmed, signature = null) {
    const pending = this.pendingConfirmations.get(confirmationId);

    if (!pending) {
      return {
        success: false,
        error: 'Confirmación no encontrada o expirada'
      };
    }

    // Check if confirmation has expired
    if (Date.now() > pending.expiresAt) {
      this.pendingConfirmations.delete(confirmationId);
      return {
        success: false,
        error: 'La confirmación ha expirado'
      };
    }

    const { transactionData } = pending;

    if (!confirmed) {
      // Transaction cancelled
      this.pendingConfirmations.delete(confirmationId);
      return {
        success: true,
        cancelled: true,
        message: 'Transacción Bizum cancelada por el usuario'
      };
    }

    // Process confirmed transaction
    transactionData.status = 'completed';
    transactionData.signature = signature;
    transactionData.confirmedAt = new Date().toISOString();

    // Save transaction
    this.saveTransaction(transactionData, transactionData.userId);

    // Remove from pending confirmations
    this.pendingConfirmations.delete(confirmationId);

    const actionText = transactionData.type === 'send' ? 'enviado' : 'solicitado';
    const preposition = transactionData.type === 'send' ? 'a' : 'de';

    return {
      success: true,
      transaction: {
        id: transactionData.id,
        userId: transactionData.userId,
        amount: `${transactionData.amount}€`,
        recipient: transactionData.recipient,
        concept: transactionData.concept,
        status: transactionData.status,
        timestamp: `${transactionData.date} ${transactionData.time}`,
        signature: signature
      },
      message: `✅ Bizum ${actionText} correctamente`,
      details: `Has ${actionText} ${transactionData.amount}€ ${preposition} ${transactionData.recipient}${transactionData.fromContact ? ' (desde contactos)' : ''}`,
      reference: `Referencia: ${transactionData.id}`,
      contactUsed: transactionData.fromContact
    };
  }

  cleanExpiredConfirmations() {
    const now = Date.now();
    for (const [confirmationId, pending] of this.pendingConfirmations.entries()) {
      if (now > pending.expiresAt) {
        this.pendingConfirmations.delete(confirmationId);
      }
    }
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