import { createClient } from '@supabase/supabase-js';

/* -------------------------------------------------------------------------- */
/*  Environment                                                                */
/* -------------------------------------------------------------------------- */

const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore: Vite env handling
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {
    /* import.meta unavailable */
  }
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.[key]) {
      return (globalThis as any).process.env[key];
    }
  } catch {
    /* process unavailable */
  }
  return undefined;
};

// The anon key is public by design. Real protection comes from row-level security
// (see supabase/02_lockdown_rls.sql). Prefer env vars; the fallbacks keep old builds working.
const SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
  'https://czbohynimtodyhlftbbn.supabase.co';

const SUPABASE_ANON_KEY =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Ym9oeW5pbXRvZHlobGZ0YmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDQ3MjUsImV4cCI6MjA4MzYyMDcyNX0.z0dIYr7AQ4_BMS--QaiBPUAgTYRGPC3oWzRi4aB2UyA';

/* -------------------------------------------------------------------------- */
/*  Session helpers                                                            */
/* -------------------------------------------------------------------------- */

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

export const getSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vs_token') || getCookie('vsf_universal_token');
};

export const getActiveCredentials = () => {
  if (typeof window === 'undefined') return { token: null, user: null };

  const token = getSessionToken();
  let user = null;
  try {
    const rawUser = localStorage.getItem('vs_active_user') || getCookie('vsf_user_session');
    if (rawUser) user = JSON.parse(rawUser);
  } catch (e) {
    console.warn('Could not parse user credentials:', e);
  }
  return { token, user };
};

/** Every database request carries the session token; row-level security reads it. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const token = getSessionToken();
      if (token) headers.set('x-session-token', token);
      return fetch(input, { ...init, headers });
    }
  }
});

/* -------------------------------------------------------------------------- */
/*  Errors                                                                     */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  code?: string;
  attemptsLeft?: number;
  constructor(message: string, extra: { code?: string; attemptsLeft?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = extra.code;
    this.attemptsLeft = extra.attemptsLeft;
  }
}

/** True when the request never reached the server (offline, DNS, timeout). */
export const isNetworkError = (err: any): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(err?.message || '').toLowerCase();
  return (
    err?.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('load failed')
  );
};

const fail = (error: { message: string; code?: string }): never => {
  throw new ApiError(error.message, { code: error.code });
};

/* -------------------------------------------------------------------------- */
/*  Column lists and mappers                                                   */
/* -------------------------------------------------------------------------- */

// Never select('*') on users: the password columns must not leave the database.
const USER_COLS =
  'id,name,email,phone,role,avatar,dob,created_at,status,login_attempts,block_reason,created_by,visit_target';

// List queries skip the two base64 photos; VisitDetails loads them with select('*').
const VISIT_LIST_COLS =
  'id,representative_id,representative_name,company_name,phone_number,contact_person,' +
  'timestamp,location,notes,category,lead_id,visit_purpose,interaction_outcome,next_follow_up,attendance_id';

/** Keeps the original snake_case keys and adds the camelCase keys the pages read. */
const mapVisit = (r: any) => ({
  ...r,
  leadId: r.lead_id,
  companyName: r.company_name,
  representativeId: r.representative_id,
  representativeName: r.representative_name,
  contactPerson: r.contact_person,
  phoneNumber: r.phone_number,
  interactionOutcome: r.interaction_outcome,
  visitPurpose: r.visit_purpose,
  nextFollowUp: r.next_follow_up,
  boardPhoto: r.board_photo,
  repPhoto: r.rep_photo
});

const mapUser = (r: any) => ({
  ...r,
  createdAt: r.created_at,
  loginAttempts: r.login_attempts,
  blockReason: r.block_reason,
  visitTarget: r.visit_target,
  createdBy: r.created_by
});

