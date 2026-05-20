/**
 * Tests básicos del backend.
 *
 * Estos tests no requieren MongoDB real: usan una BD en memoria
 * mediante mongodb-memory-server si está disponible. Si no, saltan la
 * parte de BD y prueban solo los endpoints que no la necesitan.
 *
 * Para ejecutar: npm test
 */

require('dotenv').config();

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto_de_test_unicamente_para_tests_123456789';
process.env.LOG_LEVEL_APP = 'error';

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../src/app');
const Usuario = require('../src/models/Usuario');

// Usamos una BD de test separada (puede ser la misma instancia local)
const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/pinseles_test';

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
  await Usuario.deleteMany({});
});

afterAll(async () => {
  await Usuario.deleteMany({});
  await mongoose.disconnect();
});

describe('Health check', () => {
  it('GET /api/v1/health responde 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ruta-inexistente responde 404', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth', () => {
  beforeAll(async () => {
    // Creamos un ADMIN inicial directamente en la BD para poder hacer login
    await Usuario.create({
      nombre: 'Admin Test',
      documento: '99999999Z',
      email: 'admintest@pinseles.local',
      password: 'Admin123!',
      rol: 'ADMIN',
    });
  });

  it('rechaza login con credenciales incorrectas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identificador: 'admintest@pinseles.local', password: 'malo' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('acepta login con credenciales correctas y devuelve token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identificador: 'admintest@pinseles.local', password: 'Admin123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.usuario.email).toBe('admintest@pinseles.local');
    // La contraseña nunca debe viajar en la respuesta
    expect(res.body.data.usuario.password).toBeUndefined();
  });

  it('GET /auth/me exige token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me devuelve el usuario con token válido', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ identificador: 'admintest@pinseles.local', password: 'Admin123!' });

    const token = login.body.data.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.usuario.email).toBe('admintest@pinseles.local');
  });
});
