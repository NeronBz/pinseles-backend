const Usuario = require('../models/Usuario');
const logger = require('./logger');

let messaging = null;

function getMessaging() {
  if (messaging) return messaging;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) return null;

  try {
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    logger.info('Firebase Admin SDK inicializado');
  } catch (err) {
    logger.error('Error al inicializar Firebase Admin:', err.message);
  }
  return messaging;
}

async function enviarNotificacion({ tokens, titulo, cuerpo, data = {} }) {
  const msg = getMessaging();
  if (!msg || !tokens?.length) return;

  const validTokens = tokens.filter(Boolean);
  if (!validTokens.length) return;

  const dataStr = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  try {
    const result = await msg.sendEachForMulticast({
      notification: { title: titulo, body: cuerpo },
      data: dataStr,
      tokens: validTokens,
    });
    if (result.failureCount > 0) {
      logger.warn(`FCM: ${result.successCount} ok, ${result.failureCount} fallidos`);
    }
  } catch (err) {
    logger.error('FCM envío error:', err.message);
  }
}

async function tokensPorRol(...roles) {
  const usuarios = await Usuario.find({
    rol: { $in: roles },
    activo: true,
    fcmToken: { $exists: true, $ne: null },
  }).select('+fcmToken');
  return usuarios.map((u) => u.fcmToken).filter(Boolean);
}

async function tokenDeUsuario(usuarioId) {
  const u = await Usuario.findById(usuarioId).select('+fcmToken');
  return u?.fcmToken || null;
}

module.exports = { enviarNotificacion, tokensPorRol, tokenDeUsuario };
