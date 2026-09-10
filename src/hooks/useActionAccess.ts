import { useBusinessStore } from '@/mock/business';
import type { BusinessAction } from '@/mock/business';
import { canAccessAction, canEditSensitiveField } from '@/mock/configuration-access';
import type { SensitiveField } from '@/models/configuration-access';
import { useAppStore } from '@/store/useAppStore';

/** UI policy restrictions supplement, rather than replace, each page's domain-state checks. */
export function useActionAccess() {
  const data = useBusinessStore((store) => store.data);
  const actor = useAppStore((store) => store.currentUser);
  return {
    canDo: (type: BusinessAction['type'], targetId?: string) => canAccessAction(data, actor, type, targetId),
    canEditField: (field: SensitiveField) => canEditSensitiveField(data, actor, field),
  };
}
