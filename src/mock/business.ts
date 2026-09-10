// UI entry point. Pure domain consumers import business-domain directly so
// collecting a domain test does not instantiate the application Store.
export * from './business-domain';
import { create } from 'zustand';
import { createDemoBusinessState, transition, type Actor, type BusinessAction, type BusinessState } from './business-domain';
import { actionTarget, assertActionAccess } from './access';
import { selectAccessPolicy } from './configuration-access';
import type { AuditEvent } from '@/models/configuration-access';
import { AS_OF_DATE } from '@/mock';

export const useBusinessStore = create<{ data: BusinessState; dispatch: (action: BusinessAction, actor: Actor) => void; recordAccess: (route: string, allowed: boolean, actor: Actor) => void }>((set, get) => ({
  data: createDemoBusinessState(),
  dispatch: (action, actor) => {
    const previous = get().data;
    try {
      assertActionAccess(previous, action, actor);
      set({ data: transition(previous, action, actor) });
    } catch (error) {
      const event: AuditEvent = { id: `AUD-${previous.audit.length + 1}`, actor: actor.name, actorId: actor.id, actorRole: actor.role, action: action.type, target: actionTarget(action), date: AS_OF_DATE, result: '拒绝', reason: error instanceof Error ? error.message : String(error), changes: [], ruleVersion: selectAccessPolicy(previous, actor.role)?.id };
      set({ data: { ...previous, audit: [...previous.audit, event] } });
      throw error;
    }
  },
  recordAccess: (route, allowed, actor) => set(({ data }) => ({ data: { ...data, audit: [...data.audit, { id: `AUD-${data.audit.length + 1}`, actor: actor.name, actorId: actor.id, actorRole: actor.role, action: 'page-access', target: route, route, date: AS_OF_DATE, result: allowed ? '成功' : '拒绝', ruleVersion: selectAccessPolicy(data, actor.role)?.id, changes: [] }] } })),
}));
