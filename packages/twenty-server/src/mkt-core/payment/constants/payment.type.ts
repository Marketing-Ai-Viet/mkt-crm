import { User } from 'src/engine/core-modules/user/user.entity';

export type callFireBaseType = {
  orderCode: string | null;
  QRCodeUrl: string | null;
};

export type CALL_FIREBASE_DATA = {
  orderCode: string | null;
  QRCodeUrl: string | null;
};

export type RequestSepayJWT = {
  user: User;
  workspaceId: string;
  workspaceMemberId: string;
  userWorkspaceId: string;
};
