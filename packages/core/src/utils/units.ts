import { AU, LIGHT_YEAR, PARSEC } from '../constants/physics.js';

export function auToMeters(au: number): number { return au * AU; }
export function metersToAU(m: number): number { return m / AU; }
export function lyToMeters(ly: number): number { return ly * LIGHT_YEAR; }
export function metersToLY(m: number): number { return m / LIGHT_YEAR; }
export function parsecToMeters(pc: number): number { return pc * PARSEC; }
export function kelvinToCelsius(k: number): number { return k - 273.15; }
export function celsiusToKelvin(c: number): number { return c + 273.15; }
