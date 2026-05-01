// Centralised Firestore document paths so we never hand-roll them inline. Keeps
// the rule layout in firestore.rules in sync with the access patterns.

export const fsPaths = {
  profile: (uid: string) => `users/${uid}/profile/main` as const,
  settings: (uid: string) => `users/${uid}/settings/main` as const,
  counters: (uid: string) => `users/${uid}/counters/main` as const,
  clients: (uid: string) => `users/${uid}/clients` as const,
  client: (uid: string, id: string) => `users/${uid}/clients/${id}` as const,
  invoices: (uid: string) => `users/${uid}/invoices` as const,
  invoice: (uid: string, id: string) => `users/${uid}/invoices/${id}` as const,
  creditNotes: (uid: string) => `users/${uid}/creditNotes` as const,
  creditNote: (uid: string, id: string) => `users/${uid}/creditNotes/${id}` as const,
  lineItemLibrary: (uid: string) => `users/${uid}/lineItemLibrary` as const,
  lineItemLibraryEntry: (uid: string, id: string) =>
    `users/${uid}/lineItemLibrary/${id}` as const,
};
