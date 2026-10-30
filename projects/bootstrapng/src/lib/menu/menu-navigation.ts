export type MenuFocus = 'first' | 'last';

export function focusMenuItem(items: HTMLElement[], target: MenuFocus) {
  (target === 'first' ? items[0] : items.at(-1))?.focus();
}

export function navigateMenu(event: KeyboardEvent, items: HTMLElement[]) {
  if (!items.length || event.altKey || event.ctrlKey || event.metaKey) return;

  const current = items.findIndex((item) => item === item.ownerDocument.activeElement);
  let next: HTMLElement | undefined;

  switch (event.key) {
    case 'ArrowDown':
      next = items[(current + 1) % items.length];
      break;
    case 'ArrowUp':
      next = current < 0 ? items.at(-1) : items[(current - 1 + items.length) % items.length];
      break;
    case 'Home':
      next = items[0];
      break;
    case 'End':
      next = items.at(-1);
      break;
    default:
      if (event.key.length === 1 && event.key !== ' ') {
        const ordered = [...items.slice(current + 1), ...items.slice(0, current + 1)];
        next = ordered.find((item) =>
          item.textContent?.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()),
        );
      }
  }

  if (next) {
    event.preventDefault();
    next.focus();
  }
}
