const PermisoOperativo = require("../models/PermisoOperativo");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created } = require("../utils/responseHelper");
const {
  enviarNotificacion,
  tokensPorRol,
  tokenDeUsuario,
} = require("../utils/notifications");

const TRANSICIONES = {
  PENDIENTE: ["EVALUADO", "ANULADO"],
  EVALUADO: ["AUTORIZADO", "RECHAZADO"],
  AUTORIZADO: ["EN_EJECUCION", "ANULADO"],
  EN_EJECUCION: ["COMPLETADO", "ANULADO"],
  RECHAZADO: [],
  COMPLETADO: [],
  ANULADO: [],
};

function validarTransicion(actual, nuevo) {
  if (!(TRANSICIONES[actual] || []).includes(nuevo)) {
    throw new AppError(`Transición no válida: ${actual} → ${nuevo}`, 400);
  }
}

const esAdmin = (rol) => rol === "ADMIN";
const esJefe = (rol) => rol === "JEFE";
const esBombero = (rol) => rol === "BOMBERO";

const POPULATE_BASE = [
  { path: "solicitante", select: "nombre email documento" },
  { path: "evaluado_por", select: "nombre email" },
  { path: "autorizado_por", select: "nombre email" },
  { path: "implantado_por", select: "nombre email" },
  { path: "cerrado_por", select: "nombre email" },
  { path: "herramientas", select: "codigo descripcion categoria estado" },
];

//GET /permisos-operativos

exports.listar = asyncHandler(async (req, res) => {
  const { rol, id } = req.user;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const todos = req.query.todos === "true";

  const filtro = {};

  if (rol === "SOLICITANTE") {
    filtro.solicitante = id;
  } else if (esBombero(rol)) {
    filtro.estado = { $in: ["PENDIENTE", "AUTORIZADO", "EN_EJECUCION"] };
  } else if (esJefe(rol)) {
    if (!todos) {
      filtro.estado = {
        $in: ["PENDIENTE", "EVALUADO", "AUTORIZADO", "EN_EJECUCION"],
      };
    }
  } else if (esAdmin(rol)) {
    // ADMIN ve todo, sin filtros por defecto
  }

  if (req.query.estado) filtro.estado = req.query.estado;

  const [permisos, total] = await Promise.all([
    PermisoOperativo.find(filtro)
      .populate(POPULATE_BASE)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PermisoOperativo.countDocuments(filtro),
  ]);

  return ok(res, permisos, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

//GET /permisos-operativos/:id

exports.obtener = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id)
    .populate(POPULATE_BASE)
    .populate("historico.usuario", "nombre email");

  if (!permiso) throw new AppError("Permiso no encontrado", 404);

  const { rol, id } = req.user;
  if (rol === "SOLICITANTE" && permiso.solicitante._id.toString() !== id) {
    throw new AppError("Sin permisos para ver este recurso", 403);
  }

  return ok(res, permiso);
});

//POST /permisos-operativos -- SOLICITANTE o ADMIN

exports.crear = asyncHandler(async (req, res) => {
  if (req.user.rol !== "SOLICITANTE" && !esAdmin(req.user.rol)) {
    throw new AppError(
      "Solo el solicitante o un administrador puede abrir un PTRI",
      403,
    );
  }

  const {
    edificio,
    cota,
    zona_fuego,
    periodo_validez,
    tipos_trabajo,
    desplazamiento_multiple,
    descripcion_trabajo,
    responsable_solicitante,
    zona_controlada,
    herramientas,
  } = req.body;

  const permiso = await PermisoOperativo.create({
    edificio,
    cota,
    zona_fuego,
    periodo_validez,
    tipos_trabajo: tipos_trabajo || [],
    desplazamiento_multiple: !!desplazamiento_multiple,
    descripcion_trabajo,
    responsable_solicitante,
    zona_controlada: !!zona_controlada,
    herramientas: herramientas || [],
    solicitante: req.user.id,
    estado: "PENDIENTE",
    historico: [
      {
        estadoAnterior: null,
        estadoNuevo: "PENDIENTE",
        usuario: req.user.id,
        motivo: "PTRI abierto",
      },
    ],
  });
  await permiso.populate(POPULATE_BASE);

  tokensPorRol("BOMBERO", "ADMIN")
    .then((tokens) =>
      enviarNotificacion({
        tokens,
        titulo: "Nuevo PTRI pendiente",
        cuerpo: `${permiso.edificio} -- ${permiso.descripcion_trabajo || "Permiso de trabajo abierto"}`,
        data: { permisoId: permiso._id.toString(), tipo: "NUEVO_PTRI" },
      }),
    )
    .catch(() => {});

  return created(res, permiso);
});

