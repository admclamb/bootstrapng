import { DOCUMENT, isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { CarouselSlide } from './carousel-slide';

export { CarouselSlide } from './carousel-slide';

let nextCarouselId = 0;

export class CarouselSlideEvent extends Event {
  constructor(
    readonly from: number,
    readonly to: number,
    readonly relatedTarget: HTMLElement,
  ) {
    super('slide', { cancelable: true });
  }
}

@Component({
  selector: 'bng-carousel',
  exportAs: 'bngCarousel',
  imports: [NgTemplateOutlet],
  template: `
    @if (autoplay() && slides().length > 1) {
      <div>
        <button
          type="button"
          class="btn-outline theme-secondary"
          (click)="playing() ? pause() : cycle()"
        >
          {{ playing() ? 'Pause slideshow' : 'Start slideshow' }}
        </button>
      </div>
    }
    <div
      #viewport
      tabindex="0"
      class="carousel-inner"
      [id]="id + '-slides'"
      [attr.aria-live]="rotating() ? 'off' : 'polite'"
      aria-atomic="false"
      (scrollend)="onScrollend()"
      (pointerdown)="pause()"
      (wheel)="pause()"
    >
      @for (slide of slides(); track slide) {
        <div
          #item
          class="carousel-item"
          [class.active]="$index === activeIndex()"
          role="group"
          aria-roledescription="slide"
          [attr.aria-label]="slide.label() || $index + 1 + ' of ' + slides().length"
          [attr.inert]="$index === activeIndex() ? null : ''"
        >
          <ng-container [ngTemplateOutlet]="slide.template" />
        </div>
      }
    </div>
    @if (slides().length > 1) {
      <div class="d-flex justify-content-between align-items-center gap-3">
        @if (controls()) {
          <button
            type="button"
            class="btn-outline theme-secondary"
            [attr.aria-controls]="id + '-slides'"
            [disabled]="ends() === 'stop' && activeIndex() === 0"
            (click)="prev()"
          >
            <span class="carousel-icon-prev" aria-hidden="true"></span>
            <span class="visually-hidden">Previous slide</span>
          </button>
        }
        @if (indicators()) {
          <div class="carousel-indicators" role="group" aria-label="Choose slide">
            @for (slide of slides(); track slide) {
              <button
                type="button"
                [attr.data-bs-target]="'#' + id"
                [class.active]="$index === activeIndex()"
                [attr.aria-current]="$index === activeIndex() ? 'true' : null"
                [attr.aria-label]="'Go to slide ' + ($index + 1)"
                [attr.aria-controls]="id + '-slides'"
                (click)="to($index)"
              ></button>
            }
          </div>
        }
        @if (controls()) {
          <button
            type="button"
            class="btn-outline theme-secondary"
            [attr.aria-controls]="id + '-slides'"
            [disabled]="ends() === 'stop' && activeIndex() === slides().length - 1"
            (click)="next()"
          >
            <span class="carousel-icon-next" aria-hidden="true"></span>
            <span class="visually-hidden">Next slide</span>
          </button>
        }
      </div>
    }
  `,
  host: {
    class: 'carousel',
    role: 'region',
    'aria-roledescription': 'carousel',
    '[attr.id]': 'id',
    '[attr.aria-label]': 'label()',
    '(keydown)': 'onKeydown($event)',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
    '(focusin)': 'onFocusin($event)',
  },
})
export class Carousel {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly id = this.element.id || `bng-carousel-${nextCarouselId++}`;
  readonly label = input('Slideshow');
  readonly controls = input(true, { transform: booleanAttribute });
  readonly indicators = input(true, { transform: booleanAttribute });
  readonly keyboard = input(true, { transform: booleanAttribute });
  readonly autoplay = input(false, { transform: booleanAttribute });
  readonly interval = input(5000);
  readonly ends = input<'loop' | 'stop'>('loop');
  readonly slide = output<CarouselSlideEvent>();
  readonly slid = output<{ from: number; to: number }>();
  protected readonly slides = contentChildren(CarouselSlide);
  private readonly selected = signal(0);
  readonly activeIndex = this.selected.asReadonly();
  private readonly requested = signal<number | null>(null);
  private readonly stopped = signal<boolean | null>(null);
  protected readonly hovered = signal(false);
  private readonly pageHidden = signal(false);
  readonly playing = computed(() => (this.stopped() === null ? this.autoplay() : !this.stopped()));
  protected readonly rotating = computed(
    () => this.playing() && !this.hovered() && !this.pageHidden(),
  );
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly items = viewChildren<ElementRef<HTMLElement>>('item');
  private pending: { from: number; to: number } | null = null;

  constructor() {
    afterRenderEffect(() => {
      const count = this.slides().length;
      if (this.selected() >= count) {
        this.selected.set(Math.max(0, count - 1));
        this.requested.set(this.selected());
      }
      const index = this.requested();
      const item = index === null ? null : this.items()[index]?.nativeElement;
      if (!item) return;
      const viewport = this.viewport().nativeElement;
      const target =
        viewport.scrollLeft +
        item.getBoundingClientRect().left -
        viewport.getBoundingClientRect().left;
      const rtl = this.document.defaultView?.getComputedStyle(viewport).direction === 'rtl';
      const left = rtl ? target + item.offsetWidth - viewport.clientWidth : target;
      this.requested.set(null);
      if (Math.abs(viewport.scrollLeft - left) < 1) this.finish();
      else viewport.scrollTo({ left, behavior: 'auto' });
    });

    effect((onCleanup) => {
      const interval = this.interval();
      const rotating = this.rotating();
      const index = this.activeIndex();
      const count = this.slides().length;
      if (
        !this.browser ||
        !rotating ||
        count < 2 ||
        !Number.isFinite(interval) ||
        interval <= 0 ||
        (this.ends() === 'stop' && index === count - 1)
      )
        return;
      const timer = setTimeout(() => this.navigate(index + 1), interval);
      onCleanup(() => clearTimeout(timer));
    });

    if (this.browser) {
      this.pageHidden.set(this.document.hidden);
      const visibility = () => this.pageHidden.set(this.document.hidden);
      this.document.addEventListener('visibilitychange', visibility);
      inject(DestroyRef).onDestroy(() =>
        this.document.removeEventListener('visibilitychange', visibility),
      );
    }
  }

  next() {
    this.to(this.activeIndex() + 1);
  }
  prev() {
    this.to(this.activeIndex() - 1);
  }
  to(index: number) {
    this.pause();
    this.navigate(index);
  }
  pause() {
    this.stopped.set(true);
  }
  cycle() {
    this.stopped.set(false);
  }

  protected onFocusin(event: FocusEvent) {
    if (!this.element.contains(event.relatedTarget as Node)) this.pause();
  }

  protected onKeydown(event: KeyboardEvent) {
    if (
      !this.keyboard() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')
    )
      return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const rtl = this.document.defaultView?.getComputedStyle(this.element).direction === 'rtl';
    if ((event.key === 'ArrowRight') !== rtl) this.next();
    else this.prev();
  }

  protected onScrollend() {
    const viewport = this.viewport().nativeElement;
    const rtl = this.document.defaultView?.getComputedStyle(viewport).direction === 'rtl';
    const bounds = viewport.getBoundingClientRect();
    const distances = this.items().map(({ nativeElement }) => {
      const item = nativeElement.getBoundingClientRect();
      return Math.abs(rtl ? item.right - bounds.right : item.left - bounds.left);
    });
    if (!distances.length) return;
    const index = distances.indexOf(Math.min(...distances));
    const from = this.pending?.from ?? this.activeIndex();
    this.selected.set(index);
    this.pending = null;
    if (from !== index) this.slid.emit({ from, to: index });
  }

  private navigate(index: number) {
    const count = this.slides().length;
    if (!count || !Number.isInteger(index)) return;
    const to =
      this.ends() === 'loop'
        ? ((index % count) + count) % count
        : Math.max(0, Math.min(index, count - 1));
    if (to === this.activeIndex()) return;
    const from = this.activeIndex();
    const event = new CarouselSlideEvent(from, to, this.items()[to].nativeElement);
    this.slide.emit(event);
    if (event.defaultPrevented) return;
    this.pending = { from, to };
    this.selected.set(to);
    this.requested.set(to);
  }

  private finish() {
    if (!this.pending) return;
    const event = this.pending;
    this.pending = null;
    this.slid.emit(event);
  }
}
