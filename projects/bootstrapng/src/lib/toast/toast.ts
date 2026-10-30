import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { autoDismiss } from '../interaction/auto-dismiss';

type ToastState = 'hidden' | 'showing' | 'shown' | 'hiding';

@Component({
  selector: 'bng-toast',
  exportAs: 'bngToast',
  template: `<ng-content />`,
  host: {
    class: 'toast',
    '[class.show]': 'isShown()',
    '[attr.inert]': 'isShown() ? null : ""',
    '[attr.aria-hidden]': 'state() === "hidden" ? "true" : null',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
    '(focusin)': 'focused.set(true)',
    '(focusout)': 'onFocusout($event)',
  },
})
export class Toast {
  readonly delay = input(5000);
  readonly autohide = input(true, { transform: booleanAttribute });
  readonly showEvent = output<Event>({ alias: 'show' });
  readonly shown = output<void>();
  readonly hideEvent = output<Event>({ alias: 'hide' });
  readonly hidden = output<void>();
  protected readonly state = signal<ToastState>('hidden');
  protected readonly hovered = signal(false);
  protected readonly focused = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private complete: (() => void) | null = null;
  private destroyed = false;

  constructor() {
    autoDismiss(
      this.delay,
      () => !this.autohide() || this.hovered() || this.focused(),
      () => void this.hide(),
      () => this.state() === 'shown',
    );

    afterRenderEffect(() => {
      const state = this.state();
      if (state !== 'showing' && state !== 'hiding') return;
      const finish = () => {
        if (this.destroyed || this.state() !== state) return;
        const complete = this.complete;
        this.complete = null;
        this.state.set(state === 'showing' ? 'shown' : 'hidden');
        if (state === 'showing') this.shown.emit();
        else {
          this.hovered.set(false);
          this.focused.set(false);
          this.hidden.emit();
        }
        complete?.();
      };
      const animations = this.element.getAnimations();
      if (animations.length) {
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
      } else {
        finish();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.complete?.();
      this.complete = null;
    });
  }

  isShown() {
    return this.state() === 'showing' || this.state() === 'shown';
  }

  show(): Promise<void> {
    return this.transition('hidden', 'showing', this.showEvent);
  }

  hide(): Promise<void> {
    return this.transition('shown', 'hiding', this.hideEvent);
  }

  private transition(
    from: ToastState,
    to: ToastState,
    output: { emit: (event: Event) => void },
  ): Promise<void> {
    if (this.destroyed || this.state() !== from) return Promise.resolve();
    this.state.set(to);
    const event = new Event(to === 'showing' ? 'show' : 'hide', { cancelable: true });
    output.emit(event);
    if (event.defaultPrevented) {
      this.state.set(from);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.complete = resolve;
    });
  }

  protected onFocusout(event: FocusEvent) {
    this.focused.set(
      event.relatedTarget instanceof Node && this.element.contains(event.relatedTarget),
    );
  }
}
