import { useState } from 'react';
import { ApiError, claimsApi } from './api/claimsApi';
import { ATTACHMENT_LIMITS, type ClaimDetailDto } from './api/types';
import { toRequest, type FormErrors, type PickedFile } from './claim/claimForm';
import { ClaimFormPage, type SubmitInput } from './components/ClaimFormPage';
import { SiteFooter, SiteHeader } from './components/SiteHeader';
import { SubmittedPage } from './components/SubmittedPage';

type Progress = { step: 'claim' } | { step: 'files'; done: number; total: number };

interface Submitted {
  claim: ClaimDetailDto;
  failedFiles: PickedFile[];
  uploadError: string | null;
}

/** Maps API validation keys ("Vin", "descriptions[0].partsCost") to form field keys ("vin", "lines.0.parts"). */
function toFormErrors(fieldErrors: Record<string, string[]>): FormErrors {
  const lineFields: Record<string, string> = {
    descriptionofrepairandpartsreplaced: 'description',
    mechanicallaborhours: 'mechanical',
    bodyrepairlaborhours: 'body',
    refinishhours: 'refinish',
    paintsandmaterials: 'paints',
    partscost: 'parts',
  };
  const top: Record<string, string> = {
    dealercode: 'dealerCode',
    vin: 'vin',
    loadnumber: 'loadNumber',
    dateofdelivery: 'dateOfDelivery',
    commoncarrierwaybill: 'commonCarrierWaybill',
    authorizationnumnightdeliveries: 'authorizationNumNightDeliveries',
    descriptions: 'lines',
  };
  const out: FormErrors = {};
  for (const [rawKey, messages] of Object.entries(fieldErrors)) {
    const key = rawKey.toLowerCase().replace(/^\$\./, '');
    const line = /^descriptions\[(\d+)\]\.(\w+)$/.exec(key);
    const mapped = line ? `lines.${line[1]}.${lineFields[line[2]] ?? 'description'}` : top[key];
    if (mapped) out[mapped] = messages[0];
  }
  return out;
}

async function uploadInBatches(headerId: number, files: PickedFile[], onProgress: (done: number) => void) {
  const failed: PickedFile[] = [];
  let error: string | null = null;
  let done = 0;
  for (let i = 0; i < files.length; i += ATTACHMENT_LIMITS.maxFilesPerRequest) {
    const batch = files.slice(i, i + ATTACHMENT_LIMITS.maxFilesPerRequest);
    try {
      await claimsApi.uploadAttachments(headerId, batch.map((f) => f.file));
    } catch (err) {
      failed.push(...batch);
      error = err instanceof ApiError ? err.message : 'The upload failed.';
    }
    done += batch.length;
    onProgress(done);
  }
  return { failed, error };
}

export default function App() {
  const [formKey, setFormKey] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [serverErrors, setServerErrors] = useState<FormErrors>({});
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function submit({ form }: SubmitInput) {
    setServerErrors({});
    setServerMessage(null);
    setProgress({ step: 'claim' });

    let claim: ClaimDetailDto;
    try {
      claim = await claimsApi.createClaim(toRequest(form));
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(0, 'Unexpected error.');
      setServerErrors(toFormErrors(e.fieldErrors));
      setServerMessage(e.message);
      setProgress(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let failedFiles: PickedFile[] = [];
    let uploadError: string | null = null;
    if (form.files.length > 0) {
      setProgress({ step: 'files', done: 0, total: form.files.length });
      const result = await uploadInBatches(claim.headerId, form.files, (done) =>
        setProgress({ step: 'files', done, total: form.files.length }),
      );
      failedFiles = result.failed;
      uploadError = result.error;
      claim = await claimsApi.getClaim(claim.headerId).catch(() => claim);
    }

    setProgress(null);
    setSubmitted({ claim, failedFiles, uploadError });
    window.scrollTo({ top: 0 });
  }

  async function retryUpload() {
    if (!submitted) return;
    setRetrying(true);
    const { claim, failedFiles } = submitted;
    const result = await uploadInBatches(claim.headerId, failedFiles, () => {});
    const refreshed = await claimsApi.getClaim(claim.headerId).catch(() => claim);
    setSubmitted({ claim: refreshed, failedFiles: result.failed, uploadError: result.error });
    setRetrying(false);
  }

  function newClaim() {
    setSubmitted(null);
    setServerErrors({});
    setServerMessage(null);
    setFormKey((k) => k + 1); // remounts the form with empty state
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="app">
      <SiteHeader />
      <main className="main">
        {submitted ? (
          <SubmittedPage
            claim={submitted.claim}
            failedFiles={submitted.failedFiles}
            uploadError={submitted.uploadError}
            retrying={retrying}
            onRetryUpload={retryUpload}
            onNewClaim={newClaim}
          />
        ) : (
          <ClaimFormPage key={formKey} onSubmit={submit} serverErrors={serverErrors} serverMessage={serverMessage} />
        )}
      </main>
      <SiteFooter />

      {progress && (
        <div className="overlay" role="status" aria-live="polite">
          <div className="overlay__panel">
            <div className="spinner" aria-hidden="true" />
            {progress.step === 'claim' ? (
              <p>Submitting your claim…</p>
            ) : (
              <>
                <p>
                  Uploading attachments ({progress.done} of {progress.total})
                </p>
                <div className="progress">
                  <div className="progress__bar" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
              </>
            )}
            <p className="overlay__hint">Please keep this page open.</p>
          </div>
        </div>
      )}
    </div>
  );
}
