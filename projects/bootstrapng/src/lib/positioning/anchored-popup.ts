import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  ComponentRef,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  ViewContainerRef,
} from '@angular/core';
import type { Placement } from '@floating-ui/dom';
import { dismissOnOutside } from '../interaction/dismiss-on-outside';
import { FloatingPanel, type FloatingContent } from './floating-panel';

let nextPopupId = 0;

@Directive()
export abstract class AnchoredPopup {
  protected readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly container = inject(ViewContainerRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  protected abstract readonly kind: 'tooltip' | 'popover';
  abstract readonly content: () => FloatingContent;
  readonly placement = input<Placement>();
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly popupId = `bng-popup-${nextPopupId++}`;
  private readonly opened = signal(false);
  readonly isOpen = this.opened.asReadonly();
  private panel: ComponentRef<FloatingPanel> | null = null;
  private readonly leaving = new Set<ComponentRef<FloatingPanel>>();

  constructor() {
    effect(() => {
      if (this.disabled() || !this.content()) this.close();
      const panel = this.panel;
      if (!panel) return;
      panel.setInput('content', this.content());
      panel.setInput('placement', this.placement() ?? (this.kind === 'tooltip' ? 'top' : 'right'));
      panel.setInput('title', this.heading());
    });
    dismissOnOutside(
      this.isOpen,
      (target) => this.element.contains(target) || !!this.panel?.instance.element.contains(target),
      (restoreFocus) => {
        const inside = !!this.panel?.instance.element.contains(
          this.element.ownerDocument.activeElement,
        );
        this.close();
        if (restoreFocus && inside) this.element.focus();
      },
    );
    this.destroyRef.onDestroy(() => {
      this.removeDescription();
      this.panel?.destroy();
      for (const panel of this.leaving) panel.destroy();
    });
  }

  protected heading() {
    return '';
  }

  open() {
    if (!this.browser || this.disabled() || !this.content() || this.isOpen()) return;
    const panel = this.container.createComponent(FloatingPanel);
    panel.setInput('anchor', this.element);
    panel.setInput('kind', this.kind);
    panel.setInput('id', this.popupId);
    panel.setInput('content', this.content());
    panel.setInput('title', this.heading());
    panel.setInput('placement', this.placement() ?? (this.kind === 'tooltip' ? 'top' : 'right'));
    // Keep popups inside the native top layer when their trigger is in a dialog.
    (this.element.closest('dialog') ?? this.element.ownerDocument.body).append(
      panel.instance.element,
    );
    this.panel = panel;
    this.opened.set(true);
    if (this.kind === 'tooltip') {
      const ids = this.element.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];
      this.element.setAttribute('aria-describedby', [...ids, this.popupId].join(' '));
    }
    panel.changeDetectorRef.detectChanges();
  }

  close() {
    const panel = this.panel;
    if (!panel) return;
    this.panel = null;
    this.opened.set(false);
    this.removeDescription();
    panel.instance.element.removeAttribute('id');
    panel.instance.visible.set(false);
    panel.changeDetectorRef.detectChanges();
    this.leaving.add(panel);
    const finish = () => {
      if (!this.leaving.delete(panel)) return;
      panel.destroy();
    };
    const animations = panel.instance.element.getAnimations();
    if (animations.length)
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
    else finish();
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  private removeDescription() {
    if (this.kind !== 'tooltip') return;
    const ids = (this.element.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== this.popupId);
    if (ids.length) this.element.setAttribute('aria-describedby', ids.join(' '));
    else this.element.removeAttribute('aria-describedby');
  }
}
