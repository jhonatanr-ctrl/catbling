// Extracción de texto (PDF / DOCX / TXT) con validación REAL del contenido
// (firma de archivo), no sólo de la extensión.
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import JSZip from 'jszip';

export class ExtractError extends Error { constructor(codigo) { super(codigo); this.codigo = codigo; } }

export function normalizarTexto(t) {
  return String(t)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function conTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new ExtractError('tiempo_agotado')), ms); })])
    .finally(() => clearTimeout(t));
}

function extraerTxt(buf) {
  if (buf.includes(0)) throw new ExtractError('archivo_corrupto'); // binario disfrazado de .txt
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buf); // .txt antiguos en Latin-1
  }
}

async function extraerDocx(buf) {
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new ExtractError('archivo_corrupto');
  let zip;
  try { zip = await JSZip.loadAsync(buf); } catch { throw new ExtractError('archivo_corrupto'); }
  if (!zip.file('word/document.xml')) throw new ExtractError('archivo_corrupto');
  // Defensa contra "zip bombs": tamaño total descomprimido declarado.
  let total = 0;
  zip.forEach((_, f) => { total += (f._data && f._data.uncompressedSize) || 0; });
  if (total > 60 * 1024 * 1024) throw new ExtractError('archivo_corrupto');
  try {
    const r = await mammoth.extractRawText({ buffer: buf });
    return r.value || '';
  } catch { throw new ExtractError('archivo_corrupto'); }
}

async function extraerPdf(buf, maxPages) {
  const head = buf.subarray(0, 1024).toString('latin1');
  if (!head.includes('%PDF-')) throw new ExtractError('archivo_corrupto');
  let pdf;
  try { pdf = await getDocumentProxy(new Uint8Array(buf)); }
  catch (e) {
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))) throw new ExtractError('pdf_protegido');
    throw new ExtractError('archivo_corrupto');
  }
  if (pdf.numPages > maxPages) throw new ExtractError('demasiadas_paginas');
  let r;
  try { r = await extractText(pdf, { mergePages: false }); } catch { throw new ExtractError('archivo_corrupto'); }
  const paginas = Array.isArray(r.text) ? r.text : [String(r.text || '')];
  const texto = paginas.map((p, i) => `[Página ${i + 1}]\n${p}`).join('\n\n');
  return { texto, paginas: pdf.numPages };
}

/** @returns {{texto:string, paginas:number|null}} */
export async function extraer(buf, formato, cfg) {
  if (!buf || buf.length === 0) throw new ExtractError('archivo_vacio');
  if (buf.length > cfg.maxFileBytes) throw new ExtractError('archivo_demasiado_grande');
  let texto, paginas = null;
  const trabajo = (async () => {
    if (formato === 'txt') texto = extraerTxt(buf);
    else if (formato === 'docx') texto = await extraerDocx(buf);
    else if (formato === 'pdf') ({ texto, paginas } = await extraerPdf(buf, cfg.maxPages));
    else throw new ExtractError('formato_no_soportado');
  })();
  await conTimeout(trabajo, 25000);
  texto = normalizarTexto(texto);
  // Un PDF escaneado (sin capa de texto) sólo deja los marcadores "[Página N]".
  const sinMarcas = texto.replace(/\[Página \d+\]/g, '').trim();
  if (sinMarcas.length < 50) throw new ExtractError('sin_texto_extraible');
  if (sinMarcas.length < cfg.minTextChars) throw new ExtractError('texto_insuficiente');
  if (texto.length > cfg.maxTextChars) throw new ExtractError('texto_demasiado_largo');
  return { texto, paginas };
}
