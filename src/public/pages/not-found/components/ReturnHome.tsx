import { Arrow } from '../../../components/ui/Arrow.tsx';
import { ButtonLink } from '../../../components/ui/Button.tsx';

export function ReturnHome({ label }: { label: string }) {
  return (
    <ButtonLink href="/">
      {label} <Arrow />
    </ButtonLink>
  );
}
