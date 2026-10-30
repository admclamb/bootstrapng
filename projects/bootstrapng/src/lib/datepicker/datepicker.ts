import { DOCUMENT } from '@angular/common';
import {
  afterRenderEffect,
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  Calendar,
  months,
  type DateAny,
  type DateMode,
  type MonthsCount,
  type Options,
  type Range,
  type WeekDayID,
} from 'vanilla-calendar-pro';
import { floatingPosition } from '../positioning/floating-position';

export type DatepickerSelectionMode = DateMode;
export type DatepickerPlacement = 'left' | 'center' | 'right' | 'auto';
export type DatepickerFormat =
  | Intl.DateTimeFormatOptions
  | ((date: Date, locale: string | undefined) => string);
export type DatepickerOptions = Options;

let nextDatepickerId = 0;

@Directive({
  selector: 'input[bngDatepicker], button[bngDatepicker], div[bngDatepicker]',
  exportAs: 'bngDatepicker',
  host: {
    '[attr.role]': 'inline() || !isInput ? null : "combobox"',
    '[attr.aria-autocomplete]': 'inline() || !isInput ? null : "none"',
    '[attr.aria-haspopup]': 'inline() ? null : "dialog"',
    '[attr.aria-expanded]': 'inline() ? null : isOpen()',
    '[attr.aria-controls]': 'inline() ? null : panel.id',
    '(focusin)': 'onFocus()',
    '(click)': 'onClick()',
    '(keydown)': 'onTriggerKeydown($event)',
    '(change)': 'onInputChange()',
  },
})
export class Datepicker {
  readonly selectedDates = model<string[]>([]);
  readonly selectionMode = input<DatepickerSelectionMode>('single');
  readonly dateMin = input<DateAny>();
  readonly dateMax = input<DateAny>();
  readonly firstWeekday = input<WeekDayID>(1);
  readonly displayMonthsCount = input<MonthsCount>(1);
  readonly inline = input(false, { transform: booleanAttribute });
  readonly locale = input('default');
  readonly dateFormat = input<DatepickerFormat>();
  readonly placement = input<DatepickerPlacement>('left');
  readonly datepickerTheme = input<'light' | 'dark' | 'auto' | null>(null);
  readonly calendarLabel = input('Choose date');
  readonly positionElement = input<HTMLElement>();
  readonly displayElement = input<HTMLElement | false>();
  readonly vcpOptions = input<DatepickerOptions>({});
  readonly opened = output<void>();
  readonly closed = output<void>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly isInput = this.element.tagName === 'INPUT';
  private readonly document = inject(DOCUMENT);
  protected readonly panel = this.document.createElement('div');
  private readonly openedState = signal(false);
  readonly isOpen = this.openedState.asReadonly();
  private readonly ready = signal(false);
  private readonly displayPlaceholders = new WeakMap<HTMLElement, string>();
  private calendar?: Calendar;
  private restoringFocus = false;
  private readonly position = floatingPosition(
    () =>
      this.ready() && this.isOpen() && !this.inline()
        ? (this.positionElement() ?? this.element.closest<HTMLElement>('.form-adorn') ?? this.element)
        : null,
    this.panel,
    () => {
      switch (this.placement()) {
        case 'center':
          return 'bottom';
        case 'right':
          return 'bottom-end';
        default:
          return 'bottom-start';
      }
    },
  );

