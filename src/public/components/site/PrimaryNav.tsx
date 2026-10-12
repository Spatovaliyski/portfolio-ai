type Link = { url: string; label: string };

function currentPage(url: string, path: string): 'page' | undefined {
  return (url === '/' ? path === '/' : path.startsWith(url)) ? 'page' : undefined;
}

export function PrimaryNav({
  links,
  path,
  className,
}: {
  links: Link[];
  path: string;
  className?: string;
}) {
  return (
    <nav className={className} aria-label="Primary">
      {links.map((link) => (
        <a key={link.url} href={link.url} aria-current={currentPage(link.url, path)}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
