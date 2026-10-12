import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, claimsApi } from '../api/claimsApi';
import type { DealerDto } from '../api/types';
import {
  emptyForm,
  toRequest,
  validate,
  type ClaimFormState,
  type FormErrors,
} from '../claim/claimForm';
import { todayIso } from '../lib/format';
import { normalizeVin } from '../lib/vin';
import { AttachmentPicker } from './AttachmentPicker';
import { Field, describedBy } from './Field';
import { RepairLines } from './RepairLines';

export interface SubmitInput {
  form: ClaimFormState;
  dealer: DealerDto;
}

interface Props {
  onSubmit: (input: SubmitInput) => Promise<void>;
  serverErrors: FormErrors;
  serverMessage: string | null;
}

export function ClaimFormPage({ onSubmit, serverErrors, serverMessage }: Props) {
  const [dealers, setDealers] = useState<DealerDto[] | null>(null);
  const [dealerError, setDealerError] = useState<string | null>(null);
  const [form, setForm] = useState<ClaimFormState>(() => emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    claimsApi
      .getMyDealers()
      .then((list) => {
        setDealers(list);
        if (list.length === 1) setForm((f) => ({ ...f, dealerCode: list[0].code }));
      })
      .catch((err: ApiError) => setDealerError(err.message));
  }, []);

  useEffect(() => setErrors((e) => ({ ...e, ...serverErrors })), [serverErrors]);

  // After the first submit attempt, re-validate as the dealer fixes fields.
  useEffect(() => {
    if (attempted) setErrors(validate(form));
  }, [form, attempted]);

  const set = <K extends keyof ClaimFormState>(key: K, value: ClaimFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], .field--invalid input')?.focus());
      return;
    }
    const dealer = dealers?.find((d) => d.code === form.dealerCode) ?? { code: form.dealerCode, name: null };
    setBusy(true);
    try {
      await onSubmit({ form, dealer });
    } finally {
      setBusy(false);
    }
  }

  const errorCount = Object.keys(errors).length;
  const req = toRequest(form);

  return (
    <form className="claim-form" onSubmit={handleSubmit} noValidate>
      <div className="page-intro">
        <h1>Report a transportation damage claim</h1>
        <p>
          Use this form to report vehicle damage found at delivery. Fields marked <span className="field__req">*</span> are
          required. SDC will email you when the claim's status changes.
        </p>
      </div>

      {serverMessage && (
        <div className="alert alert--error" role="alert">
          <strong>The claim was not submitted.</strong> {serverMessage}
        </div>
      )}
      {attempted && errorCount > 0 && (
        <div className="alert alert--error" role="alert">
          Please correct the {errorCount === 1 ? 'highlighted field' : `${errorCount} highlighted fields`} before submitting.
        </div>
      )}

      {/* ---------- 1. Dealer & vehicle ---------- */}
      <section className="card" aria-labelledby="sec-vehicle">
        <h2 id="sec-vehicle" className="card__title">
          <span className="step">1</span> Dealer &amp; vehicle
        </h2>

        <div className="grid grid--2">
          <Field id="dealerCode" label="Dealer" required error={errors.dealerCode ?? dealerError ?? undefined}>
            <select
              id="dealerCode"
              value={form.dealerCode}
              disabled={!dealers || dealers.length === 0}
              aria-invalid={!!errors.dealerCode}
              aria-describedby={describedBy('dealerCode', errors.dealerCode ?? dealerError ?? undefined)}
              onChange={(e) => set('dealerCode', e.target.value)}
            >
              {!dealers && !dealerError && <option value="">Loading your dealers…</option>}
              {dealers && dealers.length === 0 && <option value="">No dealers are assigned to your account</option>}
              {dealers && dealers.length > 1 && <option value="">Select a dealer</option>}
              {dealers?.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.name ?? 'Unknown dealer'}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="vin"
            label="VIN"
            required
            error={errors.vin}
            hint={`17 characters, found on the windshield or door jamb · ${normalizeVin(form.vin).length}/17`}
          >
            <input
              id="vin"
              className="mono"
              maxLength={17}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
              value={form.vin}
              aria-invalid={!!errors.vin}
              aria-describedby={describedBy('vin', errors.vin, true)}
              onChange={(e) => set('vin', e.target.value.toUpperCase().replace(/\s/g, ''))}
            />
          </Field>

          <Field id="loadNumber" label="Load number" error={errors.loadNumber} hint="From the carrier's load sheet">
            <input
              id="loadNumber"
              maxLength={12}
              value={form.loadNumber}
              aria-invalid={!!errors.loadNumber}
              aria-describedby={describedBy('loadNumber', errors.loadNumber, true)}
              onChange={(e) => set('loadNumber', e.target.value)}
            />
          </Field>

          <Field id="dateOfDelivery" label="Date of delivery" error={errors.dateOfDelivery}>
            <input
              id="dateOfDelivery"
              type="date"
              max={todayIso()}
              value={form.dateOfDelivery}
              aria-invalid={!!errors.dateOfDelivery}
              aria-describedby={describedBy('dateOfDelivery', errors.dateOfDelivery)}
              onChange={(e) => set('dateOfDelivery', e.target.value)}
            />
          </Field>

          <Field id="commonCarrierWaybill" label="Common carrier waybill #" error={errors.commonCarrierWaybill}>
            <input
              id="commonCarrierWaybill"
              maxLength={20}
              value={form.commonCarrierWaybill}
              aria-invalid={!!errors.commonCarrierWaybill}
              aria-describedby={describedBy('commonCarrierWaybill', errors.commonCarrierWaybill)}
              onChange={(e) => set('commonCarrierWaybill', e.target.value)}
            />
          </Field>

          <Field
            id="authorizationNumNightDeliveries"
            label="Night delivery authorization #"
            error={errors.authorizationNumNightDeliveries}
            hint="Only for unattended (night) deliveries"
          >
            <input
              id="authorizationNumNightDeliveries"
              maxLength={20}
              value={form.authorizationNumNightDeliveries}
              aria-invalid={!!errors.authorizationNumNightDeliveries}
              aria-describedby={describedBy('authorizationNumNightDeliveries', errors.authorizationNumNightDeliveries, true)}
              onChange={(e) => set('authorizationNumNightDeliveries', e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ---------- 2. Repairs ---------- */}
      <section className="card" aria-labelledby="sec-repairs">
        <h2 id="sec-repairs" className="card__title">
          <span className="step">2</span> Repairs &amp; costs
        </h2>
        <RepairLines lines={form.lines} errors={errors} onChange={(lines) => set('lines', lines)} />
      </section>

      {/* ---------- 3. Attachments ---------- */}
      <section className="card" aria-labelledby="sec-files">
        <h2 id="sec-files" className="card__title">
          <span className="step">3</span> Photos &amp; documents <span className="field__opt">(recommended)</span>
        </h2>
        <p className="note">
          Include photos of the damage, the VIN label, and the signed delivery receipt or repair estimate.
        </p>
        <AttachmentPicker files={form.files} error={errors.files} onChange={(files) => set('files', files)} />
      </section>

      <div className="submit-bar">
        <p className="submit-bar__summary">
          {req.descriptions.length} repair line{req.descriptions.length === 1 ? '' : 's'} · {form.files.length} attachment
          {form.files.length === 1 ? '' : 's'}
        </p>
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy || !dealers || dealers.length === 0}>
          {busy ? 'Submitting…' : 'Submit claim'}
        </button>
      </div>
    </form>
  );
}
