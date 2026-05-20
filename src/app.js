/**
 * Configuración principal de la aplicación Express.
 * Se separa de server.js para facilitar pruebas con supertest.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Importación de rutas
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const permisoOperativoRoutes = require('./routes/permisoOperativoRoutes');
const fichajeRoutes = require('./routes/fichajeRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// -------------------------------------------------------------------
// Middlewares globales de seguridad y parsing
// -------------------------------------------------------------------

// Cabeceras HTTP seguras (X-Frame-Options, CSP, etc.)
app.use(helmet());

// CORS configurable por entorno
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
}));

// Parseo del body JSON con límite de tamaño (evita payloads abusivos)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.LOG_LEVEL || 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// Rate limiting global (protección ante fuerza bruta y DoS)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas peticiones. Inténtalo más tarde.',
  },
});
app.use(API_PREFIX, limiter);

// -------------------------------------------------------------------
// Endpoints de salud
// -------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    name: 'PIN-SELES (CNA) Backend',
    version: '1.0.0',
    status: 'running',
    docs: `${API_PREFIX}/health`,
  });
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// -------------------------------------------------------------------
// Registro de rutas de negocio
// -------------------------------------------------------------------
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/usuarios`, usuarioRoutes);
app.use(`${API_PREFIX}/permisos-operativos`, permisoOperativoRoutes);
app.use(`${API_PREFIX}/fichajes`, fichajeRoutes);
app.use(`${API_PREFIX}/inventario`, inventarioRoutes);

// -------------------------------------------------------------------
// Manejo de 404 y errores (siempre al final)
// -------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
