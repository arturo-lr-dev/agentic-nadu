const BaseTool = require('./base');
const fs = require('fs');
const path = require('path');

class ContactsTool extends BaseTool {
  constructor() {
    super(
      'contacts',
      'Gestiona la libreta de contactos del usuario (agregar, buscar, eliminar, listar contactos)',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Acción a realizar: add, search, list, delete, update',
            enum: ['add', 'search', 'list', 'delete', 'update'],
            default: 'list'
          },
          name: {
            type: 'string',
            description: 'Nombre del contacto'
          },
          phone: {
            type: 'string',
            description: 'Número de teléfono del contacto'
          },
          email: {
            type: 'string',
            description: 'Email del contacto (opcional)'
          },
          alias: {
            type: 'string',
            description: 'Alias o apodo del contacto (opcional)'
          },
          query: {
            type: 'string',
            description: 'Término de búsqueda para encontrar contactos'
          },
          userId: {
            type: 'string',
            description: 'ID del usuario (se inyecta automáticamente)',
            default: 'default'
          }
        },
        required: []
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

  getUserContactsFile(userId) {
    return path.join(this.dataDir, `${userId}_contacts.json`);
  }

  ensureUserContactsFile(userId) {
    const userFile = this.getUserContactsFile(userId);
    if (!fs.existsSync(userFile)) {
      // Crear contactos de ejemplo para el usuario
      const defaultContacts = this.getDefaultContacts();
      fs.writeFileSync(userFile, JSON.stringify(defaultContacts, null, 2));
    }
  }

  getDefaultContacts() {
    return [
      {
        id: 'contact_001',
        name: 'María García',
        phone: '+34678123456',
        email: 'maria.garcia@email.com',
        alias: 'María',
        createdAt: new Date().toISOString(),
        favorite: true
      },
      {
        id: 'contact_002',
        name: 'Pedro Martínez',
        phone: '+34612987654',
        email: 'pedro.martinez@email.com',
        alias: 'Pedro',
        createdAt: new Date().toISOString(),
        favorite: false
      },
      {
        id: 'contact_003',
        name: 'Ana López',
        phone: '+34654321098',
        email: 'ana.lopez@email.com',
        alias: 'Ana',
        createdAt: new Date().toISOString(),
        favorite: true
      },
      {
        id: 'contact_004',
        name: 'Carlos Ruiz',
        phone: '+34687654321',
        email: 'carlos.ruiz@email.com',
        alias: 'Carlos',
        createdAt: new Date().toISOString(),
        favorite: false
      },
      {
        id: 'contact_005',
        name: 'Lucía Fernández',
        phone: '+34643210987',
        email: 'lucia.fernandez@email.com',
        alias: 'Lucía',
        createdAt: new Date().toISOString(),
        favorite: true
      },
      {
        "id": "contact_57826262_4yv1",
        "name": "Daniel Rangel",
        "phone": "+34644344744",
        "email": "",
        "alias": "Daniel",
        "createdAt": "2025-09-21T12:30:26.262Z",
        "favorite": false
      },
      {
        "id": "contact_57846791_w403",
        "name": "Daniel Langa",
        "phone": "+34655355755",
        "email": "",
        "alias": "Daniel",
        "createdAt": "2025-09-21T12:30:46.791Z",
        "favorite": false
      }
    ];
  }

