export function PublicationDates({
  publishedAt,
  modifiedAt,
  labels,
}: {
  publishedAt: string;
  modifiedAt: string;
  labels: Record<string, string>;
}) {
  return (
    <p>
      {labels.published} <time dateTime={publishedAt}>{publishedAt}</time> · {labels.updated}{' '}
      <time dateTime={modifiedAt}>{modifiedAt}</time>
    </p>
  );
}
