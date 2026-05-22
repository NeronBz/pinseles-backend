require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../utils/logger');

const Usuario = require('../models/Usuario');
const ElementoInventario = require('../models/ElementoInventario');
const PermisoOperativo = require('../models/PermisoOperativo');
const Fichaje = require('../models/Fichaje');

const reset = process.argv.includes('--reset');

async function seed() {
  await connectDB();
  logger.info('== SEEDER PIN-SELES ==');

  if (reset) {
    logger.warn('--reset: eliminando datos...');
    await Promise.all([
      Usuario.deleteMany({}),
      ElementoInventario.deleteMany({}),
      PermisoOperativo.deleteMany({}),
      Fichaje.deleteMany({}),
    ]);
  }

  // Usuarios
  const semillaUsuarios = [
    // ADMIN (acceso total — Raúl y Mauro)
    { nombre: 'Raúl Blázquez Ibáñez',  documento: '22222222C', email: 'raul@pinseles.local',          password: 'Raul1234!',   telefono: '600000002', rol: 'ADMIN',      cargo: 'Desarrollador / Supervisor' },
    { nombre: 'Mauro Serrano Hevia',    documento: '11111111B', email: 'mauro@pinseles.local',         password: 'Mauro123!',   telefono: '600000001', rol: 'ADMIN',      cargo: 'Desarrollador / Supervisor' },
    // JEFE (Jefe de Turno — autoriza permisos y gestiona usuarios)
    { nombre: 'Jefe de Turno',          documento: '00000000A', email: 'jefe@pinseles.local',          password: 'Jefe1234!',   telefono: '600000000', rol: 'JEFE',       cargo: 'Jefe de Turno PCI' },
    // BOMBEROS (3)
    { nombre: 'Bombero PCI-EC 1',       documento: '33333333D', email: 'bombero@pinseles.local',       password: 'Bombero123!', telefono: '600000003', rol: 'BOMBERO',    cargo: 'Bombero PCI-EC 1ª' },
    { nombre: 'Carlos Martínez (PCI)',  documento: '44444444E', email: 'bombero2@pinseles.local',      password: 'Bombero123!', telefono: '600000004', rol: 'BOMBERO',    cargo: 'Bombero PCI-EC 2ª' },
    { nombre: 'Luis Fernández (PCI)',   documento: '55555555F', email: 'bombero3@pinseles.local',      password: 'Bombero123!', telefono: '600000005', rol: 'BOMBERO',    cargo: 'Bombero PCI-EC Auxiliar' },
    // SOLICITANTES (5)
    { nombre: 'Empresa Contratista SA', documento: '66666666G', email: 'solicitante@pinseles.local',  password: 'Solicit123!', telefono: '600000006', rol: 'SOLICITANTE', cargo: 'Técnico Contratista' },
    { nombre: 'Técnico Mantenimiento',  documento: '77777777H', email: 'tecnico@pinseles.local',       password: 'Tecnico123!', telefono: '600000007', rol: 'SOLICITANTE', cargo: 'Técnico de Mantenimiento' },
    { nombre: 'Contratista Obras SL',   documento: '88888888I', email: 'contratista@pinseles.local',  password: 'Contract123!',telefono: '600000008', rol: 'SOLICITANTE', cargo: 'Jefe de Obra' },
    { nombre: 'Instalaciones Técnicas', documento: '99999999J', email: 'contratista2@pinseles.local', password: 'Contract123!',telefono: '600000009', rol: 'SOLICITANTE', cargo: 'Técnico Instalaciones' },
    { nombre: 'Servicios Industriales', documento: '10101010K', email: 'contratista3@pinseles.local', password: 'Contract123!',telefono: '600000010', rol: 'SOLICITANTE', cargo: 'Operario Especialista' },
  ];

  const usuarios = {};
  for (const data of semillaUsuarios) {
    let u = await Usuario.findOne({ email: data.email });
    if (!u) {
      u = await Usuario.create(data);
      logger.info(`Usuario creado: ${data.email} (${data.rol})`);
    } else {
      logger.info(`Usuario ya existe: ${data.email}`);
    }
    usuarios[data.email] = u;
  }

  const solicitante = usuarios['solicitante@pinseles.local'];
  const bombero     = usuarios['bombero@pinseles.local'];
  const jefe        = usuarios['jefe@pinseles.local'];

  // Inventario
  const elementosSemilla = [
    {
      codigo: 'EQ-001', descripcion: 'Manguera DN45 20m', categoria: 'Extinción',
      ubicacion: 'Almacén A', cantidad: 4,
      tipos_trabajo: ['SOLDADURA_ELECTRICA', 'SOLDADURA_TIG', 'CORTE_RADIAL', 'LANZA_TERMICA', 'CORTE_SOPLETE', 'DISTENSIONADO', 'OTROS'],
    },
    {
      codigo: 'EQ-002', descripcion: 'Casco de bombero', categoria: 'EPI',
      ubicacion: 'Vestuario', cantidad: 15,
      tipos_trabajo: ['SOLDADURA_ELECTRICA', 'SOLDADURA_TIG', 'CORTE_RADIAL', 'LANZA_TERMICA', 'CORTE_SOPLETE', 'DISTENSIONADO', 'OTROS'],
    },
    {
      codigo: 'EQ-003', descripcion: 'Traje ignífugo talla L', categoria: 'EPI',
      ubicacion: 'Vestuario', cantidad: 10,
      tipos_trabajo: ['SOLDADURA_ELECTRICA', 'SOLDADURA_TIG', 'CORTE_RADIAL', 'LANZA_TERMICA', 'CORTE_SOPLETE'],
    },
    {
      codigo: 'EQ-004', descripcion: 'Cilindro SCBA 10L', categoria: 'Respiración',
      ubicacion: 'Almacén A', cantidad: 8,
      tipos_trabajo: ['SOLDADURA_ELECTRICA', 'SOLDADURA_TIG', 'LANZA_TERMICA', 'CORTE_SOPLETE', 'DISTENSIONADO'],
    },
    {
      codigo: 'EQ-005', descripcion: 'Detector gases portátil', categoria: 'Medición',
      ubicacion: 'Taller', estado: 'MANTENIMIENTO',
      tipos_trabajo: ['SOLDADURA_TIG', 'CORTE_SOPLETE', 'LANZA_TERMICA', 'OTROS'],
    },
    {
      codigo: 'EQ-006', descripcion: 'Extintor CO₂ 5kg', categoria: 'Extinción',
      ubicacion: 'Almacén B', cantidad: 20,
      tipos_trabajo: ['SOLDADURA_ELECTRICA', 'SOLDADURA_TIG', 'CORTE_RADIAL', 'LANZA_TERMICA', 'CORTE_SOPLETE'],
    },
    {
      codigo: 'EQ-007', descripcion: 'Linterna antideflagrante', categoria: 'Iluminación',
      ubicacion: 'Almacén B', cantidad: 12,
      tipos_trabajo: ['DISTENSIONADO', 'LANZA_TERMICA', 'OTROS'],
    },
    {
      codigo: 'EQ-008', descripcion: 'Dosímetro personal TLD', categoria: 'Radiación',
      ubicacion: 'Sala control', cantidad: 25,
      tipos_trabajo: ['SOLDADURA_ELECTRICA', 'SOLDADURA_TIG', 'CORTE_RADIAL', 'OTROS'],
    },
  ];

  for (const data of elementosSemilla) {
    const { codigo, ...campos } = data;
    await ElementoInventario.findOneAndUpdate(
      { codigo },
      { $set: campos },
      { upsert: true, new: true }
    );
    logger.info(`Inventario actualizado: ${codigo}`);
  }

  // PTRIs demo
  async function crearSiNoExiste(filtro, datos) {
    if (!(await PermisoOperativo.findOne(filtro))) {
      await PermisoOperativo.create(datos);
      logger.info(`PTRI creado: ${datos.estado} — ${datos.edificio}`);
    }
  }

  await crearSiNoExiste(
    { edificio: 'Turbina', estado: 'PENDIENTE' },
    {
      edificio: 'Turbina', cota: '0100', zona_fuego: 'ZF-T2', periodo_validez: 'DIARIO',
      tipos_trabajo: ['SOLDADURA_ELECTRICA', 'CORTE_RADIAL'],
      descripcion_trabajo: 'Corte de soporte en desforre de turbina 2',
      responsable_solicitante: 'J. García (Contratista)', zona_controlada: false,
      solicitante: solicitante._id, estado: 'PENDIENTE',
      historico: [{ estadoAnterior: null, estadoNuevo: 'PENDIENTE', usuario: solicitante._id, motivo: 'PTRI abierto' }],
    }
  );

  await crearSiNoExiste(
    { edificio: 'Reactor', estado: 'EVALUADO' },
    {
      edificio: 'Reactor', cota: '0050', zona_fuego: 'ZF-R1',
      tipos_trabajo: ['SOLDADURA_TIG'],
      descripcion_trabajo: 'Soldadura en circuito secundario',
      responsable_solicitante: 'M. López (Mantenimiento)', zona_controlada: true,
      solicitante: solicitante._id, evaluado_por: bombero._id, fecha_evaluacion: new Date(),
      medidas_pci: ['RETIRAR_COMBUSTIBLE', 'APANTALLAR_IGNIFUGO', 'VIGILANCIA_CONTINUA'],
      medios_pci_zona: 'Extintor CO₂ 5kg, manguera DN25',
      precauciones_especiales: 'Zona radiológica — dosímetros obligatorios',
      estado: 'EVALUADO',
      historico: [
        { estadoAnterior: null,        estadoNuevo: 'PENDIENTE', usuario: solicitante._id, motivo: 'PTRI abierto' },
        { estadoAnterior: 'PENDIENTE', estadoNuevo: 'EVALUADO',  usuario: bombero._id,    motivo: 'Evaluación PCI completada' },
      ],
    }
  );

  await crearSiNoExiste(
    { edificio: 'Almacén auxiliar', estado: 'AUTORIZADO' },
    {
      edificio: 'Almacén auxiliar', cota: '0000',
      tipos_trabajo: ['CORTE_SOPLETE'],
      descripcion_trabajo: 'Corte de tubería obsoleta',
      responsable_solicitante: 'P. Ruiz (Obras)', zona_controlada: false,
      solicitante: solicitante._id,
      evaluado_por: bombero._id, fecha_evaluacion: new Date(),
      medidas_pci: ['RETIRAR_COMBUSTIBLE', 'MANTENER_LIMPIO'],
      autorizado_por: jefe._id, fecha_autorizacion: new Date(),
      estado: 'AUTORIZADO',
      historico: [
        { estadoAnterior: null,        estadoNuevo: 'PENDIENTE',  usuario: solicitante._id, motivo: 'PTRI abierto' },
        { estadoAnterior: 'PENDIENTE', estadoNuevo: 'EVALUADO',   usuario: bombero._id,    motivo: 'Evaluación OK' },
        { estadoAnterior: 'EVALUADO',  estadoNuevo: 'AUTORIZADO', usuario: jefe._id,       motivo: 'Autorizado Jefe de Turno' },
      ],
    }
  );

  await crearSiNoExiste(
    { edificio: 'Sala Eléctrica', estado: 'COMPLETADO' },
    {
      edificio: 'Sala Eléctrica', cota: '0025',
      tipos_trabajo: ['SOLDADURA_ELECTRICA'],
      descripcion_trabajo: 'Sustitución interruptor cuadro CC-12',
      responsable_solicitante: 'R. Fernández (Eléctrica)', zona_controlada: false,
      solicitante: solicitante._id,
      evaluado_por: bombero._id, fecha_evaluacion: new Date(Date.now() - 3600000),
      medidas_pci: ['RETIRAR_COMBUSTIBLE', 'AVISAR_PCI_FINALIZAR'],
      autorizado_por: jefe._id, fecha_autorizacion: new Date(Date.now() - 3600000),
      implantado_por: bombero._id, fecha_implantacion: new Date(Date.now() - 1800000),
      inspeccion_inicial: true, aviso_sala_control_inicio: true, extintor: 'CO₂-5kg junto cuadro',
      cerrado_por: bombero._id, fecha_cierre: new Date(),
      inspeccion_final: true, aviso_sala_control_cierre: true,
      observaciones_cierre: 'Trabajo finalizado sin incidencias',
      estado: 'COMPLETADO',
      historico: [
        { estadoAnterior: null,           estadoNuevo: 'PENDIENTE',    usuario: solicitante._id, motivo: 'PTRI abierto' },
        { estadoAnterior: 'PENDIENTE',    estadoNuevo: 'EVALUADO',     usuario: bombero._id,    motivo: 'Evaluación OK' },
        { estadoAnterior: 'EVALUADO',     estadoNuevo: 'AUTORIZADO',   usuario: jefe._id,       motivo: 'Autorizado' },
        { estadoAnterior: 'AUTORIZADO',   estadoNuevo: 'EN_EJECUCION', usuario: bombero._id,    motivo: 'Implantado' },
        { estadoAnterior: 'EN_EJECUCION', estadoNuevo: 'COMPLETADO',   usuario: bombero._id,    motivo: 'Cerrado OK' },
      ],
    }
  );

  logger.info('');
  logger.info('=============================================');
  logger.info('CREDENCIALES:');
  logger.info('  ADMIN      : raul@pinseles.local    / Raul1234!');
  logger.info('  ADMIN      : mauro@pinseles.local   / Mauro123!');
  logger.info('  JEFE       : jefe@pinseles.local    / Jefe1234!');
  logger.info('  BOMBERO    : bombero@pinseles.local / Bombero123!');
  logger.info('  SOLICITANTE: solicitante@pinseles.local / Solicit123!');
  logger.info('=============================================');

  await mongoose.disconnect();
  logger.info('Seeder completado.');
  process.exit(0);
}

seed().catch((err) => { logger.error('Error en seeder:', err); process.exit(1); });
