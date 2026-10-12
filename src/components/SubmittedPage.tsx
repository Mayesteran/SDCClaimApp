import type { ClaimDetailDto } from '../api/types';
import type { PickedFile } from '../claim/claimForm';
import { formatDate, formatHours, formatMoney } from '../lib/format';

interface Props {
  claim: ClaimDetailDto;
  failedFiles: PickedFile[];
  uploadError: string | null;
  retrying: boolean;
  onRetryUpload: () => void;
  onNewClaim: () => void;
  onDashboard: () => void;
}

export function SubmittedPage({ claim, failedFiles, uploadError, retrying, onRetryUpload, onNewClaim, onDashboard }: Props) {
  const t = claim.totals;

  return (
    <div className="submitted">
      <section className="card card--success" aria-labelledby="done-title">
        <div className="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 id="done-title">Claim submitted</h1>
        <p className="report-number">
          Report number <strong>#{claim.reportNumber}</strong>
        </p>
        <p>
          SDC has been notified and will review the claim. Keep the report number for your records; you'll receive an email
          when its status changes.
        </p>
      </section>

      {failedFiles.length > 0 && (
        <div className="alert alert--warning" role="alert">
          <p>
            <strong>
              {failedFiles.length} attachment{failedFiles.length === 1 ? ' was' : 's were'} not uploaded.
            </strong>{' '}
            {uploadError} The claim itself was saved.
          </p>
          <ul className="failed-files">
            {failedFiles.map((f) => (
              <li key={f.key}>{f.file.name}</li>
            ))}
          </ul>
          <button type="button" className="btn btn--primary" onClick={onRetryUpload} disabled={retrying}>
            {retrying ? 'Uploading…' : 'Try uploading again'}
          </button>
        </div>
      )}

      <section className="card" aria-labelledby="summary-title">
        <h2 id="summary-title" className="card__title">
          Claim summary
        </h2>
        <dl className="summary">
          <div>
            <dt>Dealer</dt>
            <dd>
              {claim.dealer.code} — {claim.dealer.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt>VIN</dt>
            <dd className="mono">{claim.vin}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className="badge">{claim.status?.status ?? 'Submitted'}</span>
            </dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{formatDate(claim.dateSubmitted)}</dd>
          </div>
          <div>
            <dt>Load number</dt>
            <dd>{claim.loadNumber ?? '—'}</dd>
          </div>
          <div>
            <dt>Date of delivery</dt>
            <dd>{formatDate(claim.dateOfDelivery)}</dd>
          </div>
          <div>
            <dt>Attachments</dt>
            <dd>{claim.attachments.length}</dd>
          </div>
        </dl>

        <table className="totals-table">
          <caption>Amount reported</caption>
          <tbody>
            <tr>
              <th scope="row">
                Mechanical labor ({formatHours(t.mechanicalLaborHours)} hrs
                {t.warrantyLaborRate != null && ` × ${formatMoney(t.warrantyLaborRate)}`})
              </th>
              <td>{formatMoney(t.mechanicalLaborAmount)}</td>
            </tr>
            <tr>
              <th scope="row">
                Body &amp; refinish labor ({formatHours(t.bodyRepairLaborHours + t.refinishHours)} hrs
                {t.warrantyLaborRate != null && ` × ${formatMoney(t.warrantyLaborRate)}`})
              </th>
              <td>{formatMoney(t.bodyAndRefinishAmount)}</td>
            </tr>
            <tr>
              <th scope="row">Paints &amp; materials</th>
              <td>{formatMoney(t.paintsAndMaterials)}</td>
            </tr>
            <tr>
              <th scope="row">Parts</th>
              <td>{formatMoney(t.partsCost)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total reported</th>
              <td>{formatMoney(t.totalReported)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="submit-bar">
        <button type="button" className="btn btn--secondary btn--lg" onClick={onDashboard}>
          Back to dashboard
        </button>
        <button type="button" className="btn btn--primary btn--lg" onClick={onNewClaim}>
          Report another claim
        </button>
      </div>
    </div>
  );
}
