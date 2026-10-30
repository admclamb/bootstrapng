import { Directive, inject } from '@angular/core';

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
}