  constructor() {
    this.panel.id = `bng-datepicker-${nextDatepickerId++}`;

    afterRenderEffect((onCleanup) => {
      const inline = this.inline();
      const options = this.vcpOptions();
      const dates = untracked(this.selectedDates);
      const firstDate = dates[0] ? this.parseDate(dates[0]) : null;
      const calendar = new Calendar(this.panel, {
        ...options,
        extensions: [months],
        inputMode: false,
        type: this.displayMonthsCount() > 1 ? 'multiple' : 'default',
        displayMonthsCount: this.displayMonthsCount(),
        firstWeekday: this.firstWeekday(),
        locale: this.locale(),
        selectionDatesMode: this.selectionMode(),
        selectedDates: [...dates],
        ...(firstDate
          ? {
              selectedMonth: firstDate.getMonth() as Range<12>,
              selectedYear: firstDate.getFullYear(),
            }
          : {}),
        ...(this.dateMin() !== undefined ? { dateMin: this.dateMin() } : {}),
        ...(this.dateMax() !== undefined ? { dateMax: this.dateMax() } : {}),
        selectedTheme: 'light',
        onCreateDateEls: (self, dateElement) => {
          // Bootstrap alpha dims enabled adjacent-month and range dates below AA contrast.
          const button = dateElement.querySelector<HTMLElement>('[data-vc-date-btn]');
          if (button) button.style.opacity = '1';
          options.onCreateDateEls?.(self, dateElement);
        },
        onClickDate: (self, event) => {
          this.select([...self.context.selectedDates]);
          options.onClickDate?.(self, event);
        },
        onInit: (self) => {
          this.decorate(inline);
          options.onInit?.(self);
        },
        onUpdate: (self) => {
          this.decorate(inline);
          options.onUpdate?.(self);
        },
      });

      const container = inline
        ? this.element
        : (this.element.closest('dialog') ?? this.document.body);
      container.append(this.panel);
      calendar.init();
      this.calendar = calendar;
      this.ready.set(true);
      onCleanup(() => {
        this.ready.set(false);
        this.calendar = undefined;
        // VCP restores a cloned original element on destroy; detach first.
        this.panel.remove();
        calendar.destroy();
      });
    });

    afterRenderEffect(() => {
      const dates = this.selectedDates();
      if (!this.ready() || !this.calendar) return;
      if (dates.join(',') !== this.calendar.context.selectedDates.join(',')) {
        this.calendar.set({ selectedDates: [...dates] });
      }
      this.updateDisplay(dates);
    });

    afterRenderEffect(() => {
      if (!this.ready()) return;
      const inline = this.inline();
      const position = this.position();
      this.panel.hidden = !inline && !this.isOpen();
      this.panel.style.display = this.panel.hidden ? 'none' : '';
      this.panel.style.position = inline ? 'relative' : 'fixed';
      this.panel.style.visibility = !inline && this.isOpen() && !position ? 'hidden' : '';
      this.panel.style.left = !inline && position ? `${position.x}px` : '';
      this.panel.style.top = !inline && position ? `${position.y}px` : '';
      this.panel.setAttribute('aria-label', this.calendarLabel());
    });

    afterRenderEffect((onCleanup) => {
      if (!this.ready()) return;
      const theme = this.datepickerTheme();
      const sync = () => {
        const inherited = this.element.closest('[data-bs-theme]')?.getAttribute('data-bs-theme');
        const effective = theme ?? inherited;
        if (effective) this.panel.setAttribute('data-bs-theme', effective);
        else this.panel.removeAttribute('data-bs-theme');
      };
      sync();
      const Observer = this.document.defaultView?.MutationObserver;
      if (!Observer || theme) return;
      const observer = new Observer(sync);
      for (let ancestor: HTMLElement | null = this.element; ancestor; ancestor = ancestor.parentElement) {
        observer.observe(ancestor, { attributes: true, attributeFilter: ['data-bs-theme'] });
      }
      onCleanup(() => observer.disconnect());
    });

    // Capture before VCP replaces date/month buttons while handling a click.
    const outside = (event: Event) => {
      const target = event.target as Node | null;
      if (
        target &&
        this.isOpen() &&
        !this.element.contains(target) &&
        !this.panel.contains(target) &&
        !this.positionElement()?.contains(target)
      ) {
        this.close();
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.isOpen() && !this.inline() && !event.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
      }
    };
    this.document.addEventListener('pointerdown', outside, true);
    this.document.addEventListener('focusin', outside, true);
    this.document.addEventListener('keydown', keydown);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('pointerdown', outside, true);
      this.document.removeEventListener('focusin', outside, true);
      this.document.removeEventListener('keydown', keydown);
    });
  }

  open() {
    if (this.inline() || !this.ready() || this.isDisabled() || this.isOpen()) return;
    this.openedState.set(true);
    this.opened.emit();
  }

  close(restoreFocus = false) {
    if (this.inline() || !this.isOpen()) return;
    this.openedState.set(false);
    if (restoreFocus) {
      this.restoringFocus = true;
      this.element.focus();
      this.restoringFocus = false;
    }
    this.closed.emit();
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  protected onFocus() {
    if (this.element.tagName === 'INPUT' && !this.restoringFocus) this.open();
  }

  protected onClick() {
    if (this.element.tagName === 'BUTTON') this.toggle();
    else if (this.element.tagName === 'INPUT') this.open();
  }

  protected onTriggerKeydown(event: Event) {
    if ((event as KeyboardEvent).key !== 'ArrowDown' || this.inline() || this.isDisabled()) return;
    event.preventDefault();
    this.open();
    this.panel.hidden = false;
    this.panel.style.display = '';
    this.panel.querySelector<HTMLElement>('[data-vc-date-selected] button, button:not([disabled])')?.focus();
  }

  protected onInputChange() {
    if (this.element.tagName !== 'INPUT') return;
    const value = (this.element as HTMLInputElement).value.trim();
    const dates = value.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    const valid =
      value === '' ||
      (dates.length > 0 &&
        value.replace(/\d{4}-\d{2}-\d{2}/g, '').match(/^[\s,\u2013]*$/) &&
        (this.selectionMode() !== 'single' || dates.length === 1) &&
        dates.every((date) => this.parseDate(date)));
    if (valid && this.calendar) {
      this.calendar.set({ selectedDates: dates });
      this.selectedDates.set([...this.calendar.context.selectedDates]);
    }
    this.updateDisplay(this.selectedDates());
  }

  private select(dates: string[]) {
    if (this.isDisabled()) return;
    this.selectedDates.set(dates);
    this.updateDisplay(dates);
    if (
      !this.inline() &&
      ((this.selectionMode() === 'single' && dates.length > 0) ||
        (this.selectionMode() === 'multiple-ranged' && dates.length >= 2))
    ) {
      this.close(true);
    }
  }

  private decorate(inline: boolean) {
    this.panel.style.setProperty(
      '--bs-datepicker-day-selected-bg',
      'var(--bng-datepicker-selected-bg, #005fcc)',
    );
    this.panel.style.setProperty(
      '--bs-datepicker-day-selected-color',
      'var(--bng-datepicker-selected-color, #fff)',
    );
    this.panel.setAttribute('role', inline ? 'group' : 'dialog');
    this.panel.setAttribute('aria-label', untracked(this.calendarLabel));
    if (!inline) this.panel.setAttribute('data-vc-input', '');
    else this.panel.removeAttribute('data-vc-input');
  }

  private updateDisplay(dates: string[]) {
    const locale = this.locale() === 'default' ? undefined : this.locale();
    const format = this.dateFormat();
    const displayedDates =
      this.selectionMode() === 'multiple-ranged' && dates.length > 1
        ? [dates[0], dates[dates.length - 1]]
        : dates;
    const value = displayedDates
      .map((date) => {
        const parsed = this.parseDate(date);
        if (!parsed) return date;
        return typeof format === 'function'
          ? format(parsed, locale)
          : new Intl.DateTimeFormat(locale, format).format(parsed);
      })
      .join(this.selectionMode() === 'multiple-ranged' ? ' \u2013 ' : ', ');
    if (this.element.tagName === 'INPUT') (this.element as HTMLInputElement).value = value;
    const hidden = this.inline()
      ? this.element.querySelector<HTMLInputElement>('input[type="hidden"]')
      : null;
    if (hidden) hidden.value = dates.join(',');
    const display = this.displayElement();
    if (display === false) return;
    const target =
      display ??
      (this.element.tagName === 'BUTTON'
        ? (this.element.querySelector<HTMLElement>('[data-bs-datepicker-display]') ?? this.element)
        : null);
    if (target) {
      if (!this.displayPlaceholders.has(target)) {
        this.displayPlaceholders.set(target, target.textContent ?? '');
      }
      target.textContent = value || this.displayPlaceholders.get(target)!;
    }
  }

  private parseDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  }

  private isDisabled() {
    return this.element.matches(':disabled, [aria-disabled="true"]');
  }
}
