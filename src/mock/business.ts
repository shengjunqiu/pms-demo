// Type re-exports for domain modules that type-import from @/mock/business.
// NOTE: No `export * from './business-domain'` — that creates a circular module
// graph in Vite SSR: 27 mock modules `import type { BusinessState }` from this
// file. To resolve `export *`, Vite must evaluate business-domain.ts which
// loads modules that import from business.ts → TDZ.
// The zustand store lives in ./store.ts, imported by the React app.
import type { Actor, BusinessAction, BusinessState, Approval, ManagementApproval, PlanRequest, Material } from './business-domain';

export type { Actor, Approval, BusinessAction, BusinessState, ManagementApproval, Material, PlanRequest };