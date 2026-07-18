export enum Role {
  ADMIN = 'ADMIN',
  SR_FIELD_EXECUTIVE = 'SR_FIELD_EXECUTIVE',
  FIELD_REP = 'FIELD_REP'
}

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | 'PENDING_APPROVAL';

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

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  punchIn: string;
  date: string; // YYYY-MM-DD
  selfie: string;
}

export interface AppSettings {
  companyName: string;
  logo: string; // base64
  contactNo: string;
  adminPassword?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// =========================================================================
// NEW MARKETING & PIPELINE TYPES
// =========================================================================

export type LeadStatus = 'PROSPECT' | 'INTERESTED' | 'QUOTATION_SENT' | 'CONVERTED' | 'COLD';
export type VisitPurpose = 'COLD_CALL' | 'FOLLOW_UP' | 'CLOSING';
export type InteractionOutcome = 'INTERESTED' | 'NOT_INTERESTED' | 'DEMO_SCHEDULED' | 'CALLBACK' | 'DISCUSSED';

// NEW INTERFACE: Tracks long-term business opportunities & pipeline metrics
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
}

// UPGRADED INTERFACE: Extended with structured fields for marketing conversion
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

  // New Marketing Core Extensions
  leadId?: string;                 // Connects this visit to a target lead pipeline
  visitPurpose: VisitPurpose;      // Why was the meeting conducted
  interactionOutcome: InteractionOutcome; // Actionable marketing results
  nextFollowUp?: string;           // YYYY-MM-DD string for driving mobile reminders
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
