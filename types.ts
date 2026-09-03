export enum Role {
  ADMIN = 'ADMIN',
  SR_FIELD_EXECUTIVE = 'SR_FIELD_EXECUTIVE',
  FIELD_REP = 'FIELD_REP'
}

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | 'PENDING_APPROVAL';
export type ProposalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type BillingModel = 'COMPLIANCE' | 'FLAT';
export type WageMode = 'PORTAL_MIN_WAGE' | 'CUSTOM';
export type ShiftDuration = '12_HOURS' | '8_HOURS';
export type ServiceRoleType = 'GUARD' | 'SUPERVISOR' | 'GUNMAN' | 'HOUSEKEEPING';

export interface User {
  id: string; // VSFHS-XXXXXX
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: Role;
  avatar?: string;
  dob?: string;
  createdAt: string;
  status: UserStatus;
  loginAttempts: number;
  blockReason?: string;
  visitTarget?: number; // Target number of visits per month
  createdBy?: string; // ID of the user who created this account
}

export interface StatutoryBreakdown {
  base: number;
  additional12Hrs: number;
  reliever: number;
  gross: number;
  epf: number;
  esic: number;
  lwf: number;
  paidHoliday: number;
  uniform: number;
  totalStat: number;
  ctc: number;
  agencyMargin: number;
  grandTotal: number;
}

export interface ProposalServiceItem {
  role: ServiceRoleType;
  label: string;
  count: number;
  shift: ShiftDuration;
  flatRate: number;
  statutory: StatutoryBreakdown;
  perHeadRate: number;
  lineTotal: number;
}

export interface ProposalRequest {
  id: string;
  clientName: string;
  clientAddress: string;
  notificationRef?: string;
  guardCount?: number;
  supervisorCount?: number;
  gunmanCount?: number;
  guardBasic?: number;
  supervisorBasic?: number;
  gunmanBasic?: number;
  serviceChargePercent?: number;
  requestedById: string;
  requestedByName: string;
  status: ProposalStatus;
  createdAt: string;

  // Commercial model & multi-service deployment
  billingModel?: BillingModel;
  wageMode?: WageMode;
  flatGuardRate?: number;
  flatSupervisorRate?: number;
  flatGunmanRate?: number;
  serviceItems?: ProposalServiceItem[];
  totalAmount?: number;
  approvedBy?: string;
  approvedAt?: string;

  // snake_case database schema mappings
  client_name?: string;
  client_address?: string;
  client_phone?: string;
  contact_person?: string;
  billing_model?: BillingModel;
  wage_mode?: WageMode;
  guard_count?: number;
  supervisor_count?: number;
  gunman_count?: number;
  service_charge_percent?: number;
  service_items?: ProposalServiceItem[];
  total_amount?: number;
  requested_by_id?: string;
  requested_by_name?: string;
  created_at?: string;
  approved_by?: string;
  approved_at?: string;
  visit_id?: string | null;

  [key: string]: any;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  punchIn: string;
  date: string; // YYYY-MM-DD
  selfie: string;
}

// Statutory, legal credentials, branding and master wage matrix
export interface AppSettings {
  companyName: string;
  logo: string; // base64 / URL
  contactNo: string;
  adminPassword?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  psaraLicense?: string;
  directorName?: string;
  sealImage?: string;

  // Accreditations & Statutory Registration Records
  labourRegNo?: string;
  epfCode?: string;
  esicRegNo?: string;
  ptLicenseNo?: string;
  panNumber?: string;

  // Master Statutory Minimum Wages (26 Days Basis)
  guardBasic12?: number;
  guardBasic8?: number;
  supervisorBasic12?: number;
  supervisorBasic8?: number;
  gunmanBasic12?: number;
  gunmanBasic8?: number;
  housekeepingBasic12?: number;
  housekeepingBasic8?: number;

  // Commercial Flat Rates Standards (Monthly Per Head)
  flatGuard12?: number;
  flatGuard8?: number;
  flatSupervisor12?: number;
  flatSupervisor8?: number;
  flatGunman12?: number;
  flatGunman8?: number;
  flatHousekeeping12?: number;
  flatHousekeeping8?: number;

  // Statutory Percentages & Fixed Allowances
  overtimePercent?: number;
  reliverPercent?: number;
  epfPercent?: number;
  esicPercent?: number;
  lwfAmount?: number;
  uniformKitAmount?: number;
  defaultServiceMargin?: number;

  // Flexible key signature for backend compatibility
  [key: string]: any;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// =========================================================================
// MARKETING & PIPELINE TYPES
// =========================================================================

export type LeadStatus = 'PROSPECT' | 'INTERESTED' | 'QUOTATION_SENT' | 'CONVERTED' | 'COLD';
export type VisitPurpose = 'COLD_CALL' | 'FOLLOW_UP' | 'CLOSING';
export type InteractionOutcome = 'INTERESTED' | 'NOT_INTERESTED' | 'DEMO_SCHEDULED' | 'CALLBACK' | 'DISCUSSED';

// Tracks long-term business opportunities & pipeline metrics
export interface Lead {
  id: string; // VSFHS-LEAD-XXXXXX
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  status: LeadStatus;
  estimatedValue: number; // Potential financial contract value
  assignedTo?: string;    // User ID of the Field Representative
  createdAt: string;
  updatedAt: string;

  // snake_case database schema mappings
  company_name?: string;
  contact_person?: string;
  estimated_value?: number;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;

  [key: string]: any;
}

// Extended with structured fields for marketing conversion
export interface Visit {
  id: string;
  representativeId: string;
  representativeName: string;
  companyName: string;
  category: string; // Category/Client Type
  phoneNumber: string;
  contactPerson: string;
  timestamp: string;
  location: Location;
  boardPhoto: string;
  repPhoto: string;
  notes?: string;

  // Marketing Core Extensions
  leadId?: string;                 // Connects this visit to a target lead pipeline
  visitPurpose: VisitPurpose;      // Why was the meeting conducted
  interactionOutcome: InteractionOutcome; // Actionable marketing results
  nextFollowUp?: string;           // YYYY-MM-DD string for driving mobile reminders

  // snake_case database schema mappings
  representative_id?: string;
  representative_name?: string;
  company_name?: string;
  phone_number?: string;
  phone?: string;
  contact_person?: string;
  board_photo?: string;
  rep_photo?: string;
  lead_id?: string;
  visit_purpose?: VisitPurpose;
  interaction_outcome?: InteractionOutcome;
  next_follow_up?: string;
  created_at?: string;

  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
