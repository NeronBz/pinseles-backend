# pinseles-backend

Backend del proyecto PIN-SELES, desarrollado como TFG de 2º DAM en el IES Augustóbriga.

Es una API REST en Node.js con Express y MongoDB. Gestiona los permisos de trabajo con riesgo de incendio (PTRI), el fichaje del personal y los usuarios de la aplicación. Está desplegado en Render.com y la app Android se conecta directamente a él.

TFG -- 2º DAM, IES Augustóbriga, curso 2025-2026
Raúl Blázquez Ibáñez y Mauro Serrano Hevia

## Lo que hace

El núcleo de la aplicación es el ciclo de vida de los permisos PTRI:

PENDIENTE -> EVALUADO (bombero PCI) -> AUTORIZADO (jefe de turno) -> EN_EJECUCION -> COMPLETADO

Desde cualquier estado activo se puede ANULAR, y desde EVALUADO el jefe también puede RECHAZAR.

Hay cuatro roles:
- SOLICITANTE: crea permisos y puede anular o borrar los suyos cuando ya están terminados
- BOMBERO: evalúa permisos pendientes, los implanta y los cierra
- JEFE: autoriza o rechaza los permisos evaluados, ve el historial completo
- ADMIN: puede hacer todo lo anterior

Además del sistema de permisos, hay un módulo de fichaje con GPS (entrada/salida con coordenadas), gestión de usuarios e inventario de herramientas.

Al crear un PTRI el solicitante elige el tipo de trabajo (soldadura, corte radial, etc.) y la app muestra las herramientas del inventario relacionadas con esos tipos para que marque cuáles va a usar. Esas herramientas quedan registradas en el permiso.

La selección de zona se hace sobre un mapa digitalizado de la central nuclear: hay botones posicionados sobre el plano que se ponen en rojo si ya hay un permiso activo en esa zona.

## Requisitos

- Node.js 18 o superior
- MongoDB (local o Atlas)

## Puesta en marcha

Instalar dependencias:

```bash
npm install
```

Copiar el fichero de entorno y editarlo:

```bash
cp .env.example .env
```

Lo mínimo que hay que cambiar en el .env:

- `MONGO_URI`: cadena de conexión a MongoDB. Si es local: `mongodb://localhost:27017/pinseles`. Si es Atlas: `mongodb+srv://usuario:password@cluster.mongodb.net/pinseles`
- `JWT_SECRET`: una cadena larga y aleatoria. Se puede generar con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Poblar la base de datos con usuarios de prueba:

```bash
npm run seed
```

Arrancar el servidor:

```bash
# Desarrollo (recarga automática)
npm run dev

# Producción
npm start
```

El servidor arranca en el puerto 3000. La URL base de la API es `http://localhost:3000/api/v1`.

## Usuarios de prueba

El seeder crea estos usuarios para poder probar la app:

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | raul@pinseles.local | Raul1234! |
| ADMIN | mauro@pinseles.local | Mauro123! |
| JEFE | jefe@pinseles.local | Jefe1234! |
| BOMBERO | bombero@pinseles.local | Bombero123! |
| SOLICITANTE | solicitante@pinseles.local | Solicit123! |

Son solo para desarrollo, no usar en producción.

## Endpoints principales

Todos los endpoints llevan el prefijo `/api/v1`. Las respuestas siempre tienen la forma `{ success, data }` o `{ success, error }`.

**Autenticación**

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | /auth/login | Login, devuelve JWT |
| GET | /auth/me | Datos del usuario autenticado |
| POST | /auth/fcm-token | Registrar token de notificaciones |

**Usuarios** (JEFE y ADMIN)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | /usuarios | Listar todos |
| POST | /usuarios | Crear usuario |
| PATCH | /usuarios/:id | Editar rol, cargo o estado activo |

**Permisos PTRI**

| Metodo | Ruta | Quien |
|---|---|---|
| GET | /permisos-operativos | autenticado |
| POST | /permisos-operativos | SOLICITANTE, ADMIN |
| POST | /permisos-operativos/:id/evaluar | BOMBERO, ADMIN |
| POST | /permisos-operativos/:id/autorizar | JEFE, ADMIN |
| POST | /permisos-operativos/:id/rechazar | JEFE, ADMIN |
| POST | /permisos-operativos/:id/implantar | BOMBERO, ADMIN |
| POST | /permisos-operativos/:id/cerrar | BOMBERO, ADMIN |
| POST | /permisos-operativos/:id/anular | SOLICITANTE (solo PENDIENTE), JEFE, ADMIN |
| DELETE | /permisos-operativos/:id | SOLICITANTE o ADMIN (solo estados terminales) |

**Fichaje**

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | /fichajes/entrada | Registrar entrada con coordenadas GPS |
| POST | /fichajes/salida | Cerrar el fichaje abierto |
| GET | /fichajes/mi-fichaje-abierto | Estado actual del usuario |
| GET | /fichajes | Historial |

**Inventario**

| Metodo | Ruta | Quien |
|---|---|---|
| GET | /inventario | autenticado (soporta ?tipos_trabajo=SOLDADURA_ELECTRICA,CORTE_RADIAL) |
| POST | /inventario | ADMIN |
| PATCH | /inventario/:id | ADMIN |
| DELETE | /inventario/:id | ADMIN (soft delete) |

## Estructura

```
src/
  app.js -- Express, middlewares y rutas
  config/ -- configuracion y conexion a MongoDB
  models/ -- esquemas Mongoose
  controllers/ -- logica de cada modulo
  routes/ -- endpoints y validaciones
  middleware/ -- auth JWT, manejo de errores
  utils/ -- helpers
  seeders/ -- datos de prueba
server.js -- arranque del servidor
```

## Despliegue

El backend esta desplegado en Render.com conectado a MongoDB Atlas. Para desplegarlo de nuevo basta con hacer push al repositorio, Render lo detecta y lo redespliega solo. Las variables de entorno se configuran en el panel de Render.
