import { useEffect, useState } from 'react';
import { ApiError, claimsApi } from '../api/claimsApi';
import type { ClaimSummaryDto, StatusDto } from '../api/types';
import { formatDate } from '../lib/format';

const PAGE_SIZE = 25;

// Used when the database has no usable color for a status.
const FALLBACK_COLORS: Record<number, string> = {
  1: '#1971d4', // Submitted
  2: '#d98e04', // Under Review
  3: '#1f7a3d', // Approved
  4: '#c8102e', // Rejected
};

export function statusColor(status: StatusDto): string {
  const c = status.color?.trim();
  return c && CSS.supports('color', c) ? c : (FALLBACK_COLORS[status.statusId] ?? '#5b6573');
}

interface Props {
  status: StatusDto;
  dealerCode: string;
  vin: string;
  /** Changing this number reloads the column. */
  refreshKey: number;
  collapsed: boolean;
  onToggle: () => void;
  onOpenClaim: (headerId: number) => void;
}

export function StatusColumn({ status, dealerCode, vin, refreshKey, collapsed, onToggle, onOpenClaim }: Props) {
  const [items, setItems] = useState<ClaimSummaryDto[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // First page: reload whenever the dealer, search or refresh key changes.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    claimsApi
      .searchClaims({ dealerCode, statusId: status.statusId, vin: vin || undefined, page: 1, pageSize: PAGE_SIZE }, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setItems(r.items);
        setTotal(r.totalCount);
        setPage(1);
      })
      .catch((err: ApiError) => !ctrl.signal.aborted && setError(err.message))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [dealerCode, status.statusId, vin, refreshKey]);

  async function loadMore() {
    setLoading(true);
    try {
      const r = await claimsApi.searchClaims({ dealerCode, statusId: status.statusId, vin: vin || undefined, page: page + 1, pageSize: PAGE_SIZE });
      setItems((prev) => [...prev, ...r.items]);
      setTotal(r.totalCount);
      setPage(page + 1);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  const color = statusColor(status);
  const titleId = `status-${status.statusId}`;
  const bodyId = `status-${status.statusId}-body`;

  return (
    <section
      className={`column${collapsed ? ' column--collapsed' : ''}`}
      style={{ ['--status' as string]: color }}
      aria-labelledby={titleId}
      aria-busy={loading}
    >
      <h2 className="column__heading">
        <button
          type="button"
          id={titleId}
          className="column__head"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          title={collapsed ? `Expand ${status.status}` : `Collapse ${status.status}`}
          onClick={onToggle}
        >
          <svg className="column__chevron" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="column__dot" aria-hidden="true" />
          <span className="column__title">{status.status}</span>
          <span className="column__count" aria-label={`${total ?? 0} claims`}>
            {total ?? '–'}
          </span>
        </button>
      </h2>

      <div id={bodyId} className="column__body" hidden={collapsed}>
        {error ? (
          <p className="column__empty column__empty--error" role="alert">
            {error}
          </p>
        ) : loading && items.length === 0 ? (
          <ul className="claim-cards" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="claim-card claim-card--skeleton" />
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="column__empty">{vin ? 'No matching claims.' : 'No claims.'}</p>
        ) : (
          <ul className="claim-cards">
            {items.map((c) => (
              <li key={c.headerId}>
                <button type="button" className="claim-card" aria-haspopup="dialog" onClick={() => onOpenClaim(c.headerId)}>
                  <span className="claim-card__top">
                    <span className="claim-card__number">Claim #{c.reportNumber}</span>
                    <span className="claim-card__date">{formatDate(c.dateSubmitted)}</span>
                  </span>
                  <span className="claim-card__vin mono">
                    <span className="sr-only">VIN </span>
                    {c.vin}
                  </span>
                  {c.loadNumber && (
                    <span className="claim-card__meta">
                      <span className="claim-card__label">Load</span> {c.loadNumber}
                    </span>
                  )}
                  {c.submittedBy && (
                    <span className="claim-card__meta" title={c.submittedBy}>
                      <span className="claim-card__label">By</span> {c.submittedBy}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {total !== null && items.length < total && !error && (
          <button type="button" className="btn btn--link column__more" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading…' : `Show more (${total - items.length} left)`}
          </button>
        )}
      </div>
    </section>
  );
}
