// config.js
import dotenv from 'dotenv';
dotenv.config();

/**
 * Toma process.env y retorna un objeto con:
 * - strings para las claves no numéricas
 * - numbers para las que sean numéricas
 */
function getConfig() {
  const raw = process.env;
  const cfg = {};

  for (const key of Object.keys(raw)) {
    const val = raw[key];

    // si es un número entero válido, convertir a Number
    if (/^-?\d+$/.test(val)) {
      cfg[key] = Number(val);
    }
    else {
      // dejar como string
      cfg[key] = val;
    }
  }

  // opción: parsear bin en array
 /*  if (typeof cfg.bin === 'string') {
    cfg.bin = cfg.bin.split(',').map(s => s.trim());
  } */

  return cfg;
}

export { getConfig};
