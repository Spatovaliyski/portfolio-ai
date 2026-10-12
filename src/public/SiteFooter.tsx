import type { PortfolioContent } from '../domain/schema.ts';
import { records } from '../domain/records.ts';
import styles from './app.module.css';

export function SiteFooter({ content }: { content: PortfolioContent }) {
  const profile = records(content, 'profile')[0];
  const settings = records(content, 'settings')[0];
  const labels = settings.labels;

  return (
    <footer className={styles.footer}>
      <div>
        <a className={styles.brand} href="/">
          ms<span>.</span>
        </a>
        <p>{settings.footer}</p>
      </div>
      <nav aria-label="Footer">
        {profile.links.map((link) => (
          <a key={link.url} href={link.url}>
            {link.label} ↗
          </a>
        ))}
        {records(content, 'note').length > 0 && <a href="/notes/">{labels.footerNotes}</a>}
        <a href="/privacy/">{labels.footerPrivacy}</a>
      </nav>
      <span>
        © {new Date(content.generatedAt).getUTCFullYear()} {labels.copyright}
      </span>
    </footer>
  );
}
