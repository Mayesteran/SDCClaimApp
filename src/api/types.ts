// Mirrors SDC.Api Features/TransportationClaims/Contracts/ClaimContracts.cs (JSON is camelCase).

export interface DamageTypeInput {
  marineDamage: boolean;
  yardDamage: boolean;
  transitDamage: boolean;
  accessory: boolean;
  soaClaim: boolean;
  damageComment: string | null;
}

export interface DescriptionInput {
  descriptionOfRepairAndPartsReplaced: string;
  mechanicalLaborHours: number;
  bodyRepairLaborHours: number;
  refinishHours: number;
  paintsAndMaterials: number;
  partsCost: number;
}

export interface CreateClaimRequest {
  dealerCode: string;
  vin: string;
  loadNumber: string | null;
  dateOfDelivery: string | null;
  commonCarrierWaybill: string | null;
  authorizationNumNightDeliveries: string | null;
  damageType: DamageTypeInput;
  descriptions: DescriptionInput[];
}

export interface DealerDto {
  code: string;
  name: string | null;
}

export interface StatusDto {
  statusId: number;
  status: string;
  color: string | null;
}

export interface AttachmentDto {
  attachmentId: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  category: string;
  uploadedBy: string;
  uploadedAtUtc: string;
}

export interface ClaimTotalsDto {
  mechanicalLaborHours: number;
  bodyRepairLaborHours: number;
  refinishHours: number;
  warrantyLaborRate: number | null;
  mechanicalLaborAmount: number;
  bodyAndRefinishAmount: number;
  paintsAndMaterials: number;
  partsCost: number;
  totalReported: number;
  sdcApprovedAmount: number;
}

export interface ClaimDetailDto {
  headerId: number;
  reportNumber: number;
  dealer: DealerDto;
  vin: string;
  loadNumber: string | null;
  dateOfDelivery: string | null;
  dateSubmitted: string | null;
  commonCarrierWaybill: string | null;
  authorizationNumNightDeliveries: string | null;
  submittedBy: string | null;
  status: StatusDto | null;
  damageType: DamageTypeInput | null;
  descriptions: (DescriptionInput & { descriptionId: number; sdcAdjustment: number | null })[];
  attachments: AttachmentDto[];
  totals: ClaimTotalsDto;
  explanationSdcAdjustments: string | null;
  lastRejectionReason: string | null;
  history: StatusHistoryDto[];
}

export interface StatusHistoryDto {
  fromStatusId: number | null;
  toStatusId: number;
  reason: string | null;
  changedBy: string;
  changedAtUtc: string;
}

export interface ClaimSummaryDto {
  headerId: number;
  reportNumber: number;
  dealerCode: string;
  vin: string;
  loadNumber: string | null;
  dateSubmitted: string | null;
  submittedBy: string | null;
  status: StatusDto | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ClaimQuery {
  statusId?: number;
  dealerCode?: string;
  vin?: string;
  page?: number;
  pageSize?: number;
}

/** Attachment limits configured in SDC.Api (Modules:TransportationClaims:Attachments). */
export const ATTACHMENT_LIMITS = {
  maxFileSizeMb: 20,
  maxFilesPerRequest: 10,
  maxFilesPerClaim: 60,
  extensions: ['.jpg', '.jpeg', '.png', '.heic', '.pdf'],
} as const;

export const MAX_REPAIR_LINES = 50;
