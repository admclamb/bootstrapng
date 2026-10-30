import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Popover } from '../popover/popover';
import { Tooltip } from './tooltip';

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
    placement: 'top',
    middlewareData: { arrow: { x: 10 } },
  })),
  offset: vi.fn(),
  flip: vi.fn(),
  shift: vi.fn(),
  arrow: vi.fn(),
}));

@Component({
  imports: [Tooltip, Popover],
  template: `
    <span id="existing">Existing description</span>
    <button
      type="button"
      [bngTooltip]="message()"
      [disabled]="disabled()"
      aria-describedby="existing"
    >
      Help
    </button>
    <ng-template #details><strong>Caller template</strong></ng-template>
    <button type="button" [bngPopover]="details" popoverTitle="Details">Details</button>
  `,
})
class TestHost {
  message = signal('<b>Plain text</b>');
  disabled = signal(false);
  tooltip = viewChild.required(Tooltip);
  popover = viewChild.required(Popover);
}

describe('Anchored popups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
      configurable: true,
      value: vi.fn(() => []),
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');
  });

  it('preserves descriptions, renders strings as text, and closes when disabled', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const trigger = fixture.nativeElement.querySelector('button') as HTMLElement;
    host.tooltip().open();
    await fixture.whenStable();
    const popup = document.querySelector('[role="tooltip"]')!;
    expect(popup.textContent).toContain('<b>Plain text</b>');
    expect(popup.querySelector('b')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBe(`existing ${popup.id}`);
    host.message.set('Updated');
    await fixture.whenStable();
    expect(popup.textContent).toContain('Updated');
    host.disabled.set(true);
    await fixture.whenStable();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBe('existing');
    expect(stop).toHaveBeenCalledOnce();
  });

  it('renders caller templates and removes detached panels on host destruction', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    fixture.componentInstance.popover().open();
    await fixture.whenStable();
    const panel = document.querySelector('.popover')!;
    expect(panel.querySelector('strong')?.textContent).toBe('Caller template');
    expect(panel.getAttribute('aria-label')).toBe('Details');
    fixture.destroy();
    expect(document.querySelector('.popover')).toBeNull();
    expect(stop).toHaveBeenCalledOnce();
  });
});
