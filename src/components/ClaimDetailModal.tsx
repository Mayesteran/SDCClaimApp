import { useEffect, useRef, useState } from 'react';
import { ApiError, claimsApi } from '../api/claimsApi';
import type { ClaimDetailDto, StatusDto } from '../api/types';
import { formatBytes, formatDate, formatDateTime, formatHours, formatMoney } from '../lib/format';
import { statusColor } from './StatusColumn';

interface Props {
  headerId: number;
  statuses: StatusDto[];
  onClose: () => void;
}

/** Read-only claim details in a modal dialog (Esc, the × button or a backdrop click closes it). */
export function ClaimDetailModal({ headerId, statuses, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [claim, setClaim] = useState<ClaimDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: React StrictMode runs effects twice in development, and showModal() throws if already open.
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    claimsApi
      .getClaim(headerId, ctrl.signal)
      .then((c) => !ctrl.signal.aborted && setClaim(c))
      .catch((err: ApiError) => !ctrl.signal.aborted && setError(err.message));
    return () => ctrl.abort();
  }, [headerId]);

  const statusName = (id: number | null) => statuses.find((s) => s.statusId === id)?.status ?? (id === null ? '—' : `Status ${id}`);

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="claim-detail-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
    >
      <div className="modal__panel">
        <header className="modal__head">
          <div>
            <h2 id="claim-detail-title">{claim ? `Claim #${claim.reportNumber}` : 'Claim details'}</h2>
            {claim?.status && (
              <span className="status-pill" style={{ ['--status' as string]: statusColor(claim.status) }}>
                {claim.status.status}
              </span>
            )}
          </div>
          <button type="button" className="modal__close" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </header>

        <div className="modal__body">
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : !claim ? (
            <div className="modal__loading" role="status">
              <div className="spinner" aria-hidden="true" />
              <p>Loading claim…</p>
            </div>
          ) : (
            <ClaimDetails claim={claim} statusName={statusName} />
          )}
        </div>
      </div>
    </dialog>
  );
}

function ClaimDetails({ claim, statusName }: { claim: ClaimDetailDto; statusName: (id: number | null) => string }) {
  const t = claim.totals;
  const hasAdjustments = claim.descriptions.some((d) => d.sdcAdjustment !== null);
  const rate = t.warrantyLaborRate != null ? ` × ${formatMoney(t.warrantyLaborRate)}` : '';

  return (
    <>
      {claim.status?.statusId === 4 && claim.lastRejectionReason && (
        <div className="alert alert--error">
          <strong>Rejected:</strong> {claim.lastRejectionReason}
        </div>
      )}

      <section className="detail-section">
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
            <dt>Submitted</dt>
            <dd>{formatDate(claim.dateSubmitted)}</dd>
          </div>
          <div>
            <dt>Submitted by</dt>
            <dd>{claim.submittedBy ?? '—'}</dd>
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
            <dt>Common carrier waybill #</dt>
            <dd>{claim.commonCarrierWaybill ?? '—'}</dd>
          </div>
          <div>
            <dt>Night delivery authorization #</dt>
            <dd>{claim.authorizationNumNightDeliveries ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-section">
        <h3>Repairs &amp; costs</h3>
        <div className="table-wrap">
          <table className="lines-table">
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col" className="num">Mech. hrs</th>
                <th scope="col" className="num">Body hrs</th>
                <th scope="col" className="num">Refinish hrs</th>
                <th scope="col" className="num">Paints &amp; mat.</th>
                <th scope="col" className="num">Parts</th>
                {hasAdjustments && <th scope="col" className="num">SDC approved</th>}
              </tr>
            </thead>
            <tbody>
              {claim.descriptions.map((d) => (
                <tr key={d.descriptionId}>
                  <td className="lines-table__desc">{d.descriptionOfRepairAndPartsReplaced}</td>
                  <td className="num">{formatHours(d.mechanicalLaborHours)}</td>
                  <td className="num">{formatHours(d.bodyRepairLaborHours)}</td>
                  <td className="num">{formatHours(d.refinishHours)}</td>
                  <td className="num">{formatMoney(d.paintsAndMaterials)}</td>
                  <td className="num">{formatMoney(d.partsCost)}</td>
                  {hasAdjustments && <td className="num">{d.sdcAdjustment === null ? '—' : formatMoney(d.sdcAdjustment)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <table className="totals-table">
          <tbody>
            <tr>
              <th scope="row">Mechanical labor ({formatHours(t.mechanicalLaborHours)} hrs{rate})</th>
              <td>{formatMoney(t.mechanicalLaborAmount)}</td>
            </tr>
            <tr>
              <th scope="row">
                Body &amp; refinish labor ({formatHours(t.bodyRepairLaborHours + t.refinishHours)} hrs{rate})
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
            {hasAdjustments && (
              <tr className="totals-table__approved">
                <th scope="row">SDC approved</th>
                <td>{formatMoney(t.sdcApprovedAmount)}</td>
              </tr>
            )}
          </tfoot>
        </table>

        {claim.explanationSdcAdjustments && (
          <div className="note-box">
            <strong>SDC explanation:</strong> {claim.explanationSdcAdjustments}
          </div>
        )}
      </section>

      <section className="detail-section">
        <h3>Photos &amp; documents ({claim.attachments.length})</h3>
        {claim.attachments.length === 0 ? (
          <p className="note">No attachments.</p>
        ) : (
          <ul className="attachment-list">
            {claim.attachments.map((a) => (
              <li key={a.attachmentId}>
                <a href={claimsApi.attachmentUrl(claim.headerId, a.attachmentId)} target="_blank" rel="noopener">
                  <span className="attachment-list__kind" aria-hidden="true">
                    {a.category === 'Document' ? 'PDF' : 'IMG'}
                  </span>
                  <span className="attachment-list__name">{a.fileName}</span>
                </a>
                <span className="attachment-list__meta">
                  {formatBytes(a.sizeBytes)} · {formatDateTime(a.uploadedAtUtc)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {claim.history.length > 0 && (
        <section className="detail-section">
          <h3>Status history</h3>
          <ol className="timeline">
            {claim.history.map((h, i) => (
              <li key={i}>
                <span className="timeline__status">{statusName(h.toStatusId)}</span>
                <span className="timeline__meta">
                  {formatDateTime(h.changedAtUtc)} · {h.changedBy}
                </span>
                {h.reason && <p className="timeline__reason">{h.reason}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
