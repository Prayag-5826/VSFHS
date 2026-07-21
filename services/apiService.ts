import { createClient } from '@supabase/supabase-js';
import { Visit, User, Role, AppSettings, Attendance, Lead } from '../types';

// Live Supabase Credentials
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
      // --- 1. AUTHENTICATION ENGINE ---
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

      // --- 2. ATTENDANCE ENGINE ---
      if (path === '/attendance' || path.startsWith('/attendance/')) {
        const attendanceId = path.split('/')[2];

        if (method === 'GET') {
          const userId = url.searchParams.get('userId');
          let rawDate = url.searchParams.get('date');

          // Scrub duplicate 'eq.' prefixes if passed by query parameters
          if (rawDate && rawDate.startsWith('eq.')) {
            rawDate = rawDate.replace(/^eq\./, '');
          }

          let query = supabase.from('attendance').select('*');
          if (userId) query = query.eq('user_id', userId);
          if (rawDate) query = query.eq('date', rawDate);

          const { data, error } = await query;
          if (error) throw new Error(`Attendance fetch failed: ${error.message}`);
          return (data || []).map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            userName: a.user_name,
            punchIn: a.punch_in,
            punchOut: a.punch_out,
            date: a.date,
            selfie: a.selfie,
            status: a.status,
            exceptionReason: a.exception_reason,
            totalVisitsLogged: a.total_visits_logged
          }));
        }

        if (method === 'POST') {
          const { error } = await supabase.from('attendance').insert([{
            id: body.id,
            user_id: body.userId,
            user_name: body.userName,
            punch_in: body.punchIn,
            date: body.date,
            selfie: body.selfie,
            status: body.status || 'COMPLETED',
            exception_reason: body.exceptionReason
          }]);
          if (error) throw new Error(`Attendance recording failed: ${error.message}`);
          return { success: true };
        }

        if (method === 'PATCH' && attendanceId) {
          const updatePayload: any = {};
          if (body.status) updatePayload.status = body.status;
          if (body.exceptionReason) updatePayload.exception_reason = body.exceptionReason;

          const { error } = await supabase.from('attendance').update(updatePayload).eq('id', attendanceId);
          if (error) throw new Error(`Attendance audit update failed: ${error.message}`);
          return { success: true };
        }
      }

      // --- 3. PROPOSALS & QUOTATIONS ENGINE (LINKED TO VISITS) ---
      if (path === '/proposals' || path.startsWith('/proposals/')) {
        const proposalId = path.split('/')[2];

        if (method === 'GET') {
          if (proposalId) {
            const { data, error } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
            if (error) throw new Error(`Proposal ${proposalId} not found: ${error.message}`);
            return {
              id: data.id,
              visitId: data.visit_id,
              clientName: data.client_name,
              clientAddress: data.client_address,
              clientPhone: data.client_phone,
              clientEmail: data.client_email,
              notificationRef: data.notification_ref,
              billingModel: data.billing_model || 'COMPLIANCE',
              guardCount: data.guard_count,
              supervisorCount: data.supervisor_count,
              gunmanCount: data.gunman_count,
              guardBasic: Number(data.guard_basic),
              supervisorBasic: Number(data.supervisor_basic),
              gunmanBasic: Number(data.gunman_basic),
              serviceChargePercent: Number(data.service_charge_percent),
              flatGuardRate: Number(data.flat_guard_rate || 15000),
              flatSupervisorRate: Number(data.flat_supervisor_rate || 18000),
              flatGunmanRate: Number(data.flat_gunman_rate || 22000),
              requestedById: data.requested_by_id,
              requestedByName: data.requested_by_name,
              status: data.status,
              createdAt: data.created_at
            };
          }

          const { data, error } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
          if (error) throw new Error(`Proposals fetch failed: ${error.message}`);
          return (data || []).map((p: any) => ({
            id: p.id,
            visitId: p.visit_id,
            clientName: p.client_name,
            clientAddress: p.client_address,
            clientPhone: p.client_phone,
            clientEmail: p.client_email,
            notificationRef: p.notification_ref,
            billingModel: p.billing_model || 'COMPLIANCE',
            guardCount: p.guard_count,
            supervisorCount: p.supervisor_count,
            gunmanCount: p.gunman_count,
            guardBasic: Number(p.guard_basic),
            supervisorBasic: Number(p.supervisor_basic),
            gunmanBasic: Number(p.gunman_basic),
            serviceChargePercent: Number(p.service_charge_percent),
            flatGuardRate: Number(p.flat_guard_rate || 15000),
            flatSupervisorRate: Number(p.flat_supervisor_rate || 18000),
            flatGunmanRate: Number(p.flat_gunman_rate || 22000),
            requestedById: p.requested_by_id,
            requestedByName: p.requested_by_name,
            status: p.status,
            createdAt: p.created_at
          }));
        }

        if (method === 'POST') {
          const { data, error } = await supabase.from('proposals').insert([{
            id: body.id,
            visit_id: body.visitId,
            client_name: body.clientName,
            client_address: body.clientAddress,
            client_phone: body.clientPhone,
            client_email: body.clientEmail,
            notification_ref: body.notificationRef || 'Notification No. 24862 Dated 01.10.2025',
            billing_model: body.billingModel || 'COMPLIANCE',
            guard_count: body.guardCount || 1,
            supervisor_count: body.supervisorCount || 0,
            gunman_count: body.gunmanCount || 0,
            guard_basic: body.guardBasic || 12150.00,
            supervisor_basic: body.supervisorBasic || 13146.00,
            gunman_basic: body.gunmanBasic || 14869.00,
            service_charge_percent: body.serviceChargePercent || 8.00,
            flat_guard_rate: body.flatGuardRate || 15000,
            flat_supervisor_rate: body.flatSupervisorRate || 18000,
            flat_gunman_rate: body.flatGunmanRate || 22000,
            requested_by_id: body.requestedById,
            requested_by_name: body.requestedByName,
            status: body.status || 'PENDING_APPROVAL'
          }]).select();

          if (error) throw new Error(`Proposal submission failed: ${error.message}`);
          return data[0];
        }

        if (method === 'PATCH' && proposalId) {
          const updatePayload: any = {};
          if (body.status) updatePayload.status = body.status;
          if (body.billingModel) updatePayload.billing_model = body.billingModel;
          if (body.guardBasic !== undefined) updatePayload.guard_basic = body.guardBasic;
          if (body.supervisorBasic !== undefined) updatePayload.supervisor_basic = body.supervisorBasic;
          if (body.gunmanBasic !== undefined) updatePayload.gunman_basic = body.gunmanBasic;
          if (body.serviceChargePercent !== undefined) updatePayload.service_charge_percent = body.serviceChargePercent;
          if (body.flatGuardRate !== undefined) updatePayload.flat_guard_rate = body.flatGuardRate;
          if (body.flatSupervisorRate !== undefined) updatePayload.flat_supervisor_rate = body.flatSupervisorRate;
          if (body.flatGunmanRate !== undefined) updatePayload.flat_gunman_rate = body.flatGunmanRate;

          const { error } = await supabase.from('proposals').update(updatePayload).eq('id', proposalId);
          if (error) throw new Error(`Proposal update failed: ${error.message}`);
          return { success: true };
        }
      }

      // --- 4. PIPELINE ENGINE: LEADS ---
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

      // --- 5. VISITS ---
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

      // --- 6. USERS ---
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
            const { error: attendanceErr } = await supabase.from('attendance').delete().eq('user_id', userId);
            if (attendanceErr) throw new Error(`Failed to scrub user attendance records: ${attendanceErr.message}`);

            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) throw new Error(`Personnel deletion failed: ${error.message}`);
            return { success: true };
          }
        }
      }

      // --- 7. SETTINGS (INCLUDES LOGO & STAMP SEAL IMAGES) ---
      if (path === '/settings') {
        if (method === 'GET') {
          const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
          if (error) return null;
          return {
            companyName: data.company_name,
            logo: data.logo,
            contactNo: data.contact_no,
            email: data.email,
            address: data.address,
            gstNumber: data.gst_number,
            psaraLicense: data.psara_license,
            directorName: data.director_name,
            sealImage: data.seal_image
          };
        }
        if (method === 'POST' || method === 'PUT') {
          const payload = {
            id: 1,
            company_name: body.companyName,
            logo: body.logo,
            contact_no: body.contactNo,
            email: body.email,
            address: body.address,
            gst_number: body.gstNumber,
            psara_license: body.psaraLicense,
            director_name: body.directorName,
            seal_image: body.sealImage || body.seal_image
          };

          const { error } = await supabase.from('settings').upsert(payload);
          if (error) throw new Error(`Configuration update failed: ${error.message}`);
          return body;
        }
      }

      // --- 8. GLOBAL STATS ENGINE ---
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