//POST /:id/evaluar -- BOMBERO o ADMIN

exports.evaluar = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id);
  if (!permiso) throw new AppError("Permiso no encontrado", 404);
  validarTransicion(permiso.estado, "EVALUADO");

  const { medidas_pci, medios_pci_zona, precauciones_especiales } = req.body;

  permiso.medidas_pci = medidas_pci || [];
  permiso.medios_pci_zona = medios_pci_zona || "";
  permiso.precauciones_especiales = precauciones_especiales || "";
  permiso.evaluado_por = req.user.id;
  permiso.fecha_evaluacion = new Date();
  permiso.estado = "EVALUADO";
  permiso.historico.push({
    estadoAnterior: "PENDIENTE",
    estadoNuevo: "EVALUADO",
    usuario: req.user.id,
    motivo: "Evaluación PCI completada",
  });

  await permiso.save();
  await permiso.populate(POPULATE_BASE);

  tokensPorRol("JEFE", "ADMIN")
    .then((tokens) =>
      enviarNotificacion({
        tokens,
        titulo: "PTRI evaluado -- pendiente de autorización",
        cuerpo: `${permiso.edificio} -- evaluado por PCI. Requiere autorización.`,
        data: { permisoId: permiso._id.toString(), tipo: "PTRI_EVALUADO" },
      }),
    )
    .catch(() => {});

  return ok(res, permiso);
});

//POST /:id/autorizar -- JEFE o ADMIN

exports.autorizar = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id);
  if (!permiso) throw new AppError("Permiso no encontrado", 404);
  validarTransicion(permiso.estado, "AUTORIZADO");

  permiso.autorizado_por = req.user.id;
  permiso.fecha_autorizacion = new Date();
  permiso.estado = "AUTORIZADO";
  permiso.historico.push({
    estadoAnterior: "EVALUADO",
    estadoNuevo: "AUTORIZADO",
    usuario: req.user.id,
    motivo: req.body.motivo || "Autorizado",
  });

  await permiso.save();
  await permiso.populate(POPULATE_BASE);

  tokensPorRol("BOMBERO", "ADMIN")
    .then((tokens) =>
      enviarNotificacion({
        tokens,
        titulo: "PTRI autorizado",
        cuerpo: `${permiso.edificio} -- autorizado. Ya puedes proceder a implantar.`,
        data: { permisoId: permiso._id.toString(), tipo: "PTRI_AUTORIZADO" },
      }),
    )
    .catch(() => {});

  return ok(res, permiso);
});

//POST /:id/rechazar -- JEFE o ADMIN

exports.rechazar = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id);
  if (!permiso) throw new AppError("Permiso no encontrado", 404);
  validarTransicion(permiso.estado, "RECHAZADO");

  permiso.autorizado_por = req.user.id;
  permiso.motivo_rechazo = req.body.motivo || "";
  permiso.estado = "RECHAZADO";
  permiso.historico.push({
    estadoAnterior: "EVALUADO",
    estadoNuevo: "RECHAZADO",
    usuario: req.user.id,
    motivo: req.body.motivo || "",
  });

  await permiso.save();
  await permiso.populate(POPULATE_BASE);

  tokenDeUsuario(permiso.solicitante)
    .then(
      (token) =>
        token &&
        enviarNotificacion({
          tokens: [token],
          titulo: "PTRI rechazado",
          cuerpo: `${permiso.edificio} -- ha sido rechazado. Motivo: ${permiso.motivo_rechazo || "no especificado"}`,
          data: { permisoId: permiso._id.toString(), tipo: "PTRI_RECHAZADO" },
        }),
    )
    .catch(() => {});

  return ok(res, permiso);
});

