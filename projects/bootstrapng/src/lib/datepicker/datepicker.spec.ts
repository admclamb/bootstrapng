import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Datepicker } from './datepicker';

const stop = vi.hoisted(() => vi.fn());
vi.mock('@floating-ui/dom', () => ({
  autoUpdate: vi.fn((_anchor: Element, _panel: HTMLElement, update: () => void) => {
    update();
    return stop;
  }),
  computePosition: vi.fn(async () => ({
    x: 20,
    y: 30,
    strategy: 'fixed',
    placement: 'bottom-start',
    middlewareData: {},
  })),
  offset: vi.fn(),
  flip: vi.fn(),
  shift: vi.fn(),
  arrow: vi.fn(),
}));

@Component({
  imports: [Datepicker],
  template: `
    <div [attr.data-bs-theme]="theme()">
      <label for="date">Event date</label>
      <input
        id="date"
        bngDatepicker
        class="form-control"
        [(selectedDates)]="dates"
        [selectionMode]="mode()"
        [displayMonthsCount]="months()"
        [disabled]="disabled()"
        dateMin="2026-06-05"
        dateMax="2026-07-25"
        locale="en-US"
        [vcpOptions]="options"
        (opened)="opened()"
        (closed)="closed()"
      />
    </div>
    <button id="outside" type="button">Outside</button>
  `,
})
class TestHost {
  dates = signal(['2026-06-10']);
  mode = signal<'single' | 'multiple' | 'multiple-ranged'>('single');
  months = signal<1 | 2>(1);
  theme = signal('light');
  disabled = signal(false);
  options = { dateToday: '2026-06-01' as const };
  opened = vi.fn();
  closed = vi.fn();
  picker = viewChild.required(Datepicker);
}

@Component({
  imports: [Datepicker],
  template: `
    <button type="button" bngDatepicker [(selectedDates)]="dates" locale="en-US">
      <span aria-hidden="true">*</span>
      <span data-bs-datepicker-display>Select date</span>
    </button>
    <div
      bngDatepicker
      inline
      calendarLabel="Booking dates"
      [displayMonthsCount]="2"
      [selectedDates]="dates()"
    >
      <input type="hidden" name="booking" />
    </div>
  `,
})
class AlternateHost {
  dates = signal(['2026-06-10']);
  picker = viewChild.required(Datepicker);
}

describe('Datepicker with Vanilla Calendar Pro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the real calendar, applies bounds, and synchronizes selection in both directions', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('6/10/2026');
    input.focus();
    await fixture.whenStable();
    const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(input.getAttribute('aria-controls')).toBe(panel.id);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(panel.style.left).toBe('20px');
    expect(panel.querySelector('[data-vc-date="2026-06-04"] button')?.hasAttribute('disabled')).toBe(true);
    const selected = vi.fn();
    host.picker().selectedDates.subscribe(selected);
    panel.querySelector<HTMLButtonElement>('[data-vc-date="2026-06-12"] button')!.click();
    await fixture.whenStable();
    expect(host.dates()).toEqual(['2026-06-12']);
    expect(input.value).toBe('6/12/2026');
    expect(host.picker().isOpen()).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(host.closed).toHaveBeenCalledOnce();
    expect(selected).toHaveBeenCalledOnce();

    host.dates.set(['2026-06-20']);
    await fixture.whenStable();
    expect(input.value).toBe('6/20/2026');
    expect(selected).toHaveBeenCalledOnce();
    host.dates.set([]);
    await fixture.whenStable();
    expect(input.value).toBe('');
  });

  it('keeps ranges open until complete and supports multiple months and multiple selection', async () => {
    const fixture = TestBed.createComponent(TestHost);
    const host = fixture.componentInstance;
    host.dates.set([]);
    host.mode.set('multiple-ranged');
    host.months.set(2);
    await fixture.whenStable();
    host.picker().open();
    await fixture.whenStable();
    const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(panel.querySelectorAll('[data-vc="column"]')).toHaveLength(2);
    panel.querySelector<HTMLButtonElement>('[data-vc-date="2026-06-10"] button')!.click();
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(true);
    panel.querySelector<HTMLButtonElement>('[data-vc-date="2026-06-12"] button')!.click();
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(false);
    expect(host.dates()[0]).toBe('2026-06-10');
    expect(host.dates().at(-1)).toBe('2026-06-12');

    host.mode.set('multiple');
    host.dates.set([]);
    await fixture.whenStable();
    host.picker().open();
    await fixture.whenStable();
    panel.querySelector<HTMLButtonElement>('[data-vc-date="2026-06-15"] button')!.click();
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(true);
    expect(host.dates()).toEqual(['2026-06-15']);
  });

  it('dismisses outside and on Escape, inherits live themes, and cleans up on destruction', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    await fixture.whenStable();
    const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
    host.theme.set('dark');
    await fixture.whenStable();
    expect(input.parentElement?.getAttribute('data-bs-theme')).toBe('dark');
    await vi.waitFor(() => expect(panel.getAttribute('data-bs-theme')).toBe('dark'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(panel.contains(document.activeElement)).toBe(true);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(host.opened).toHaveBeenCalledOnce();

    input.click();
    await fixture.whenStable();
    const outside = fixture.nativeElement.querySelector('#outside') as HTMLButtonElement;
    outside.focus();
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(false);
    input.click();
    await fixture.whenStable();
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(false);
    fixture.destroy();
    expect(document.querySelector('[data-vc="calendar"]')).toBeNull();
    expect(stop).toHaveBeenCalled();
  });

  it('does not open disabled inputs and accepts ISO text without rolling invalid dates over', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    host.disabled.set(true);
    await fixture.whenStable();
    host.picker().open();
    expect(host.picker().isOpen()).toBe(false);
    host.disabled.set(false);
    await fixture.whenStable();
    input.value = '2026-06-18';
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.dates()).toEqual(['2026-06-18']);
    input.value = '2026-02-31';
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.dates()).toEqual(['2026-06-18']);
    expect(input.value).toBe('6/18/2026');
    input.value = '';
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.dates()).toEqual([]);
  });

  it('preserves button icons, toggles, and renders inline calendars with a hidden ISO field', async () => {
    const fixture = TestBed.createComponent(AlternateHost);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.querySelector('[aria-hidden]')?.textContent).toBe('*');
    expect(button.querySelector('[data-bs-datepicker-display]')?.textContent).toBe('6/10/2026');
    button.click();
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(true);
    button.click();
    await fixture.whenStable();
    expect(host.picker().isOpen()).toBe(false);
    const inline = fixture.nativeElement.querySelector('[role="group"]') as HTMLElement;
    expect(inline.hidden).toBe(false);
    expect(inline.getAttribute('aria-label')).toBe('Booking dates');
    expect(inline.hasAttribute('data-vc-input')).toBe(false);
    expect(inline.querySelectorAll('[data-vc="column"]')).toHaveLength(2);
    const hidden = fixture.nativeElement.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe('2026-06-10');
    host.dates.set(['2026-06-15']);
    await fixture.whenStable();
    expect(hidden.value).toBe('2026-06-15');
  });
});
