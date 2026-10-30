import { Directive, effect, input } from '@angular/core';
import { AnchoredPopup } from '../positioning/anchored-popup';
import type { FloatingContent } from '../positioning/floating-panel';

@Directive({
  selector: '[bngTooltip]',
  exportAs: 'bngTooltip',
  host: {
    '(focusin)': 'onFocus()',
    '(focusout)': 'onBlur($event)',
    '(pointerenter)': 'onPointerEnter($event)',
  },
})
export class Tooltip extends AnchoredPopup {
  protected readonly kind = 'tooltip';
  readonly content = input.required<FloatingContent>({ alias: 'bngTooltip' });
  private focused = false;

  constructor() {
    super();
    effect((onCleanup) => {
      if (!this.isOpen()) return;
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || this.focused) return;
        const panel = this.panelElement();
        if (!panel) return;
        const anchor = this.element.getBoundingClientRect();
        const popup = panel.getBoundingClientRect();
        // Keep the tooltip hoverable across the small positioning gap.
        if (
          event.clientX >= Math.min(anchor.left, popup.left) &&
          event.clientX <= Math.max(anchor.right, popup.right) &&
          event.clientY >= Math.min(anchor.top, popup.top) &&
          event.clientY <= Math.max(anchor.bottom, popup.bottom)
        )
          return;
        this.close();
      };
      this.element.ownerDocument.addEventListener('pointermove', move);
      onCleanup(() => this.element.ownerDocument.removeEventListener('pointermove', move));
    });
  }

  protected onFocus() {
    this.focused = true;
    this.open();
  }

  protected onPointerEnter(event: PointerEvent) {
    if (event.pointerType === 'mouse') this.open();
  }

  protected onBlur(event: FocusEvent) {
    this.focused = false;
    if (
      !this.element.matches(':hover') &&
      !this.panelElement()?.contains(event.relatedTarget as Node)
    )
      this.close();
  }

  private panelElement() {
    return this.element.ownerDocument.getElementById(this.popupId);
  }
}
