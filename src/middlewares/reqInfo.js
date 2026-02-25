import { ulid } from 'ulid';

function redactHeaders(headers) {
  const redactedKeys = new Set([
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-forwarded-authorization',
  ]);

  const safe = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (redactedKeys.has(String(key).toLowerCase())) {
      safe[key] = '[REDACTED]';
      continue;
    }

    // Avoid huge header values in logs
    const str = Array.isArray(value) ? value.join(',') : String(value);
    safe[key] = str.length > 2048 ? `${str.slice(0, 2048)}...` : str;
  }
  return safe;
}

function reqInfoMiddleware(req, res, next) {
  req.info = {
    id: ulid(),
    headers: redactHeaders(req.headers),
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  };

  return next();
}

export default reqInfoMiddleware;
