export enum UserType {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// NOTE: AdminRole governs internal KYC/AML workflow permissions.
// Client/Partner access (subscription tiers, scoped views) will be added later
// SEPARATE concept when those user types are designed — do not overload this enum.
export enum AdminRole {
  APPROVER = 'APPROVER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
  OVERSEER = 'OVERSEER',
}
