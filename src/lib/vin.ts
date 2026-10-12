// Same rules as SDC.Api VinValidator (ISO 3779 / North American check digit in position 9).

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

function transliterate(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  const map: Record<string, number> = {
    A: 1, J: 1,
    B: 2, K: 2, S: 2,
    C: 3, L: 3, T: 3,
    D: 4, M: 4, U: 4,
    E: 5, N: 5, V: 5,
    F: 6, W: 6,
    G: 7, P: 7, X: 7,
    H: 8, Y: 8,
    R: 9, Z: 9,
  };
  return map[c] ?? -1; // I, O, Q and anything else are invalid
}

export const normalizeVin = (vin: string) => vin.trim().toUpperCase();

/** Returns an error message, or null when the VIN is valid. */
export function vinError(raw: string): string | null {
  const vin = normalizeVin(raw);
  if (vin.length === 0) return 'VIN is required.';
  if (/[IOQ]/.test(vin)) return 'VINs never contain the letters I, O or Q.';
  if (!/^[A-Z0-9]*$/.test(vin)) return 'Use letters and numbers only.';
  if (vin.length !== 17) return `A VIN has 17 characters (${vin.length} entered).`;

  let sum = 0;
  for (let i = 0; i < 17; i++) sum += transliterate(vin[i]) * WEIGHTS[i];
  const remainder = sum % 11;
  const check = remainder === 10 ? 'X' : String(remainder);
  return vin[8] === check ? null : 'This VIN is not valid. Check it for typos.';
}
