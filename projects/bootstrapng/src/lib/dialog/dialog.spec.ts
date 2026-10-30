import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Drawer } from '../drawer/drawer';
import { Dialog } from './dialog';
import { DialogClose } from './dialog-close';

@Component({
  imports: [Dialog, DialogClose, Drawer],
  template: `
    <button type="button" class="trigger" (click)="dialog.open()">Open</button>
    <dialog bngDialog #dialog="bngDialog" aria-label="Confirmation" (closed)="closed()">
      <button type="button" bngDialogClose>Close</button>
    </dialog>
    @if (showDrawer()) {
      <dialog bngDrawer #drawer="bngDrawer" aria-label="Navigation">
        <button type="button" bngDialogClose>Close drawer</button>
      </dialog>
    }
  `,
})
class TestHost {
  dialog = viewChild.required(Dialog);
  drawer = viewChild(Drawer);
  showDrawer = signal(true);
  closed = vi.fn();
}

@Component({
  imports: [DialogClose],
  template: `<button type="button" bngDialogClose>Close</button>`,
})
class InvalidHost {}

describe('Dialog lifecycle', () => {
  async function setup() {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const elements = Array.from(
      fixture.nativeElement.querySelectorAll('dialog'),
    ) as HTMLDialogElement[];
    // Simulate native dialog APIs in the DOM test environment; stories exercise real Chromium.
    for (const element of elements) {
      element.showModal = vi.fn(() => element.setAttribute('open', ''));
      element.close = vi.fn(() => {
        element.removeAttribute('open');
        element.dispatchEvent(new Event('close'));
      });
      Object.defineProperty(element, 'getAnimations', {
        configurable: true,
        value: vi.fn(() => []),
      });
    }
    return { fixture, host: fixture.componentInstance, elements };
  }

  it('keeps the dialog open and scroll locked until exit animations finish', async () => {
    const {
      fixture,
      host,
      elements: [element],
    } = await setup();
    let finish!: () => void;
    vi.mocked(element.getAnimations).mockReturnValue([
      {
        finished: new Promise<void>((resolve) => {
          finish = resolve;
        }),
      } as unknown as Animation,
    ]);
    const trigger = fixture.nativeElement.querySelector('.trigger') as HTMLButtonElement;
    trigger.focus();
    host.dialog().open();
    host.dialog().close();
    await fixture.whenStable();
    expect(element.open).toBe(true);
    expect(element.classList.contains('hiding')).toBe(true);
    expect(document.documentElement.classList.contains('dialog-open')).toBe(true);
    expect(host.closed).not.toHaveBeenCalled();

    finish();
    await vi.waitFor(() => expect(element.open).toBe(false));
    await fixture.whenStable();
    expect(element.open).toBe(false);
    expect(host.dialog().isOpen()).toBe(false);
    expect(host.closed).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
    expect(document.documentElement.classList.contains('dialog-open')).toBe(false);
  });

  it('closes instantly without animations and tolerates repeated close requests', async () => {
    const {
      fixture,
      host,
      elements: [element],
    } = await setup();
    host.dialog().open();
    element.querySelector('button')!.click();
    host.dialog().close();
    await fixture.whenStable();
    expect(element.open).toBe(false);
    expect(host.closed).toHaveBeenCalledOnce();
  });

  it('can reopen during exit without a stale completion closing the dialog', async () => {
    const {
      fixture,
      host,
      elements: [element],
    } = await setup();
    let finish!: () => void;
    vi.mocked(element.getAnimations).mockReturnValue([
      {
        finished: new Promise<void>((resolve) => {
          finish = resolve;
        }),
      } as unknown as Animation,
    ]);
    host.dialog().open();
    host.dialog().close();
    await fixture.whenStable();
    host.dialog().open();
    finish();
    await fixture.whenStable();
    expect(element.open).toBe(true);
    expect(element.classList.contains('hiding')).toBe(false);
    expect(host.closed).not.toHaveBeenCalled();
  });

  it('retains the scroll lock until the last surface closes and cleans up on destruction', async () => {
    const { fixture, host, elements } = await setup();
    host.dialog().open();
    host.drawer()!.open();
    host.dialog().close();
    await fixture.whenStable();
    expect(document.documentElement.classList.contains('dialog-open')).toBe(true);
    host.showDrawer.set(false);
    await fixture.whenStable();
    expect(elements[1].open).toBe(false);
    expect(document.documentElement.classList.contains('dialog-open')).toBe(false);
  });

  it('preserves a scroll lock owned by the application', async () => {
    document.documentElement.classList.add('dialog-open');
    try {
      const { fixture, host } = await setup();
      host.dialog().open();
      host.dialog().close();
      await fixture.whenStable();
      expect(document.documentElement.classList.contains('dialog-open')).toBe(true);
    } finally {
      document.documentElement.classList.remove('dialog-open');
    }
  });

  it('rejects close buttons outside an owning dialog or drawer', () => {
    expect(() => TestBed.createComponent(InvalidHost)).toThrow(/NativeDialog/);
  });
});
