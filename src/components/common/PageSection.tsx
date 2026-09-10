import type { ReactNode } from 'react';

/** A business section, with an optional heading and related actions. */
export function PageSection({ title, description, extra, children, className = '' }: {
  title?: ReactNode; description?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={`pms-section ${className}`}>
    {(title || extra) && <div className="pms-section-heading"><div>{title && <h2>{title}</h2>}{description && <div className="pms-section-note">{description}</div>}</div>{extra && <div className="pms-section-actions">{extra}</div>}</div>}
    <div className="pms-section-body">{children}</div>
  </section>;
}

export function PageToolbar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pms-toolbar ${className}`}>{children}</div>;
}
