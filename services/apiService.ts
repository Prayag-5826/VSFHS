import { createClient } from '@supabase/supabase-js';
import { Visit, User, Role, AppSettings, Attendance, Lead } from '../types';

// Live Supabase Credentials provided by user
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const trimmedEndpoint = endpoint.trim();
    const fullPath = trimmedEndpoint.startsWith('/') ? trimmedEndpoint : `/${trimmedEndpoint}`;

    // Parse URL to separate pathname from search parameters
    const url = new URL(fullPath, 'http://localhost');
    const path = url.pathname;
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : null;

    try {
      // --- AUTHENTICATION ENGINE ---
      if (path === '/auth/login' && method === 'POST') {
        const username = body.username.trim();

        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .or(`id.eq."${username}",email.eq."${username}"`)
          .maybeSingle();

        if (fetchError) throw new Error(fetchError.message);
        if (!user) throw new Error('Personnel ID or Email not found in database');

        if (user.status === 'BLOCKED') {
          throw new Error('Access Revoked: User is blocked. Contact administrator.');
        }
        if (user.status === 'PENDING_APPROVAL') {
          throw new Error('Access Pending: Account awaiting admin authorization.');
        }
        if (user.status !== 'ACTIVE') {
          throw new Error(`Access Denied: Account status is ${user.status}`);
        }

        // STRICTOR GATEWAY ENFORCEMENT: Block Admins from logging in via standard employee terminal paths
        // The frontend AdminLogin will pass a designated header or parameter to skip this check
        // STRICTOR GATEWAY ENFORCEMENT: Track the active browser hash string route directly
        const isMasterPortal = typeof window !== 'undefined' && window.location.hash.includes('vsfhs-master-portal');

        if (user.role === 'ADMIN' && !isMasterPortal) {
          throw new Error('Administrative profiles must authenticate via the secure master portal.');
        }

        if (user.password !== body.password) {
          if (user.role === 'FIELD_REP' || user.role === 'SR_FIELD_EXECUTIVE') {
            const newAttempts = (user.login_attempts || 0) + 1;
            const updates: any = { login_attempts: newAttempts };
            let errorMessage = 'Security alert: Incorrect password entered.';
            const attemptsLeft = 5 - newAttempts;

            if (newAttempts >= 5) {
              updates.status = 'BLOCKED';
              updates.block_reason = 'Security lockout: Max login attempts (5) exceeded';
              errorMessage = 'Terminal Locked: Maximum attempts reached. Contact admin.';
            } else if (newAttempts >= 3) {
              errorMessage = `Security alert: Incorrect password. ${attemptsLeft} attempts remaining before lockout.`;
            }

            await supabase.from('users').update(updates).eq('id', user.id);
            const err: any = new Error(errorMessage);
            err.attemptsLeft = attemptsLeft;
            throw err;
          } else {
            throw new Error('Administrative Error: Incorrect passkey.');
          }
        }

        if ((user.role === 'FIELD_REP' || user.role === 'SR_FIELD_EXECUTIVE') && user.login_attempts > 0) {
          await supabase.from('users').update({ login_attempts: 0 }).eq('id', user.id);
        }

        return {
          access_token: 'cloud_jwt_' + Date.now(),
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as Role,
            status: user.status,
            avatar: user.avatar,
            visitTarget: user.visit_target
          }
        };
      }

      // --- ATTENDANCE ---
      if (path === '/attendance') {
        if (method === 'GET') {
          const userId = url.searchParams.get('userId');
          const date = url.searchParams.get('date');
          let query = supabase.from('attendance').select('*');
          if (userId) query = query.eq('user_id', userId);
          if (date) query = query.eq('date', date);

          const { data, error } = await query;
          if (error) throw new Error(`Attendance fetch failed: ${error.message}`);
          return (data || []).map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            userName: a.user_name,
            punchIn: a.punch_in,
            date: a.date,
            selfie: a.selfie
          }));
        }
        if (method === 'POST') {
          const { error } = await supabase.from('attendance').insert([{
            id: body.id,
            user_id: body.userId,
            user_name: body.userName,
            punch_in: body.punchIn,
            date: body.date,
            selfie: body.selfie
          }]);
          if (error) throw new Error(`Attendance recording failed: ${error.message}`);
          return { success: true };
        }
      }

      // --- PIPELINE ENGINE: LEADS ---
      if (path === '/leads' || path.startsWith('/leads/')) {
        if (method === 'GET') {
          const leadId = path.split('/')[2];
          if (leadId) {
            const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
            if (error) throw new Error(`Lead record ${leadId} not found: ${error.message}`);
            return {
              id: data.id,
              companyName: data.company_name,
              contactPerson: data.contact_person,
              phone: data.phone,
              email: data.email,
              address: data.address,
              status: data.status,
              estimatedValue: Number(data.estimated_value || 0),
              assignedTo: data.assigned_to,
              createdAt: data.created_at,
              updatedAt: data.updated_at
            };
          }

          const assignedTo = url.searchParams.get('assignedTo');
          let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
          if (assignedTo) query = query.eq('assigned_to', assignedTo);

          const { data, error } = await query;
          if (error) throw new Error(`Leads fetch failed: ${error.message}`);
          return (data || []).map((l: any) => ({
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
          }));
        }

        if (method === 'POST') {
          const { data, error } = await supabase.from('leads').insert([{
            id: body.id,
            company_name: body.companyName,
            contact_person: body.contactPerson,
            phone: body.phone,
            email: body.email,
            address: body.address,
            status: body.status || 'PROSPECT',
            estimated_value: body.estimatedValue || 0,
            assigned_to: body.assignedTo
          }]).select();

          if (error) throw new Error(`Lead creation failed: ${error.message}`);
          return data[0];
        }

        if (method === 'PATCH') {
          const leadId = path.split('/')[2];
          if (leadId) {
            const updatePayload: any = { updated_at: new Date().toISOString() };
            if (body.status) updatePayload.status = body.status;
            if (body.estimatedValue !== undefined) updatePayload.estimated_value = body.estimatedValue;
            if (body.companyName) updatePayload.company_name = body.companyName;
            if (body.contactPerson) updatePayload.contact_person = body.contactPerson;
            if (body.phone) updatePayload.phone = body.phone;

            const { error } = await supabase.from('leads').update(updatePayload).eq('id', leadId);
            if (error) throw new Error(`Lead pipeline update failed: ${error.message}`);
            return { success: true };
          }
        }
      }

      // --- VISITS (WITH FIELD MARKETING CONVERSIONS) ---
      if (path === '/visits' || path.startsWith('/visits/')) {
        if (method === 'GET') {
          const visitId = path.split('/')[2];
          if (visitId) {
            const { data, error } = await supabase.from('visits').select('*').eq('id', visitId).single();
            if (error) throw new Error(`Visit record ${visitId} not found: ${error.message}`);
            return {
              id: data.id,
              representativeId: data.representative_id,
              representativeName: data.representative_name,
              companyName: data.company_name,
              category: data.category || 'GENERAL',
              phoneNumber: data.phone_number,
              contactPerson: data.contact_person,
              timestamp: data.timestamp,
              location: data.location,
              boardPhoto: data.board_photo,
              repPhoto: data.rep_photo,
              notes: data.notes,
              leadId: data.lead_id,
              visitPurpose: data.visit_purpose || 'COLD_CALL',
              interactionOutcome: data.interaction_outcome || 'DISCUSSED',
              nextFollowUp: data.next_follow_up
            };
          }

          const repId = url.searchParams.get('rep_id');
          let query = supabase.from('visits').select('*').order('timestamp', { ascending: false });
          if (repId) query = query.eq('representative_id', repId);

          const { data, error } = await query;
          if (error) throw new Error(`Visit logs fetch failed: ${error.message}`);
          return (data || []).map((v: any) => ({
            id: v.id,
            representativeId: v.representative_id,
            representativeName: v.representative_name,
            companyName: v.company_name,
            category: v.category || 'GENERAL',
            phoneNumber: v.phone_number,
            contactPerson: v.contact_person,
            timestamp: v.timestamp,
            location: v.location,
            boardPhoto: v.board_photo,
            repPhoto: v.rep_photo,
            notes: v.notes,
            leadId: v.lead_id,
            visitPurpose: v.visit_purpose || 'COLD_CALL',
            interactionOutcome: v.interaction_outcome || 'DISCUSSED',
            nextFollowUp: v.next_follow_up
          }));
        }

        if (method === 'POST') {
          const { data, error } = await supabase.from('visits').insert([{
            id: body.id,
            representative_id: body.representativeId,
            representative_name: body.representativeName,
            company_name: body.companyName,
            category: body.category,
            phone_number: body.phoneNumber,
            contact_person: body.contactPerson,
            timestamp: body.timestamp,
            location: body.location,
            board_photo: body.boardPhoto,
            rep_photo: body.repPhoto,
            notes: body.notes,
            lead_id: body.leadId,
            visit_purpose: body.visitPurpose || 'COLD_CALL',
            interaction_outcome: body.interactionOutcome || 'DISCUSSED',
            next_follow_up: body.nextFollowUp
          }]).select();

          if (error) throw new Error(`Deployment record failed: ${error.message}`);
          return data[0];
        }
      }

      // --- USERS ---
      if (path === '/users' || path.startsWith('/users/')) {
        if (method === 'GET') {
          const { data, error } = await supabase.from('users').select('*');
          if (error) throw new Error(`Personnel roster fetch failed: ${error.message}`);
          return (data || []).map((u: any) => ({
            ...u,
            visitTarget: u.visit_target,
            loginAttempts: u.login_attempts,
            blockReason: u.block_reason,
            createdBy: u.created_by
          }));
        }

        if (method === 'PATCH') {
          const userId = path.split('/')[2];
          if (userId) {
            const updatePayload: any = {};
            if (body.password) updatePayload.password = body.password;
            if (body.status) updatePayload.status = body.status;
            if (body.blockReason !== undefined) updatePayload.block_reason = body.blockReason;
            if (body.loginAttempts !== undefined) updatePayload.login_attempts = body.loginAttempts;
            if (body.visitTarget !== undefined) updatePayload.visit_target = body.visitTarget;

            const { error } = await supabase.from('users').update(updatePayload).eq('id', userId);
            if (error) throw new Error(`Personnel update failed: ${error.message}`);
            return { success: true };
          }
        }

        if (method === 'POST') {
          const { data, error } = await supabase.from('users').insert([{
            id: body.id,
            name: body.name,
            email: body.email,
            phone: body.phone,
            password: body.password,
            role: body.role,
            avatar: body.avatar,
            dob: body.dob,
            status: body.status,
            login_attempts: body.loginAttempts,
            visit_target: body.visitTarget || 100,
            created_by: body.createdBy
          }]).select();
          if (error) throw new Error(`Personnel registration failed: ${error.message}`);
          return data[0];
        }

        if (method === 'DELETE') {
          const userId = path.split('/')[2];
          if (userId) {
            // First scrub user dependencies from attendance due to foreign key constraints
            const { error: attendanceErr } = await supabase.from('attendance').delete().eq('user_id', userId);
            if (attendanceErr) throw new Error(`Failed to scrub user attendance records: ${attendanceErr.message}`);

            // Proceed safely with the user deletion process
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) throw new Error(`Personnel deletion failed: ${error.message}`);
            return { success: true };
          }
        }
      }

      // --- SETTINGS ---
      if (path === '/settings') {
        if (method === 'GET') {
          const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
          if (error) return null;
          return { companyName: data.company_name, logo: data.logo, contactNo: data.contact_no };
        }
        if (method === 'POST' || method === 'PUT') {
          const { error } = await supabase.from('settings').upsert({ id: 1, company_name: body.companyName, logo: body.logo, contact_no: body.contactNo });
          if (error) throw new Error(`Configuration update failed: ${error.message}`);
          return body;
        }
      }

      // --- GLOBAL STATS ENGINE ---
      if (path === '/stats' && method === 'GET') {
        const { count: visitCount, error: vErr } = await supabase.from('visits').select('*', { count: 'exact', head: true });
        const { count: userCount, error: uErr } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: leadCount, error: lErr } = await supabase.from('leads').select('*', { count: 'exact', head: true });

        if (vErr) console.warn("Visits stats error:", vErr.message);
        if (uErr) console.warn("Users stats error:", uErr.message);
        if (lErr) console.warn("Leads stats error:", lErr.message);

        return {
          visits: visitCount || 0,
          users: userCount || 0,
          leads: leadCount || 0
        };
      }

      throw new Error(`System Error: Unhandled endpoint ${method} ${path}`);
    } catch (err: any) {
      const finalMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      const errorToThrow: any = new Error(finalMessage);
      if (err.attemptsLeft !== undefined) errorToThrow.attemptsLeft = err.attemptsLeft;
      throw errorToThrow;
    }
  }
};