  async execute(args) {
    const { action = 'list', name, phone, email, alias, query, userId = 'default' } = args;

    try {
      this.ensureUserContactsFile(userId);

      switch (action) {
        case 'add':
          return this.addContact(userId, { name, phone, email, alias });
        case 'search':
          return this.searchContacts(userId, query || name);
        case 'list':
          return this.listContacts(userId);
        case 'delete':
          return this.deleteContact(userId, name || query);
        case 'update':
          return this.updateContact(userId, { name, phone, email, alias });
        default:
          return {
            success: false,
            error: `Acción no válida: ${action}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error en la gestión de contactos: ${error.message}`
      };
    }
  }

  addContact(userId, contactData) {
    const { name, phone, email, alias } = contactData;

    if (!name || !phone) {
      return {
        success: false,
        error: 'Nombre y teléfono son obligatorios para agregar un contacto'
      };
    }

    // Validar formato de teléfono
    const phoneValidation = this.validatePhone(phone);
    if (!phoneValidation.valid) {
      return {
        success: false,
        error: phoneValidation.error
      };
    }

    const contacts = this.loadContacts(userId);

    // Verificar si ya existe
    const existingContact = contacts.find(c =>
      c.name.toLowerCase() === name.toLowerCase() ||
      c.phone === phoneValidation.formattedPhone
    );

    if (existingContact) {
      return {
        success: false,
        error: `Ya existe un contacto con ese nombre o teléfono`
      };
    }

    const newContact = {
      id: this.generateContactId(),
      name: name.trim(),
      phone: phoneValidation.formattedPhone,
      email: email?.trim() || '',
      alias: alias?.trim() || name.split(' ')[0],
      createdAt: new Date().toISOString(),
      favorite: false
    };

    contacts.push(newContact);
    this.saveContacts(userId, contacts);

    return {
      success: true,
      message: `Contacto agregado correctamente`,
      contact: {
        name: newContact.name,
        phone: newContact.phone,
        alias: newContact.alias
      }
    };
  }

  searchContacts(userId, query) {
    if (!query) {
      return {
        success: false,
        error: 'Debe proporcionar un término de búsqueda'
      };
    }

    const contacts = this.loadContacts(userId);
    const searchTerm = query.toLowerCase();

    const results = contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.alias.toLowerCase().includes(searchTerm) ||
      contact.phone.includes(searchTerm) ||
      contact.email.toLowerCase().includes(searchTerm)
    );

    if (results.length === 0) {
      return {
        success: true,
        message: `No se encontraron contactos que coincidan con "${query}"`,
        contacts: []
      };
    }

    return {
      success: true,
      message: `Se encontraron ${results.length} contacto(s)`,
      contacts: results.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        alias: contact.alias,
        email: contact.email,
        favorite: contact.favorite
      }))
    };
  }

  listContacts(userId) {
    const contacts = this.loadContacts(userId);

    if (contacts.length === 0) {
      return {
        success: true,
        message: 'No hay contactos en la libreta',
        contacts: []
      };
    }

    // Ordenar: favoritos primero, luego alfabéticamente
    const sortedContacts = contacts.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return a.name.localeCompare(b.name);
    });

    const favorites = sortedContacts.filter(c => c.favorite);
    const others = sortedContacts.filter(c => !c.favorite);

    return {
      success: true,
      message: `${contacts.length} contactos en total`,
      totalContacts: contacts.length,
      favorites: favorites.length,
      contacts: sortedContacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        alias: contact.alias,
        email: contact.email,
        favorite: contact.favorite ? '⭐' : ''
      }))
    };
  }

  deleteContact(userId, identifier) {
    if (!identifier) {
      return {
        success: false,
        error: 'Debe proporcionar el nombre o teléfono del contacto a eliminar'
      };
    }

    const contacts = this.loadContacts(userId);
    const searchTerm = identifier.toLowerCase();

    const contactIndex = contacts.findIndex(contact =>
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.alias.toLowerCase().includes(searchTerm) ||
      contact.phone.includes(identifier)
    );

    if (contactIndex === -1) {
      return {
        success: false,
        error: `No se encontró un contacto que coincida con "${identifier}"`
      };
    }

    const deletedContact = contacts.splice(contactIndex, 1)[0];
    this.saveContacts(userId, contacts);

    return {
      success: true,
      message: `Contacto eliminado correctamente`,
      deletedContact: {
        name: deletedContact.name,
        phone: deletedContact.phone
      }
    };
  }

  updateContact(userId, contactData) {
    const { name, phone, email, alias } = contactData;

    if (!name) {
      return {
        success: false,
        error: 'Debe proporcionar el nombre del contacto a actualizar'
      };
    }

    const contacts = this.loadContacts(userId);
    const contactIndex = contacts.findIndex(contact =>
      contact.name.toLowerCase() === name.toLowerCase()
    );

    if (contactIndex === -1) {
      return {
        success: false,
        error: `No se encontró un contacto con el nombre "${name}"`
      };
    }

    const contact = contacts[contactIndex];

    // Actualizar campos proporcionados
    if (phone) {
      const phoneValidation = this.validatePhone(phone);
      if (!phoneValidation.valid) {
        return {
          success: false,
          error: phoneValidation.error
        };
      }
      contact.phone = phoneValidation.formattedPhone;
    }

    if (email !== undefined) contact.email = email.trim();
    if (alias !== undefined) contact.alias = alias.trim();

    contact.updatedAt = new Date().toISOString();

    this.saveContacts(userId, contacts);

    return {
      success: true,
      message: `Contacto actualizado correctamente`,
      contact: {
        name: contact.name,
        phone: contact.phone,
        alias: contact.alias,
        email: contact.email
      }
    };
  }

  validatePhone(phone) {
    // Limpiar el número
    const cleanPhone = phone.replace(/\s/g, '');

    // Formato español
    const spanishPhoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;

    if (!spanishPhoneRegex.test(cleanPhone)) {
      return {
        valid: false,
        error: 'Formato de teléfono no válido. Use formato español: +34XXXXXXXXX o 6XXXXXXXX'
      };
    }

    // Normalizar formato
    let formattedPhone = cleanPhone;
    if (!formattedPhone.startsWith('+34')) {
      if (formattedPhone.startsWith('0034')) {
        formattedPhone = '+34' + formattedPhone.substring(4);
      } else if (formattedPhone.startsWith('34')) {
        formattedPhone = '+34' + formattedPhone.substring(2);
      } else {
        formattedPhone = '+34' + formattedPhone;
      }
    }

    return {
      valid: true,
      formattedPhone
    };
  }

  generateContactId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6);
    return `contact_${timestamp.slice(-8)}_${random}`;
  }

  loadContacts(userId) {
    try {
      const userFile = this.getUserContactsFile(userId);
      const data = fs.readFileSync(userFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  saveContacts(userId, contacts) {
    try {
      const userFile = this.getUserContactsFile(userId);
      fs.writeFileSync(userFile, JSON.stringify(contacts, null, 2));
    } catch (error) {
      console.error('Error saving contacts:', error);
    }
  }

  // Método público para que otras herramientas busquen contactos
  findContactByName(userId, name) {
    const contacts = this.loadContacts(userId);
    const searchTerm = name.toLowerCase();

    const matches = contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.alias.toLowerCase().includes(searchTerm)
    );

    if (matches.length === 0) {
      return null;
    }

    if (matches.length === 1) {
      return matches[0];
    }

    // Múltiples coincidencias - retornar información para desambiguar
    return {
      isMultiple: true,
      matches: matches.map(contact => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        alias: contact.alias,
        email: contact.email
      })),
      searchTerm: name
    };
  }

  // Método para buscar contacto por ID específico
  findContactById(userId, contactId) {
    const contacts = this.loadContacts(userId);
    return contacts.find(contact => contact.id === contactId);
  }

  // Método público para obtener todos los contactos (para otras herramientas)
  getAllContacts(userId) {
    return this.loadContacts(userId);
  }
}

module.exports = ContactsTool;