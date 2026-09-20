import { useBusinessStore } from '@/mock/store';
import type { BusinessAction } from '@/mock/business';
import { canAccessAction, canEditSensitiveField } from '@/mock/configuration-access';
import type { SensitiveField } from '@/models/configuration-access';
import { useAppStore } from '@/store/useAppStore';

/** UI policy restrictions supplement, rather than replace, each page's domain-state checks. */
export function useActionAccess() {
  useBusinessStore((store) => store.data);
  useAppStore((store) => store.currentUser);
  return {
    canDo: (type: BusinessAction['type'], targetId?: string) => canAccessAction(useBusinessStore.getState().data, useAppStore.getState().currentUser, type, targetId),
    canEditField: (field: SensitiveField) => canEditSensitiveField(useBusinessStore.getState().data, useAppStore.getState().currentUser, field),
  };
}
