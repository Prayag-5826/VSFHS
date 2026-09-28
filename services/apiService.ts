import { createClient } from '@supabase/supabase-js';

// Safe environment variable retriever for both Vite (import.meta.env) and Node (process.env)
const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore: Vite env handling
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {
    // Fallthrough if import.meta is unavailable
  }

  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.[key]) {
      return (globalThis as any).process.env[key];
    }
  } catch {
    // Fallthrough if process is unavailable
  }

  return undefined;
};

const SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
  'https://czbohynimtodyhlftbbn.supabase.co';

const SUPABASE_ANON_KEY =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Ym9oeW5pbXRvZHlobGZ0YmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDQ3MjUsImV4cCI6MjA4MzYyMDcyNX0.z0dIYr7AQ4_BMS--QaiBPUAgTYRGPC3oWzRi4aB2UyA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

export const getActiveCredentials = () => {
  if (typeof window === 'undefined') return { token: null, user: null };

  const token = localStorage.getItem('vs_token') || getCookie('vsf_universal_token');
  let user = null;

  try {
    const rawUser = localStorage.getItem('vs_active_user') || getCookie('vsf_user_session');
    if (rawUser) {
      user = JSON.parse(rawUser);
    }
  } catch (e) {
    console.warn('Could not parse user credentials:', e);
  }

  return { token, user };
};

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const { token } = getActiveCredentials();

    try {
      // 1. Authentication
      if (endpoint === '/auth/login') {
        const body = options.body ? JSON.parse(options.body as string) : {};
        const username = (body.username || '').trim();
        const password = body.password || '';

        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .or(`id.eq.${username},email.eq.${username},phone.eq.${username}`)
          .maybeSingle();

        if (error || !user) {
          throw new Error('User not found in central operations database.');
        }

        if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
          throw new Error(`Account suspended: ${user.block_reason || 'Contact Operations Desk'}`);
        }

        if (user.password !== password) {
          throw new Error('Invalid security password.');
        }

        return {
          success: true,
          access_token: `token-${user.id}-${Date.now()}`,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar || '/assets/img/logo/logo.png',
            status: user.status,
          },
        };
      }

      // 2. High-Level Metrics
      if (endpoint === '/stats') {
        const [visitsRes, usersRes, leadsRes] = await Promise.allSettled([
          supabase.from('visits').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('leads').select('*', { count: 'exact', head: true }),
        ]);

        return {
          visits: visitsRes.status === 'fulfilled' && !visitsRes.value.error ? visitsRes.value.count || 0 : 0,
          users: usersRes.status === 'fulfilled' && !usersRes.value.error ? usersRes.value.count || 0 : 0,
          leads: leadsRes.status === 'fulfilled' && !leadsRes.value.error ? leadsRes.value.count || 0 : 0,
        };
      }

      // 3. User Management
      if (endpoint.startsWith('/users')) {
        const urlSegments = endpoint.split('/').filter(Boolean);
        const targetUserId = urlSegments.length === 2 ? urlSegments[1] : null;

        if (options.method === 'POST') {
          const body = options.body ? JSON.parse(options.body as string) : {};

          const userPayload = {
            id: body.id,
            name: body.name,
            email: body.email,
            phone: body.phone,
            password: body.password,
            role: body.role,
            avatar: body.avatar || '/assets/img/logo/logo.png',
            dob: body.dob || null,
            status: body.status || 'ACTIVE',
            visit_target: body.visitTarget || body.visit_target || 100,
            login_attempts: 0,
            created_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('users')
            .insert([userPayload])
            .select()
            .single();

          if (error) {
            console.error('Supabase User Insert Error:', error);
            throw new Error(error.message);
          }

          return data;
        }

        if (options.method === 'PATCH' && targetUserId) {
          const body = options.body ? JSON.parse(options.body as string) : {};
          const updatePayload: Record<string, any> = {};

          if (body.status !== undefined) updatePayload.status = body.status;
          if (body.blockReason !== undefined || body.block_reason !== undefined) {
            updatePayload.block_reason = body.blockReason ?? body.block_reason;
          }
          if (body.password !== undefined) updatePayload.password = body.password;
          if (body.loginAttempts !== undefined || body.login_attempts !== undefined) {
            updatePayload.login_attempts = body.loginAttempts ?? body.login_attempts;
          }
          if (body.visitTarget !== undefined || body.visit_target !== undefined) {
            updatePayload.visit_target = body.visitTarget ?? body.visit_target;
          }

          const { data, error } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', targetUserId)
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
        }

        if (options.method === 'DELETE' && targetUserId) {
          const { data, error } = await supabase
            .from('users')
            .delete()
            .eq('id', targetUserId);

          if (error) throw new Error(error.message);
          return { success: true, data };
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
      }

      // 4. Visits & Inspection Logs (Fail-Safe Insert & Foreign Key Recovery)
      if (endpoint.startsWith('/visits') || endpoint.startsWith('/logs')) {
        const urlSegments = endpoint.split('?')[0].split('/').filter(Boolean);
        const targetVisitId = urlSegments.length === 2 ? urlSegments[1] : null;

        // A. SINGLE RECORD LOOKUP (/visits/:id)
        if (targetVisitId && (!options.method || options.method === 'GET')) {
          const { data, error } = await supabase
            .from('visits')
            .select('*')
            .eq('id', targetVisitId)
            .maybeSingle();

          if (!error && data) return data;
        }

        // B. HANDLE INSERT (POST)
        if (options.method === 'POST') {
          const body = options.body ? JSON.parse(options.body as string) : {};

          // Verify foreign key integrity before inserting
          const rawLeadId = body.lead_id || body.leadId || null;
          const safeLeadId = (rawLeadId && String(rawLeadId).startsWith('LEAD-'))
            ? rawLeadId
            : null;

          const visitPayload: Record<string, any> = {
            id: body.id,
            representative_id: body.representative_id || body.representativeId || null,
            representative_name: body.representative_name || body.representativeName || 'Field Officer',
            company_name: body.company_name || body.companyName || '',
            category: body.category || 'COMMERCIAL COMPLEX',
            phone_number: body.phone_number || body.phoneNumber || body.phone || '',
            contact_person: body.contact_person || body.contactPerson || '',
            timestamp: body.timestamp || new Date().toISOString(),
            location: body.location || null,
            board_photo: body.board_photo || body.boardPhoto || null,
            rep_photo: body.rep_photo || body.repPhoto || null,
            notes: body.notes || '',
            lead_id: safeLeadId,
            visit_purpose: body.visit_purpose || body.visitPurpose || 'COLD_CALL',
            interaction_outcome: body.interaction_outcome || body.interactionOutcome || 'DISCUSSED',
            next_follow_up: body.next_follow_up || body.nextFollowUp || null,
          };

          const { data, error } = await supabase
            .from('visits')
            .insert([visitPayload])
            .select()
            .single();

          if (error) {
            // Auto-fallback: if foreign key constraint failed on lead_id, retry once with lead_id = null
            if (error.code === '23503' && error.message.includes('visits_lead_id_fkey')) {
              console.warn('Foreign key lead_id missing in leads table. Retrying insert with lead_id = null...');
              visitPayload.lead_id = null;
              const retryRes = await supabase
                .from('visits')
                .insert([visitPayload])
                .select()
                .single();

              if (!retryRes.error) {
                return retryRes.data;
              }
            }

            console.error('Supabase Visit Insert Error:', error);
            throw new Error(error.message);
          }

          return data;
        }

        // C. HANDLE QUERY (GET)
        try {
          const urlObj = new URL(`http://localhost${endpoint}`);
          const repId = urlObj.searchParams.get('rep_id');

          let query = supabase.from('visits').select('*');

          if (repId) {
            query = query.eq('representative_id', repId);
          }

          const { data, error } = await query
            .order('timestamp', { ascending: false })
            .limit(50);

          if (error) {
            console.warn('Visits Supabase fetch fallback triggered:', error.message);
            const fallbackRes = await supabase.from('visits').select('*').limit(50);
            return fallbackRes.data || [];
          }

          return data || [];
        } catch (err) {
          console.warn('Visits fetch notice:', err);
          return [];
        }
      }

      // 5. Leads Pipeline (GET, POST, PATCH)
      if (endpoint.startsWith('/leads')) {
        const urlSegments = endpoint.split('?')[0].split('/').filter(Boolean);
        const targetLeadId = urlSegments.length === 2 ? urlSegments[1] : null;

        if (options.method === 'POST') {
          const body = options.body ? JSON.parse(options.body as string) : {};
          const leadPayload = {
            id: body.id,
            company_name: body.company_name || body.companyName || '',
            contact_person: body.contact_person || body.contactPerson || '',
            phone: body.phone || body.phoneNumber || '',
            address: body.address || null,
            status: body.status || 'PROSPECT',
            estimated_value: Number(body.estimated_value ?? body.estimatedValue ?? 0),
            assigned_to: body.assigned_to || body.assignedTo || null,
            created_at: body.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('leads')
            .insert([leadPayload])
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
        }

        if (options.method === 'PATCH' && targetLeadId) {
          const body = options.body ? JSON.parse(options.body as string) : {};
          const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          if (body.status !== undefined) updatePayload.status = body.status;
          if (body.address !== undefined) updatePayload.address = body.address;
          if (body.estimated_value !== undefined || body.estimatedValue !== undefined) {
            updatePayload.estimated_value = Number(body.estimated_value ?? body.estimatedValue);
          }
          if (body.assigned_to !== undefined || body.assignedTo !== undefined) {
            updatePayload.assigned_to = body.assigned_to ?? body.assignedTo;
          }

          const { data, error } = await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', targetLeadId)
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
        }

        const urlObj = new URL(`http://localhost${endpoint}`);
        const assignedTo = urlObj.searchParams.get('assignedTo') || urlObj.searchParams.get('assigned_to');

        let query = supabase.from('leads').select('*');
        if (assignedTo) {
          query = query.eq('assigned_to', assignedTo);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          console.warn('Leads fetch notice:', error.message);
          return [];
        }

        return (data || []).map((l: any) => ({
          id: l.id,
          companyName: l.company_name,
          contactPerson: l.contact_person,
          phone: l.phone,
          address: l.address,
          status: l.status,
          estimatedValue: l.estimated_value,
          assignedTo: l.assigned_to,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
        }));
      }

      // 6. Attendance & GPS Punches
      if (endpoint.startsWith('/attendance')) {
        const urlSegments = endpoint.split('?')[0].split('/').filter(Boolean);
        const targetAttendanceId = urlSegments.length === 2 ? urlSegments[1] : null;

        if (options.method === 'POST') {
          const body = options.body ? JSON.parse(options.body as string) : {};
          const attendancePayload = {
            id: body.id,
            user_id: body.user_id || body.userId,
            user_name: body.user_name || body.userName,
            punch_in: body.punch_in || body.punchIn || new Date().toISOString(),
            punch_out: body.punch_out || body.punchOut || null,
            date: body.date || new Date().toISOString().split('T')[0],
            selfie: body.selfie || null,
            punch_in_location: body.punch_in_location || (body.latitude ? { latitude: body.latitude, longitude: body.longitude } : null),
            punch_out_location: body.punch_out_location || null,
            status: body.status || 'IN_PROGRESS',
            total_visits_logged: body.total_visits_logged ?? 0,
            daily_target: body.daily_target ?? 7,
            exception_reason: body.exception_reason || null,
          };

          const { data, error } = await supabase
            .from('attendance')
            .insert([attendancePayload])
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
        }

        if (options.method === 'PATCH' && targetAttendanceId) {
          const body = options.body ? JSON.parse(options.body as string) : {};
          const updatePayload: Record<string, any> = {};

          if (body.punch_out !== undefined || body.punchOut !== undefined) {
            updatePayload.punch_out = body.punch_out ?? body.punchOut;
          }
          if (body.punch_out_location !== undefined || body.punchOutLocation !== undefined) {
            updatePayload.punch_out_location = body.punch_out_location ?? body.punchOutLocation;
          }
          if (body.status !== undefined) updatePayload.status = body.status;
          if (body.exception_reason !== undefined || body.exceptionReason !== undefined) {
            updatePayload.exception_reason = body.exception_reason ?? body.exceptionReason;
          }
          if (body.total_visits_logged !== undefined || body.totalVisitsLogged !== undefined) {
            updatePayload.total_visits_logged = body.total_visits_logged ?? body.totalVisitsLogged;
          }

          const { data, error } = await supabase
            .from('attendance')
            .update(updatePayload)
            .eq('id', targetAttendanceId)
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
        }

        const urlObj = new URL(`http://localhost${endpoint}`);
        const userId = urlObj.searchParams.get('userId') || urlObj.searchParams.get('user_id');
        const date = urlObj.searchParams.get('date');

        let query = supabase.from('attendance').select('*');
        if (userId) query = query.eq('user_id', userId);
        if (date) query = query.eq('date', date);

        const { data, error } = await query.order('punch_in', { ascending: false });
        if (error) {
          console.warn('Attendance fetch notice:', error.message);
          return [];
        }
        return data || [];
      }

      // 7. Commercial Proposals
      if (endpoint.startsWith('/proposals')) {
        if (options.method === 'POST') {
          const body = options.body ? JSON.parse(options.body as string) : {};
          const { data, error } = await supabase.from('proposals').insert([body]).select().single();
          if (error) {
            const existing = JSON.parse(localStorage.getItem('vsf_proposals') || '[]');
            existing.unshift(body);
            localStorage.setItem('vsf_proposals', JSON.stringify(existing));
            return body;
          }
          return data;
        }

        const { data, error } = await supabase.from('proposals').select('*');
        if (error || !data) {
          const stored = JSON.parse(localStorage.getItem('vsf_proposals') || '[]');
          return stored;
        }
        return data;
      }

      // 8. Notifications Broadcast
      if (endpoint.startsWith('/notifications')) {
        if (options.method === 'POST') {
          const body = options.body ? JSON.parse(options.body as string) : {};
          const { data, error } = await supabase.from('notifications').insert([body]).select().single();
          if (error) {
            const existing = JSON.parse(localStorage.getItem('vsf_broadcast_logs') || '[]');
            existing.unshift(body);
            localStorage.setItem('vsf_broadcast_logs', JSON.stringify(existing));
            return body;
          }
          return data;
        }

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data) {
          return JSON.parse(localStorage.getItem('vsf_broadcast_logs') || '[]');
        }
        return data;
      }

      // 9. App Settings
      if (endpoint === '/settings') {
        if (options.method === 'POST') {
          const newSettings = options.body ? JSON.parse(options.body as string) : {};
          localStorage.setItem('vsf_app_settings', JSON.stringify(newSettings));
          return newSettings;
        }

        const cachedSettings = localStorage.getItem('vsf_app_settings');
        return cachedSettings ? JSON.parse(cachedSettings) : null;
      }

      // Fallback
      const headers = new Headers(options.headers || {});
      if (token) headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');

      const response = await fetch(endpoint, { ...options, headers });
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        return null;
      }

      return await response.json();
    } catch (err: any) {
      if (
        err.name === 'AbortError' ||
        err.message?.includes('aborted') ||
        err.message?.includes('<!DOCTYPE')
      ) {
        return null;
      }
      throw err;
    }
  },
};
