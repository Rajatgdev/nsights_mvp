import type { FirmRole, FirmStatus } from '@nsights/shared';

export interface SessionUser {
  id: string;
  email: string;
  role: string; // 'platform_admin' | 'user'
}

export interface FirmMembership {
  firmId: string;
  role: FirmRole;
  canEditHousePortfolios: boolean;
  canDownload: boolean;
  firmStatus: FirmStatus;
}

export interface AppEnv {
  Variables: {
    user: SessionUser;
    membership?: FirmMembership;
  };
}