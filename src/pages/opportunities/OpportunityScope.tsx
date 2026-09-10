import { Fragment,type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
/** Discard unsaved form state when its opportunity or simulated professional role changes. */
export function OpportunityScope({children}:{children:ReactNode}) { const {id}=useParams();const role=useAppStore(s=>s.currentRole);return <Fragment key={`${id??'ledger'}-${role}`}>{children}</Fragment>; }
