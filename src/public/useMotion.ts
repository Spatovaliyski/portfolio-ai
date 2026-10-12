import { useLayoutEffect, useRef } from 'react';

const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
const mediaSelector = 'figure, .case-hero, .block-image, .block-gallery, .gallery, [data-drift]';

function mediaFrames(main: HTMLElement) {
  const frames = new Set<HTMLElement>();

  main.querySelectorAll('img').forEach((image) => {
    const frame = image.closest<HTMLElement>(mediaSelector);

    frames.add(frame ?? image);
  });

  return [...frames];
}

function copyPanels(main: HTMLElement) {
  const panels: HTMLElement[] = [];
  const visit = (element: HTMLElement) => {
    if (element.matches(mediaSelector) || element.closest(mediaSelector)) return;
    if (element.querySelector('img, picture, video')) {
      for (const child of element.children) {
        if (child instanceof HTMLElement) visit(child);
      }

      return;
    }

    if (element.textContent?.trim()) panels.push(element);
  };

  for (const child of main.children) {
    if (child instanceof HTMLElement) visit(child);
  }

  return panels.filter(
    (panel) => !panels.some((other) => other !== panel && other.contains(panel)),
  );
}

function enter(element: HTMLElement, kind: 'media' | 'copy', soft: boolean, delay: number) {
  if (element.dataset.played === 'true') return;

  element.dataset.played = 'true';
  const animation = element.animate(
    kind === 'media'
      ? [
          {
            opacity: soft ? 0.55 : 0,
            transform: `translateY(${soft ? 16 : 28}px) scale(${soft ? 0.985 : 0.975})`,
          },
          { opacity: 1, transform: 'none' },
        ]
      : [
          { opacity: soft ? 1 : 0, transform: `translateY(${soft ? 10 : 18}px)` },
          { opacity: 1, transform: 'none' },
        ],
    { duration: kind === 'media' ? 720 : 540, delay, easing: ease, fill: 'both' },
  );

  animation.onfinish = () => animation.cancel();

  return animation;
}

function inView(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();

  return bounds.bottom > 80 && bounds.top < innerHeight * 0.9;
}

export function useEditorialMotion(path: string) {
  const firstPaint = useRef(true);

  useLayoutEffect(() => {
    const soften = firstPaint.current;

    firstPaint.current = false;

    if (typeof Element.prototype.animate !== 'function') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const main = document.getElementById('main');

    if (!main) return;

    const animations: Animation[] = [];
    const media = mediaFrames(main);
    const copy = copyPanels(main);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const element = entry.target as HTMLElement;

          observer.unobserve(element);
          const animation = enter(
            element,
            element.dataset.kind === 'media' ? 'media' : 'copy',
            false,
            0,
          );

          if (animation) animations.push(animation);
        }
      },
      { threshold: 0.22 },
    );
    const arm = (elements: HTMLElement[], kind: 'media' | 'copy') => {
      elements.forEach((element, index) => {
        element.dataset.kind = kind;
        if (inView(element)) {
          const animation = enter(element, kind, soften, Math.min(index * 45, 180));

          if (animation) animations.push(animation);

          return;
        }

        observer.observe(element);
      });
    };

    arm(copy, 'copy');
    arm(media, 'media');

    let frame = 0;
    const drift = () => {
      frame = 0;
      main.querySelectorAll<HTMLElement>('[data-drift]').forEach((element) => {
        const bounds = element.getBoundingClientRect();
        const center = bounds.top + bounds.height / 2;
        const shift = Math.max(-10, Math.min(10, (center - innerHeight / 2) * -0.02));

        element.style.translate = `0 ${shift.toFixed(2)}px`;
      });
    };
    const onScroll = () => {
      if (frame) return;

      frame = requestAnimationFrame(drift);
    };

    drift();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);

      for (const animation of animations) animation.cancel();
      main.querySelectorAll<HTMLElement>('[data-drift]').forEach((element) => {
        element.style.translate = '';
      });
    };
  }, [path]);
}