//POST /:id/implantar -- BOMBERO o ADMIN

exports.implantar = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id);
  if (!permiso) throw new AppError("Permiso no encontrado", 404);
  validarTransicion(permiso.estado, "EN_EJECUCION");

  permiso.extintor = req.body.extintor || "";
  permiso.inspeccion_inicial = !!req.body.inspeccion_inicial;
  permiso.aviso_sala_control_inicio = !!req.body.aviso_sala_control_inicio;
  permiso.implantado_por = req.user.id;
  permiso.fecha_implantacion = new Date();
  permiso.estado = "EN_EJECUCION";
  permiso.historico.push({
    estadoAnterior: "AUTORIZADO",
    estadoNuevo: "EN_EJECUCION",
    usuario: req.user.id,
    motivo: "Trabajo implantado",
  });

  await permiso.save();
  await permiso.populate(POPULATE_BASE);
  return ok(res, permiso);
});

//POST /:id/cerrar -- BOMBERO o ADMIN

exports.cerrar = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id);
  if (!permiso) throw new AppError("Permiso no encontrado", 404);
  validarTransicion(permiso.estado, "COMPLETADO");

  permiso.inspeccion_final = !!req.body.inspeccion_final;
  permiso.aviso_sala_control_cierre = !!req.body.aviso_sala_control_cierre;
  permiso.no_se_realiza = !!req.body.no_se_realiza;
  permiso.observaciones_cierre = req.body.observaciones_cierre || "";
  permiso.cerrado_por = req.user.id;
  permiso.fecha_cierre = new Date();
  permiso.estado = "COMPLETADO";
  permiso.historico.push({
    estadoAnterior: "EN_EJECUCION",
    estadoNuevo: "COMPLETADO",
    usuario: req.user.id,
    motivo: "PTRI cerrado",
  });

  await permiso.save();
  await permiso.populate(POPULATE_BASE);

  tokenDeUsuario(permiso.solicitante)
    .then(
      (token) =>
        token &&
        enviarNotificacion({
          tokens: [token],
          titulo: "PTRI completado",
          cuerpo: `${permiso.edificio} -- el trabajo ha finalizado correctamente.`,
          data: { permisoId: permiso._id.toString(), tipo: "PTRI_COMPLETADO" },
        }),
    )
    .catch(() => {});

  return ok(res, permiso);
});

//DELETE /:id -- SOLICITANTE propietario (solo COMPLETADO, RECHAZADO, ANULADO)

exports.eliminar = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id);
  if (!permiso) throw new AppError("Permiso no encontrado", 404);

  const esPropietario = permiso.solicitante.toString() === req.user.id;
  if (!esPropietario && !esAdmin(req.user.rol)) {
    throw new AppError("Sin permisos para eliminar este permiso", 403);
  }

  const estadosEliminables = ["COMPLETADO", "RECHAZADO", "ANULADO"];
  if (!estadosEliminables.includes(permiso.estado)) {
    throw new AppError(
      "Solo se pueden eliminar permisos completados, rechazados o anulados",
      400,
    );
  }

  await PermisoOperativo.findByIdAndDelete(req.params.id);
  return ok(res, { eliminado: true });
});

//POST /:id/anular -- JEFE, ADMIN o propietario SOLICITANTE

exports.anular = asyncHandler(async (req, res) => {
  const permiso = await PermisoOperativo.findById(req.params.id);
  if (!permiso) throw new AppError("Permiso no encontrado", 404);

  const esPropietario = permiso.solicitante.toString() === req.user.id;
  if (!esJefe(req.user.rol) && !esAdmin(req.user.rol) && !esPropietario) {
    throw new AppError("Sin permisos para anular este permiso", 403);
  }
  validarTransicion(permiso.estado, "ANULADO");

  const estadoAnterior = permiso.estado;
  permiso.estado = "ANULADO";
  permiso.historico.push({
    estadoAnterior,
    estadoNuevo: "ANULADO",
    usuario: req.user.id,
    motivo: req.body.motivo || "Anulado",
  });

  await permiso.save();
  await permiso.populate(POPULATE_BASE);
  return ok(res, permiso);
});
