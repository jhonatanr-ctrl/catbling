import { createClient } from '@supabase/supabase-js';
import { getConfig } from './env.js';

export class ApiError extends Error {
  constructor(status, codigo, extra) { super(codigo); this.status = status; this.codigo = codigo; this.extra = extra || {}; }
}

export function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 16 * 1024) throw new ApiError(413, 'peticion_demasiado_grande'); chunks.push(c); }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw new ApiError(400, 'json_invalido'); }
}

let _admin = null;
export function admin() {
  const cfg = getConfig();
  if (!cfg.supabaseUrl || !cfg.serviceRoleKey) throw new ApiError(500, 'servidor_no_configurado');
  if (!_admin) _admin = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}
export function _resetAdminForTests() { _admin = null; }

// Verifica el JWT de Supabase contra el servidor de Auth (no se confía en el cliente).
export async function autenticar(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) throw new ApiError(401, 'no_autenticado');
  const { data, error } = await admin().auth.getUser(m[1].trim());
  if (error || !data?.user?.id) throw new ApiError(401, 'no_autenticado');
  return data.user;
}

export async function rpc(nombre, args) {
  const { data, error } = await admin().rpc(nombre, args);
  if (error) { console.error('[api] rpc', nombre, error.code, error.message); throw new ApiError(500, 'error_interno'); }
  return data;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function manejar(handler, metodo = 'POST') {
  return async function (req, res) {
    try {
      if (req.method !== metodo) { res.setHeader('Allow', metodo); return send(res, 405, { ok: false, codigo: 'metodo_no_permitido' }); }
      await handler(req, res);
    } catch (e) {
      if (e instanceof ApiError) return send(res, e.status, { ok: false, codigo: e.codigo, ...e.extra });
      console.error('[api] error no controlado:', e && e.message);
      return send(res, 500, { ok: false, codigo: 'error_interno' });
    }
  };
}
