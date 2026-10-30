import { booleanAttribute, Directive, effect, ElementRef, inject, input } from '@angular/core';
import { Menu } from './menu';

let nextTriggerId = 0;

@Directive({
  selector: '[bngMenuTrigger]',
  exportAs: 'bngMenuTrigger',
  host: {
    '[attr.id]': 'id',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-controls]': 'menu().id',
    '[attr.aria-expanded]': 'menu().isOpen()',
    '[attr.disabled]': 'disabled() ? "" : null',
    '(click)': 'toggle($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class MenuTrigger {
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly parent = inject(Menu, { optional: true });
  protected readonly id = this.element.id || `bng-menu-trigger-${nextTriggerId++}`;
  readonly menu = input.required<Menu>({ alias: 'bngMenuTrigger' });
  readonly disabled = input(false, { transform: booleanAttribute });

  constructor() {
    effect((onCleanup) => {
      const menu = this.menu();
      menu.trigger.set(this.element);
      onCleanup(() => {
        menu.close();
        menu.trigger.set(null);
      });
    });
    effect(() => {
      if (this.disabled()) this.menu().close();
    });
  }

  open() {
    if (!this.disabled()) this.menu().open();
  }

  close() {
    this.menu().close();
  }

  protected toggle(event: Event) {
    event.preventDefault();
    if (this.disabled()) return;
    if (this.menu().isOpen()) this.close();
    else this.open();
  }

  protected onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;
    if (this.parent) {
      if (
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.key === (this.parent.isRtl() ? 'ArrowLeft' : 'ArrowRight')
      ) {
        event.preventDefault();
        event.stopPropagation();
        this.open();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.menu().open(event.key === 'ArrowUp' ? 'last' : 'first');
        break;
      case 'Enter':
      case ' ':
        this.toggle(event);
        break;
    }
  }
}
