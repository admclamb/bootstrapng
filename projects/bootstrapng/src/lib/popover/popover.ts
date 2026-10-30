import { Directive, input } from '@angular/core';
import { AnchoredPopup } from '../positioning/anchored-popup';
import type { FloatingContent } from '../positioning/floating-panel';

@Directive({
  selector: '[bngPopover]',
  exportAs: 'bngPopover',
  host: {
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'isOpen() ? popupId : null',
    '[attr.aria-haspopup]': '"dialog"',
    '(click)': 'toggle()',
  },
})
export class Popover extends AnchoredPopup {
  protected readonly kind = 'popover';
  readonly content = input.required<FloatingContent>({ alias: 'bngPopover' });
  readonly popoverTitle = input('');

  protected override heading() {
    return this.popoverTitle();
  }
}
