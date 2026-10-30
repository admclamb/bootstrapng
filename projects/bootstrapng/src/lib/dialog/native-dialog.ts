import {
  afterRenderEffect,
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

const scrollLocks = new WeakMap<Document, { owners: Set<object>; wasLocked: boolean }>();

@Directive({
  host: {
    '[class.hiding]': 'closing()',
    '(cancel)': 'onCancel($event)',
    '(close)': 'onNativeClose()',
    '(pointerdown)': 'onPointerDown($event)',
    '(click)': 'onClick($event)',
  },
})
export class NativeDialog {
  private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  readonly keyboard = input(true, { transform: booleanAttribute });
  readonly backdrop = input(true, { transform: booleanAttribute });
  readonly opened = output<void>();
  readonly closed = output<void>();
  private readonly active = signal(false);
  readonly isOpen = this.active.asReadonly();
  protected readonly closing = signal(false);
  private previousFocus: HTMLElement | null = null;
  private backdropPressed = false;
  private generation = 0;
  private readonly pendingFocus = signal(false);

  constructor() {
    afterRenderEffect(() => {
      if (!this.pendingFocus() || !this.active() || this.closing()) return;
      const generation = this.generation;
      const focus = () => {
        if (generation !== this.generation || !this.element.open || this.closing()) return;
        if (this.element.contains(this.element.ownerDocument.activeElement)) return;
        const target = this.element.querySelector<HTMLElement>('[autofocus]') ?? this.element;
        target.focus();
        if (!this.element.contains(this.element.ownerDocument.activeElement)) this.element.focus();
      };
      // Bootstrap starts hidden; animation readiness marks the visible entry frame.
      const animations = this.element.getAnimations();
      if (animations.length) {
        void Promise.allSettled(animations.map((animation) => animation.ready)).then(focus);
      } else {
        focus();
      }
      this.pendingFocus.set(false);
    });

    afterRenderEffect(() => {
      if (!this.closing()) return;
      const generation = this.generation;
      // Reading animations after rendering includes the newly started CSS exit transitions.
      const animations = this.element.getAnimations();
      const finish = () => {
        if (generation === this.generation && this.closing()) this.element.close();
      };
      if (animations.length) {
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
      } else {
        finish();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.generation++;
      if (this.element.open) this.element.close();
      this.releaseScroll();
      this.restoreFocus();
    });
  }

  readonly open = () => {
    if (this.element.open) {
      if (!this.closing()) return;
      this.generation++;
      this.closing.set(false);
      this.pendingFocus.set(true);
      return;
    }
    const focused = this.element.ownerDocument.activeElement;
    this.previousFocus = focused instanceof HTMLElement ? focused : null;
    this.element.showModal();
    this.lockScroll();
    this.pendingFocus.set(true);
    this.active.set(true);
    this.opened.emit();
  };

  readonly close = () => {
    if (!this.element.open || this.closing()) return;
    this.generation++;
    this.closing.set(true);
  };

  protected onCancel(event: Event) {
    event.preventDefault();
    if (this.keyboard()) this.close();
  }

  protected onNativeClose() {
    // A native close event may arrive after the dialog has already been reopened.
    if (this.element.open || !this.active()) return;
    this.generation++;
    this.closing.set(false);
    this.active.set(false);
    this.pendingFocus.set(false);
    this.backdropPressed = false;
    this.releaseScroll();
    this.restoreFocus();
    this.closed.emit();
  }

  protected onPointerDown(event: PointerEvent) {
    this.backdropPressed = event.button === 0 && this.isOutside(event);
  }

  protected onClick(event: MouseEvent) {
    if (this.backdrop() && this.backdropPressed && this.isOutside(event)) this.close();
    this.backdropPressed = false;
  }

  private isOutside(event: MouseEvent) {
    if (event.target !== this.element) return false;
    const bounds = this.element.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }

  private lockScroll() {
    const document = this.element.ownerDocument;
    let lock = scrollLocks.get(document);
    if (!lock) {
      lock = {
        owners: new Set(),
        wasLocked: document.documentElement.classList.contains('dialog-open'),
      };
      scrollLocks.set(document, lock);
    }
    lock.owners.add(this);
    document.documentElement.classList.add('dialog-open');
  }

  private releaseScroll() {
    const document = this.element.ownerDocument;
    const lock = scrollLocks.get(document);
    if (!lock || !lock.owners.delete(this) || lock.owners.size) return;
    if (!lock.wasLocked) document.documentElement.classList.remove('dialog-open');
    scrollLocks.delete(document);
  }

  private restoreFocus() {
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    this.previousFocus = null;
  }
}
