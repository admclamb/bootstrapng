import { DOCUMENT } from '@angular/common';
import { effect, inject } from '@angular/core';

export function dismissOnOutside(
  isOpen: () => boolean,
  contains: (target: Node) => boolean,
  dismiss: (restoreFocus: boolean) => void,
) {
  const document = inject(DOCUMENT);

  effect((onCleanup) => {
    if (!isOpen()) return;

    const outside = (event: Event) => {
      if (event.target && !contains(event.target as Node)) dismiss(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        dismiss(true);
      }
    };

    document.addEventListener('click', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    onCleanup(() => {
      document.removeEventListener('click', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    });
  });
}
