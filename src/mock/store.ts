// Application Store — creates the zustand store that drives the UI.
// Separated from business.ts so that domain modules which type-import
// types from @/mock/business do NOT trigger store creation.
//
// CIRCULAR DEPENDENCY: 27+ mock modules import types from @/mock/business,
// which imports from business-domain.ts. Vite SSR creates synthetic import
// variables for every statically-imported module, even type-only ones.
// When circular resolution returns a partially-evaluated module, those
// synthetic variables are in the temporal dead zone.
//
// SOLUTION: use static ESM imports (for proper extension resolution), but
// defer the zustand create() call to first access via a Proxy. The Proxy
// target is a function (noop), so `typeof useBusinessStore === 'function'`
// satisfies React's hook invariant. The apply/get traps initialize the
// store on demand, AFTER the full module graph has resolved.
import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import { createDemoBusinessState, transition, type Actor, type BusinessAction, type BusinessState } from './business-domain';
import { actionTarget, assertActionAccess } from './access';
import { selectAccessPolicy } from './configuration-access';
import type { AuditEvent } from '@/models/configuration-access';
import { AS_OF_DATE } from '@/mock';

type StoreType = {
  data: BusinessState;
  dispatch: (action: BusinessAction, actor: Actor) => void;
  recordAccess: (route: string, allowed: boolean, actor: Actor) => void;
};

let _store: UseBoundStore<StoreApi<StoreType>> | undefined;

function init(): UseBoundStore<StoreApi<StoreType>> {
  if (_store) return _store;
  _store = create<StoreType>((set, get) => ({
    data: createDemoBusinessState(),
    dispatch: (action, actor) => {
      const previous = get().data;
      try {
        assertActionAccess(previous, action, actor);
        set({ data: transition(previous, action, actor) });
      } catch (error) {
        const event: AuditEvent = {
          id: `AUD-${previous.audit.length + 1}`,
          actor: actor.name,
          actorId: actor.id,
          actorRole: actor.role,
          action: action.type,
          target: actionTarget(action),
          date: AS_OF_DATE,
          result: '拒绝',
          reason: error instanceof Error ? error.message : String(error),
          changes: [],
          ruleVersion: selectAccessPolicy(previous, actor.role)?.id,
        };
        set({ data: { ...previous, audit: [...previous.audit, event] } });
        throw error;
      }
    },
    recordAccess: (route, allowed, actor) =>
      set(({ data }) => ({
        data: {
          ...data,
          audit: [
            ...data.audit,
            {
              id: `AUD-${data.audit.length + 1}`,
              actor: actor.name,
              actorId: actor.id,
              actorRole: actor.role,
              action: 'page-access',
              target: route,
              route,
              date: AS_OF_DATE,
              result: allowed ? '成功' : '拒绝',
              ruleVersion: selectAccessPolicy(data, actor.role)?.id,
              changes: [],
            } as AuditEvent,
          ],
        },
      })),
  }));
  return _store;
}

// Proxy that delegates to a lazily-initialized store.
// The target is a noop function so `typeof useBusinessStore === 'function'`,
// satisfying React's hook invariant (hooks must be callable).
function noop(): never {
  throw new Error('Store not yet initialized');
}

export const useBusinessStore: UseBoundStore<StoreApi<StoreType>> = new Proxy(noop as unknown as UseBoundStore<StoreApi<StoreType>>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (init() as any)[prop];
  },
  apply(_target, _thisArg, args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (init() as any)(...args);
  },
});