const mapLead = (l: any) => ({
  id: l.id,
  companyName: l.company_name,
  contactPerson: l.contact_person,
  phone: l.phone,
  email: l.email,
  address: l.address,
  status: l.status,
  estimatedValue: Number(l.estimated_value || 0),
  assignedTo: l.assigned_to,
  createdAt: l.created_at,
  updatedAt: l.updated_at
});

const num = (v: any) => (v === null || v === undefined ? undefined : Number(v));

/** settings table row (or the public subset) -> the camelCase shape the app uses. */
const mapSettings = (d: any) => {
  const out: Record<string, any> = {
    companyName: d.company_name,
    contactNo: d.contact_no,
    email: d.email,
    address: d.address,
    gstNumber: d.gst_number,
    psaraLicense: d.psara_license,
    directorName: d.director_name,
    logo: d.logo,
    sealImage: d.seal_image,
    labourRegNo: d.labour_reg_no,
    epfCode: d.epf_code,
    esicRegNo: d.esic_reg_no,
    ptLicenseNo: d.pt_license_no,
    panNumber: d.pan_number,
    guardBasic12: num(d.guard_basic_12),
    guardBasic8: num(d.guard_basic_8),
    supervisorBasic12: num(d.supervisor_basic_12),
    supervisorBasic8: num(d.supervisor_basic_8),
    gunmanBasic12: num(d.gunman_basic_12),
    gunmanBasic8: num(d.gunman_basic_8),
    housekeepingBasic12: num(d.housekeeping_basic_12),
    housekeepingBasic8: num(d.housekeeping_basic_8),
    flatGuard12: num(d.flat_guard_12),
    flatGuard8: num(d.flat_guard_8),
    flatSupervisor12: num(d.flat_supervisor_12),
    flatSupervisor8: num(d.flat_supervisor_8),
    flatGunman12: num(d.flat_gunman_12),
    flatGunman8: num(d.flat_gunman_8),
    flatHousekeeping12: num(d.flat_housekeeping_12),
    flatHousekeeping8: num(d.flat_housekeeping_8),
    overtimePercent: num(d.overtime_percent),
    reliverPercent: num(d.reliver_percent),
    epfPercent: num(d.epf_percent),
    esicPercent: num(d.esic_percent),
    lwfAmount: num(d.lwf_amount),
    uniformKitAmount: num(d.uniform_kit_amount),
    defaultServiceMargin: num(d.default_service_margin)
  };
  // Drop empty keys so they never overwrite the app defaults.
  Object.keys(out).forEach((k) => (out[k] === undefined || out[k] === null) && delete out[k]);
  return out;
};

const parseBody = (options: RequestInit) => (options.body ? JSON.parse(options.body as string) : {});
const idFromPath = (endpoint: string) => endpoint.split('?')[0].split('/').filter(Boolean)[1] || null;
const queryOf = (endpoint: string) => new URL(`http://localhost${endpoint}`).searchParams;

/* -------------------------------------------------------------------------- */
/*  API                                                                        */
/* -------------------------------------------------------------------------- */

