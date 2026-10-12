import { ATTACHMENT_LIMITS, MAX_REPAIR_LINES, type CreateClaimRequest } from '../api/types';
import { parseAmount, todayIso } from '../lib/format';
import { normalizeVin, vinError } from '../lib/vin';

export interface RepairLine {
  key: string;
  description: string;
  mechanical: string;
  body: string;
  refinish: string;
  paints: string;
  parts: string;
}

export interface PickedFile {
  key: string;
  file: File;
  previewUrl: string | null;
}

export interface ClaimFormState {
  dealerCode: string;
  vin: string;
  loadNumber: string;
  dateOfDelivery: string;
  commonCarrierWaybill: string;
  authorizationNumNightDeliveries: string;
  lines: RepairLine[];
  files: PickedFile[];
}

export type FormErrors = Record<string, string>;

let keySeed = 0;
export const newKey = () => `k${++keySeed}`;

export const emptyLine = (): RepairLine => ({
  key: newKey(),
  description: '',
  mechanical: '',
  body: '',
  refinish: '',
  paints: '',
  parts: '',
});

export const emptyForm = (dealerCode = ''): ClaimFormState => ({
  dealerCode,
  vin: '',
  loadNumber: '',
  dateOfDelivery: '',
  commonCarrierWaybill: '',
  authorizationNumNightDeliveries: '',
  lines: [emptyLine()],
  files: [],
});

const HOURS_MAX = 9999.99;
const MONEY_MAX = 1_000_000;

function checkNumber(value: string, max: number, label: string): string | null {
  const n = parseAmount(value);
  if (Number.isNaN(n)) return `${label} must be a number.`;
  if (n < 0) return `${label} cannot be negative.`;
  if (n > max) return `${label} cannot exceed ${max.toLocaleString('en-US')}.`;
  if (Math.round(n * 100) !== n * 100) return `${label} allows at most 2 decimals.`;
  return null;
}

/** Client-side checks matching the API's validation rules, so dealers see problems before submitting. */
export function validate(form: ClaimFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.dealerCode) errors.dealerCode = 'Select the dealer reporting this claim.';

  const vin = vinError(form.vin);
  if (vin) errors.vin = vin;

  if (form.loadNumber.length > 12) errors.loadNumber = 'Load number allows up to 12 characters.';
  if (form.commonCarrierWaybill.length > 20) errors.commonCarrierWaybill = 'Waybill allows up to 20 characters.';
  if (form.authorizationNumNightDeliveries.length > 20)
    errors.authorizationNumNightDeliveries = 'Authorization number allows up to 20 characters.';
  if (form.dateOfDelivery && form.dateOfDelivery > todayIso()) errors.dateOfDelivery = 'Delivery date cannot be in the future.';

  if (form.lines.length === 0) errors.lines = 'Add at least one repair line.';
  if (form.lines.length > MAX_REPAIR_LINES) errors.lines = `A claim can have at most ${MAX_REPAIR_LINES} repair lines.`;

  form.lines.forEach((line, i) => {
    const p = `lines.${i}.`;
    const desc = line.description.trim();
    if (desc.length < 3) errors[`${p}description`] = 'Describe the repair and parts replaced (at least 3 characters).';
    else if (desc.length > 4000) errors[`${p}description`] = 'Description allows up to 4,000 characters.';

    const fields: [keyof RepairLine, number, string][] = [
      ['mechanical', HOURS_MAX, 'Mechanical labor hours'],
      ['body', HOURS_MAX, 'Body repair hours'],
      ['refinish', HOURS_MAX, 'Refinish hours'],
      ['paints', MONEY_MAX, 'Paints & materials'],
      ['parts', MONEY_MAX, 'Parts cost'],
    ];
    for (const [field, max, label] of fields) {
      const err = checkNumber(line[field], max, label);
      if (err) errors[`${p}${field}`] = err;
    }
  });

  if (form.files.length > ATTACHMENT_LIMITS.maxFilesPerClaim)
    errors.files = `A claim can have at most ${ATTACHMENT_LIMITS.maxFilesPerClaim} attachments.`;

  return errors;
}

export function toRequest(form: ClaimFormState): CreateClaimRequest {
  const text = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    dealerCode: form.dealerCode,
    vin: normalizeVin(form.vin),
    loadNumber: text(form.loadNumber),
    dateOfDelivery: form.dateOfDelivery || null,
    commonCarrierWaybill: text(form.commonCarrierWaybill),
    authorizationNumNightDeliveries: text(form.authorizationNumNightDeliveries),
    // Damage type is not reported by dealers, but the API requires the object; send it empty.
    damageType: { marineDamage: false, yardDamage: false, transitDamage: false, accessory: false, soaClaim: false, damageComment: null },
    descriptions: form.lines.map((l) => ({
      descriptionOfRepairAndPartsReplaced: l.description.trim(),
      mechanicalLaborHours: parseAmount(l.mechanical),
      bodyRepairLaborHours: parseAmount(l.body),
      refinishHours: parseAmount(l.refinish),
      paintsAndMaterials: parseAmount(l.paints),
      partsCost: parseAmount(l.parts),
    })),
  };
}

export interface LineTotals {
  laborHours: number;
  mechanical: number;
  bodyRefinish: number;
  paints: number;
  parts: number;
}

export function lineTotals(lines: RepairLine[]): LineTotals {
  const n = (v: string) => {
    const x = parseAmount(v);
    return Number.isFinite(x) ? x : 0;
  };
  const t = { laborHours: 0, mechanical: 0, bodyRefinish: 0, paints: 0, parts: 0 };
  for (const l of lines) {
    t.mechanical += n(l.mechanical);
    t.bodyRefinish += n(l.body) + n(l.refinish);
    t.paints += n(l.paints);
    t.parts += n(l.parts);
  }
  t.laborHours = t.mechanical + t.bodyRefinish;
  return t;
}

/** Checks a picked file against the API's allowed types and size limit. */
export function fileProblem(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!(ATTACHMENT_LIMITS.extensions as readonly string[]).includes(ext))
    return 'Only JPG, PNG, HEIC photos and PDF documents are accepted.';
  if (file.size === 0) return 'The file is empty.';
  if (file.size > ATTACHMENT_LIMITS.maxFileSizeMb * 1024 * 1024)
    return `Files must be ${ATTACHMENT_LIMITS.maxFileSizeMb} MB or smaller.`;
  return null;
}
