# SDC Transportation Damage Claims — Dealer site

React (Vite + TypeScript) website where dealers report transportation damage claims.
It talks to the **Transportation Claims** section of `SDC.Api` (`..\SDC_API\src\SDC.Api`).

Scope for now: a **claims dashboard** per dealer, **read-only claim details**, and **submitting new claims**
(no login screen, no editing or resubmitting).

## Pages

| URL | Page |
| --- | --- |
| `#/?dealer=100123` | Dashboard: one column per claim status (from `GET /statuses`), each listing that dealer's claims via `GET /?dealerCode=&statusId=` (25 per page, "Show more" loads the next page). VIN search filters every column. Users assigned to several dealers get a dealer selector. Clicking a column header collapses it (remembered per browser). Clicking a claim opens a details pop-up (`GET /{headerId}`): dealer & vehicle info, repair lines, totals and SDC-approved amounts, attachments (open/download), status history and the rejection reason. |
| `#/new?dealer=100123` | New claim form, with the dashboard's dealer preselected. |
| `#/submitted` | Confirmation after a submit, with links back to the dashboard or to another claim. |

Hash URLs are used so the static build works on any web server without rewrite rules.

## Run locally

1. Start `SDC.Api` with its `https` launch profile (`https://localhost:7299`).
2. Copy `.env.example` to `.env.local` and fill in:
   - `CLAIMS_API_KEY` – the plain API key of the `claims-web` client (appsettings only stores its SHA-256 hash; generate a
     new pair with `dotnet SDC.Api.dll generate-api-key claims-web` if nobody has it).
   - `CLAIMS_DEV_LOGIN` / `CLAIMS_DEV_PASSWORD` – an LMS account assigned to at least one dealer.
3. `npm install`, then `npm run dev`, and open <http://localhost:4200>.

Port 4200 is used because it is already a registered origin for `claims-web` in `appsettings.Development.json`.

## How "no login" works

SDC.Api requires a dealer bearer token plus the `X-Client-Id` / `X-Api-Key` headers on every claims request.
Until the site has a login screen, the Vite dev server (`dev/apiAuthProxy.ts`) signs in with the dev account,
caches the token, and adds those headers to every `/api` request it proxies. The secrets stay on the dev server and
never reach the browser. All claims are submitted under the dev account, and its dealers fill the Dealer dropdown.

**This is for development only.** `npm run build` produces static files that call `/api/...` with no credentials.
Before going to production, the site needs either a login screen (`POST /api/v1/auth/token`) or a server-side
proxy that does what the dev bridge does.

## What the form does

| Section | Maps to `CreateClaimRequest` |
| --- | --- |
| Dealer & vehicle | `dealerCode` (from `GET /my-dealers`), `vin` (17 chars + check digit, same rule as `VinValidator`), `loadNumber`, `dateOfDelivery`, `commonCarrierWaybill`, `authorizationNumNightDeliveries` |
| *(not shown)* | `damageType` – not reported by dealers; sent with every flag `false` because the API requires the object |
| Repairs & costs | `descriptions[]` – 1 to 50 lines of hours and dollar amounts |
| Photos & documents | Uploaded after the claim is created via `POST /{headerId}/attachments`, 10 files per request; JPG/PNG/HEIC/PDF, 20 MB each, 60 per claim |

If the claim saves but some attachments fail, the confirmation page says so and offers a retry.

## Project layout

```
dev/apiAuthProxy.ts        dev-server sign-in + header injection
src/api/                   API types (mirror ClaimContracts.cs) and fetch client
src/claim/claimForm.ts     form state, validation, request mapping
src/lib/useHashRoute.ts    tiny hash router
src/components/            dashboard + status columns, form sections, confirmation page, header/footer
src/styles.css             Subaru palette and layout
```
"# ClaimApp" 
