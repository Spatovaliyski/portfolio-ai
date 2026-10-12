import type { ReactNode } from 'react';
import styles from '../../app.module.css';

export function PageLayout({
  eyebrow,
  title,
  introduction,
  children,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{introduction}</p>
      </header>
      {children}
    </div>
  );
}
