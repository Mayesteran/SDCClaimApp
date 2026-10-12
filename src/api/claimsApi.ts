import type { AttachmentDto, ClaimDetailDto, CreateClaimRequest, DealerDto } from './types';

const BASE = '/api/v1/transportation-claims';

/** An RFC 7807 problem returned by SDC.Api, flattened into readable messages. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { Accept: 'application/json', ...init.headers } });
  } catch {
    throw new ApiError(0, 'Could not reach the claims service. Check your connection and try again.');
  }

  if (res.ok) {
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  let problem: { title?: string; detail?: string; errors?: Record<string, string[]> } = {};
  try {
    problem = await res.json();
  } catch {
    // Non-JSON error body: fall back to a message from the status code below.
  }

  const message =
    problem.detail ||
    (res.status === 401 || res.status === 403
      ? 'You are not authorized to submit claims. Contact SDC for access.'
      : res.status === 429
        ? 'Too many requests. Please wait a minute and try again.'
        : problem.title || `The claims service returned an error (HTTP ${res.status}).`);

  throw new ApiError(res.status, message, problem.errors ?? {});
}

export const claimsApi = {
  getMyDealers: () => request<DealerDto[]>('/my-dealers'),

  createClaim: (claim: CreateClaimRequest) =>
    request<ClaimDetailDto>('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claim),
    }),

  uploadAttachments: (headerId: number, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f, f.name));
    return request<AttachmentDto[]>(`/${headerId}/attachments`, { method: 'POST', body: form });
  },

  getClaim: (headerId: number) => request<ClaimDetailDto>(`/${headerId}`),
};
