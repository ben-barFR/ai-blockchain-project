export type DemoUser = {
  id: string;
  email: string | undefined;
  fullName: string;
  userType: string;
  walletAddress: string | null;
};

export type DeletedAccount = {
  id: string;
  email: string | null;
  fullName: string | null;
  userType: string | null;
  walletAddresses: string[];
  deletedAt: string;
};
