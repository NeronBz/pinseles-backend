/**
 * Configuración centralizada de la aplicación.
 * Lee de variables de entorno con valores por defecto seguros.
 */

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/pinseles',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    algorithm: 'HS256',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },

  roles: {
    SOLICITANTE: 'SOLICITANTE',
    BOMBERO: 'BOMBERO',
    JEFE: 'JEFE',
    ADMIN: 'ADMIN',
  },
};
