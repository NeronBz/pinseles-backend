function ok(res, data, statusCode = 200, meta = null) {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function created(res, data) {
  return ok(res, data, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, message, statusCode = 400, details = null) {
  const payload = { success: false, error: message };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}

module.exports = { ok, created, noContent, fail };
