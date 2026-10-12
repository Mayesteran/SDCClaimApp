import { useEffect, useState } from 'react';
import { ApiError, claimsApi } from '../api/claimsApi';
import type { DealerDto, StatusDto } from '../api/types';
import { href, navigate } from '../lib/useHashRoute';
import { ClaimDetailModal } from './ClaimDetailModal';
import { StatusColumn } from './StatusColumn';

const COLLAPSED_KEY = 'sdc-claims.collapsed-statuses';

// Per-browser preference; storage can be unavailable (private mode, blocked site data), so fail quietly.
function loadCollapsed(): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function saveCollapsed(ids: number[]) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(ids));
  } catch {
    // Not persisted; the toggle still works for this visit.
  }
}

interface Props {
  dealers: DealerDto[] | null;
  dealersError: string | null;
  dealerCode: string;
}

export function Dashboard({ dealers, dealersError, dealerCode }: Props) {
  const [statuses, setStatuses] = useState<StatusDto[] | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vin, setVin] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [collapsed, setCollapsed] = useState<number[]>(loadCollapsed);
  const [openClaimId, setOpenClaimId] = useState<number | null>(null);

  function toggle(statusId: number) {
    setCollapsed((prev) => {
      const next = prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId];
      saveCollapsed(next);
      return next;
    });
  }

  useEffect(() => {
    claimsApi
      .getStatuses()
      .then(setStatuses)
      .catch((err: ApiError) => setStatusError(err.message));
  }, []);

  // Debounce the VIN search so each keystroke doesn't fire one request per status.
  useEffect(() => {
    const t = setTimeout(() => setVin(search.trim().toUpperCase()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const dealer = dealers?.find((d) => d.code === dealerCode);
  const error = dealersError ?? statusError;

  return (
    <div className="dashboard">
      <div className="dashboard__head">
        <div>
          <h1>Claims dashboard</h1>
          <p className="dashboard__sub">
            {dealer ? `${dealer.code} — ${dealer.name ?? 'Unknown dealer'}` : dealers ? 'No dealer selected' : 'Loading…'}
          </p>
        </div>
        <a className={`btn btn--primary btn--lg${dealerCode ? '' : ' btn--disabled'}`} href={href('/new', { dealer: dealerCode })}>
          + New claim
        </a>
      </div>

      <div className="toolbar">
        {dealers && dealers.length > 1 && (
          <label className="toolbar__item">
            <span className="toolbar__label">Dealer</span>
            <select value={dealerCode} onChange={(e) => navigate('/', { dealer: e.target.value })}>
              {dealers.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.name ?? 'Unknown dealer'}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="toolbar__item toolbar__item--grow">
          <span className="toolbar__label">Search by VIN</span>
          <input
            type="search"
            className="mono"
            placeholder="Full or partial VIN"
            maxLength={17}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn--secondary" onClick={() => setRefreshKey((k) => k + 1)}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {dealerCode && statuses && (
        <div
          className="board"
          // On wide screens a collapsed column shrinks to a narrow strip and the others take its space.
          style={{
            ['--board-columns' as string]: statuses
              .map((s) => (collapsed.includes(s.statusId) ? '56px' : 'minmax(0, 1fr)'))
              .join(' '),
          }}
        >
          {statuses.map((s) => (
            <StatusColumn
              key={s.statusId}
              status={s}
              dealerCode={dealerCode}
              vin={vin}
              refreshKey={refreshKey}
              collapsed={collapsed.includes(s.statusId)}
              onToggle={() => toggle(s.statusId)}
              onOpenClaim={setOpenClaimId}
            />
          ))}
        </div>
      )}

      {openClaimId !== null && statuses && (
        <ClaimDetailModal headerId={openClaimId} statuses={statuses} onClose={() => setOpenClaimId(null)} />
      )}

      {dealers && dealers.length === 0 && (
        <div className="alert alert--warning">No dealers are assigned to your account. Contact SDC for access.</div>
      )}
    </div>
  );
}