export const api = {
  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const method = (options.method || 'GET').toUpperCase();

    try {
      /* ------------------------------ Auth ------------------------------- */
      if (endpoint === '/auth/login') {
        const body = parseBody(options);
        const { data, error } = await supabase.rpc('app_login', {
          p_identifier: String(body.username || '').trim(),
          p_password: body.password || '',
          p_device: typeof navigator !== 'undefined' ? navigator.userAgent : null
        });
        if (error) fail(error);
        if (!data?.success) {
          throw new ApiError(data?.message || 'Login failed.', { attemptsLeft: data?.attemptsLeft });
        }
        return data;
      }

      if (endpoint === '/auth/me') {
        const { data, error } = await supabase.rpc('app_me');
        if (error) fail(error);
        return data; // null when the session is missing, expired or blocked
      }

      if (endpoint === '/auth/logout') {
        await supabase.rpc('app_logout');
        return { success: true };
      }

      /* ------------------------------ Stats ------------------------------ */
      if (endpoint === '/stats') {
        const count = async (table: string) => {
          const res = await supabase.from(table).select('id', { count: 'exact', head: true });
          return res.error ? 0 : res.count || 0;
        };
        const [visits, users, leads] = await Promise.all([count('visits'), count('users'), count('leads')]);
        return { visits, users, leads };
      }

      /* ------------------------------ Users ------------------------------ */
      if (endpoint.startsWith('/users')) {
        const targetUserId = idFromPath(endpoint);

        if (method === 'POST') {
          const b = parseBody(options);
          const { data, error } = await supabase.rpc('app_create_user', {
            p: {
              id: b.id,
              name: b.name,
              email: b.email,
              phone: b.phone,
              password: b.password,
              role: b.role,
              avatar: b.avatar || '/assets/img/logo/logo.png',
              dob: b.dob || null,
              status: b.status || 'ACTIVE',
              visit_target: b.visitTarget ?? b.visit_target ?? 100
            }
          });
          if (error) fail(error);
          return data;
        }

        if (method === 'PATCH' && targetUserId) {
          const b = parseBody(options);

          if (b.password !== undefined) {
            const { error } = await supabase.rpc('app_set_password', {
              p_user_id: targetUserId,
              p_password: b.password
            });
            if (error) fail(error);
          }

          const update: Record<string, any> = {};
          if (b.status !== undefined) update.status = b.status;
          if (b.blockReason !== undefined || b.block_reason !== undefined) {
            update.block_reason = b.blockReason ?? b.block_reason;
          }
          if (b.loginAttempts !== undefined || b.login_attempts !== undefined) {
            update.login_attempts = b.loginAttempts ?? b.login_attempts;
          }
          if (b.visitTarget !== undefined || b.visit_target !== undefined) {
            update.visit_target = b.visitTarget ?? b.visit_target;
          }

          if (Object.keys(update).length === 0) return { success: true };

          const { data, error } = await supabase
            .from('users')
            .update(update)
            .eq('id', targetUserId)
            .select(USER_COLS)
            .maybeSingle();
          if (error) fail(error);
          if (!data) throw new ApiError('Update not permitted or user not found.', { code: '42501' });
          return mapUser(data);
        }

        if (method === 'DELETE' && targetUserId) {
          const { error } = await supabase.from('users').delete().eq('id', targetUserId);
          if (error) fail(error);
          return { success: true };
        }

        const { data, error } = await supabase.from('users').select(USER_COLS).order('name', { ascending: true });
        if (error) fail(error);
        return (data || []).map(mapUser);
      }

      /* ------------------------------ Visits ----------------------------- */
      if (endpoint.startsWith('/visits') || endpoint.startsWith('/logs')) {
        const targetVisitId = idFromPath(endpoint);

        // Single record, including photos
        if (targetVisitId && method === 'GET') {
          const { data, error } = await supabase.from('visits').select('*').eq('id', targetVisitId).maybeSingle();
          if (error) fail(error);
          return data ? mapVisit(data) : null;
        }

        if (method === 'POST') {
          const b = parseBody(options);
          const rawLeadId = b.lead_id || b.leadId || null;
          const payload: Record<string, any> = {
            id: b.id,
            representative_id: b.representative_id || b.representativeId || null,
            representative_name: b.representative_name || b.representativeName || 'Field Officer',
            company_name: b.company_name || b.companyName || '',
            category: b.category || 'COMMERCIAL COMPLEX',
            phone_number: b.phone_number || b.phoneNumber || b.phone || '',
            contact_person: b.contact_person || b.contactPerson || '',
            timestamp: b.timestamp || new Date().toISOString(),
            location: b.location || null,
            board_photo: b.board_photo || b.boardPhoto || null,
            rep_photo: b.rep_photo || b.repPhoto || null,
            notes: b.notes || '',
            lead_id: rawLeadId && String(rawLeadId).startsWith('LEAD-') ? rawLeadId : null,
            visit_purpose: b.visit_purpose || b.visitPurpose || 'COLD_CALL',
            interaction_outcome: b.interaction_outcome || b.interactionOutcome || 'DISCUSSED',
            next_follow_up: b.next_follow_up || b.nextFollowUp || null
          };

          let res = await supabase.from('visits').insert([payload]).select(VISIT_LIST_COLS).single();

          // Foreign-key recovery: the lead may not exist on the server yet
          if (res.error?.code === '23503' && res.error.message.includes('visits_lead_id_fkey')) {
            payload.lead_id = null;
            res = await supabase.from('visits').insert([payload]).select(VISIT_LIST_COLS).single();
          }
          if (res.error) fail(res.error);
          return mapVisit(res.data);
        }

        // List
        const params = queryOf(endpoint);
        const repId = params.get('rep_id');
        const since = params.get('since');
        const limit = Math.min(Number(params.get('limit')) || 500, 2000);

        let query = supabase.from('visits').select(VISIT_LIST_COLS);
        if (repId) query = query.eq('representative_id', repId);
        if (since) query = query.gte('timestamp', since);

        const { data, error } = await query.order('timestamp', { ascending: false }).limit(limit);
        if (error) fail(error);
        return (data || []).map(mapVisit);
      }

      /* ------------------------------ Leads ------------------------------ */
      if (endpoint.startsWith('/leads')) {
        const targetLeadId = idFromPath(endpoint);

        if (method === 'POST') {
          const b = parseBody(options);
          const payload = {
            id: b.id,
            company_name: b.company_name || b.companyName || '',
            contact_person: b.contact_person || b.contactPerson || '',
            phone: b.phone || b.phoneNumber || '',
            address: b.address || null,
            status: b.status || 'PROSPECT',
            estimated_value: Number(b.estimated_value ?? b.estimatedValue ?? 0),
            assigned_to: b.assigned_to || b.assignedTo || null,
            created_at: b.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const { data, error } = await supabase.from('leads').insert([payload]).select().single();
          if (error) fail(error);
          return mapLead(data);
        }

        if (method === 'PATCH' && targetLeadId) {
          const b = parseBody(options);
          const update: Record<string, any> = { updated_at: new Date().toISOString() };
          if (b.status !== undefined) update.status = b.status;
          if (b.address !== undefined) update.address = b.address;
          if (b.estimated_value !== undefined || b.estimatedValue !== undefined) {
            update.estimated_value = Number(b.estimated_value ?? b.estimatedValue);
          }
          if (b.assigned_to !== undefined || b.assignedTo !== undefined) {
            update.assigned_to = b.assigned_to ?? b.assignedTo;
          }
          const { data, error } = await supabase.from('leads').update(update).eq('id', targetLeadId).select().maybeSingle();
          if (error) fail(error);
          if (!data) throw new ApiError('Update not permitted or lead not found.', { code: '42501' });
          return mapLead(data);
        }

        const assignedTo = queryOf(endpoint).get('assignedTo') || queryOf(endpoint).get('assigned_to');
        let query = supabase.from('leads').select('*');
        if (assignedTo) query = query.eq('assigned_to', assignedTo);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) fail(error);
        return (data || []).map(mapLead);
      }

      /* ---------------------------- Attendance --------------------------- */
      if (endpoint.startsWith('/attendance')) {
        const targetId = idFromPath(endpoint);

        if (method === 'POST') {
          const b = parseBody(options);
          const payload = {
            id: b.id,
            user_id: b.user_id || b.userId,
            user_name: b.user_name || b.userName,
            punch_in: b.punch_in || b.punchIn || new Date().toISOString(),
            punch_out: b.punch_out || b.punchOut || null,
            date: b.date || new Date().toISOString().split('T')[0],
            selfie: b.selfie || null,
            punch_in_location:
              b.punch_in_location || (b.latitude ? { latitude: b.latitude, longitude: b.longitude } : null),
            punch_out_location: b.punch_out_location || null,
            status: b.status || 'IN_PROGRESS',
            total_visits_logged: b.total_visits_logged ?? 0,
            daily_target: b.daily_target ?? 7,
            exception_reason: b.exception_reason || null
          };
          const { data, error } = await supabase.from('attendance').insert([payload]).select().single();
          if (error) fail(error);
          return data;
        }

        if (method === 'PATCH' && targetId) {
          const b = parseBody(options);
          const update: Record<string, any> = {};
          if (b.punch_out !== undefined || b.punchOut !== undefined) update.punch_out = b.punch_out ?? b.punchOut;
          if (b.punch_out_location !== undefined || b.punchOutLocation !== undefined) {
            update.punch_out_location = b.punch_out_location ?? b.punchOutLocation;
          }
          if (b.status !== undefined) update.status = b.status;
          if (b.exception_reason !== undefined || b.exceptionReason !== undefined) {
            update.exception_reason = b.exception_reason ?? b.exceptionReason;
          }
          if (b.total_visits_logged !== undefined || b.totalVisitsLogged !== undefined) {
            update.total_visits_logged = b.total_visits_logged ?? b.totalVisitsLogged;
          }
          const { data, error } = await supabase.from('attendance').update(update).eq('id', targetId).select().maybeSingle();
          if (error) fail(error);
          if (!data) throw new ApiError('Update not permitted or record not found.', { code: '42501' });
          return data;
        }

        const params = queryOf(endpoint);
        const userId = params.get('userId') || params.get('user_id');
        const date = params.get('date');
        let query = supabase.from('attendance').select('*');
        if (userId) query = query.eq('user_id', userId);
        if (date) query = query.eq('date', date);
        const { data, error } = await query.order('punch_in', { ascending: false }).limit(300);
        if (error) fail(error);
        return data || [];
      }

      /* ----------------------------- Proposals --------------------------- */
      if (endpoint.startsWith('/proposals')) {
        if (method === 'POST') {
          const body = parseBody(options);
          const { data, error } = await supabase.from('proposals').insert([body]).select().single();
          if (error) {
            console.warn('Proposal saved on this device only:', error.message);
            const existing = JSON.parse(localStorage.getItem('vsf_proposals') || '[]');
            existing.unshift(body);
            localStorage.setItem('vsf_proposals', JSON.stringify(existing));
            return body;
          }
          return data;
        }
        const { data, error } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
        if (error || !data) return JSON.parse(localStorage.getItem('vsf_proposals') || '[]');
        return data;
      }

      /* --------------------------- Notifications ------------------------- */
      if (endpoint.startsWith('/notifications')) {
        if (method === 'POST') {
          const body = parseBody(options);
          const { data, error } = await supabase.from('notifications').insert([body]).select().single();
          if (error) fail(error);
          return data;
        }
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) fail(error);
        return data || [];
      }

      /* ------------------------------ Settings --------------------------- */
      if (endpoint === '/settings') {
        // Writes go through the Settings page (admin policy); this only refreshes the local cache.
        if (method === 'POST') {
          const newSettings = parseBody(options);
          localStorage.setItem('vsf_app_settings', JSON.stringify(newSettings));
          return newSettings;
        }

        const cached = () => {
          const raw = localStorage.getItem('vsf_app_settings');
          return raw ? JSON.parse(raw) : null;
        };

        try {
          let mapped: Record<string, any> | null = null;

          if (getSessionToken()) {
            const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
            if (data) mapped = mapSettings(data);
          }
          if (!mapped) {
            const { data } = await supabase.rpc('app_public_settings');
            if (data) mapped = mapSettings(data);
          }
          if (mapped && Object.keys(mapped).length > 0) {
            localStorage.setItem('vsf_app_settings', JSON.stringify({ ...(cached() || {}), ...mapped }));
            return mapped;
          }
        } catch (err) {
          console.warn('Settings fetch fell back to cached copy:', err);
        }
        return cached();
      }

      throw new ApiError(`Unknown endpoint: ${endpoint}`);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return null;
      throw err;
    }
  }
};
