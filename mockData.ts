
import { Role, User, AppSettings } from './types';

/**
 * SEED DATA INSTRUCTIONS:
 * 
 * To access the app for the first time, manually insert this record 
 * into your Supabase 'users' table via the SQL Editor:
 * 
 * INSERT INTO users (id, name, email, password, role, status, login_attempts)
 * VALUES ('VSFHS-ADMININDORE', 'Vidhya Admin', 'admin@vidhyasecurity.com', 'Vsf.indore2012', 'ADMIN', 'ACTIVE', 0);
 */

export const DEFAULT_ADMIN: User = {
  id: 'VSFHS-ADMININDORE',
  name: 'Vidhya Admin',
  email: 'admin@vidhyasecurity.com',
  password: 'Vsf.indore2012',
  role: Role.ADMIN,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin_indore',
  createdAt: new Date().toISOString(),
  status: 'ACTIVE',
  loginAttempts: 0
};

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES',
  logo: '', 
  contactNo: '9826259292'
};
