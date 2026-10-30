import { booleanAttribute, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { Menu } from './menu';
import { MenuTrigger } from './menu-trigger';

@Directive({
  selector: '[bngMenuItem]',
  host: {
    class: 'menu-item',
    role: 'menuitem',
    tabindex: '-1',
    '[class.disabled]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[attr.disabled]': 'disabled() ? "" : null',
    '(click)': 'select()',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
})
export class MenuItem {
  readonly menu = inject(Menu);
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly disabled = input(false, { transform: booleanAttribute });
  private readonly trigger = inject(MenuTrigger, { optional: true, self: true });

  constructor() {
    // Capture runs before caller click handlers, including on disabled links.
    const blockDisabled = (event: MouseEvent) => {
      if (!this.disabled()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    this.element.addEventListener('click', blockDisabled, true);
    inject(DestroyRef).onDestroy(() =>
      this.element.removeEventListener('click', blockDisabled, true),
    );
  }

  protected select() {
    if (!this.disabled() && !this.trigger) this.menu.root.close(true);
  }

  protected activate(event: Event) {
    if (this.trigger || event.defaultPrevented) return;
    event.preventDefault();
    if (!this.disabled()) this.element.click();
  }
}
