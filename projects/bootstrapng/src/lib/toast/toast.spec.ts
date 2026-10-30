import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Toast } from './toast';
import { ToastClose } from './toast-close';

@Component({
  imports: [Toast, ToastClose],
  template: `
    <bng-toast
      [delay]="delay()"
      [autohide]="autohide()"
      (show)="onShow($event)"
      (shown)="onShown()"
      (hide)="onHide($event)"
      (hidden)="onHidden()"
    >
      <button type="button" bngToastClose>Close</button>
      <button type="button">Action</button>
    </bng-toast>
    <button type="button" class="outside">Outside</button>
  `,
})
class TestHost {
  delay = signal(1000);
  autohide = signal(true);
  onShow = vi.fn<(event: Event) => void>();
  onShown = vi.fn();
  onHide = vi.fn<(event: Event) => void>();
  onHidden = vi.fn();
  toast = viewChild.required(Toast);
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const fixture = TestBed.createComponent(TestHost);
    const element = fixture.nativeElement.querySelector('bng-toast') as HTMLElement;
    const animations = vi.fn<() => Animation[]>(() => []);
    Object.defineProperty(element, 'getAnimations', { value: animations });
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const show = () => {
      const promise = host.toast().show();
      fixture.detectChanges();
      return promise;
    };
    return { fixture, host, element, animations, show };
  }

  it('starts hidden, emits ordered lifecycle outputs, and can be shown again', async () => {
    const { fixture, host, element, show } = setup();
    expect(host.toast().isShown()).toBe(false);
    await show();
    expect(host.onShow).toHaveBeenCalledOnce();
    expect(host.onShown).toHaveBeenCalledOnce();
    expect(host.toast().isShown()).toBe(true);
    element.querySelector('button')!.click();
    fixture.detectChanges();
    expect(host.onHide).toHaveBeenCalledOnce();
    expect(host.onHidden).toHaveBeenCalledOnce();
    await show();
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(host.onHidden).toHaveBeenCalledTimes(2);
  });

  it('pauses on hover and resumes the remaining delay', async () => {
    const { fixture, host, element, show } = setup();
    await show();
    await vi.advanceTimersByTimeAsync(400);
    element.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2000);
    expect(host.onHide).not.toHaveBeenCalled();
    element.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(599);
    expect(host.onHide).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(host.onHidden).toHaveBeenCalledOnce();
  });

  it('stays paused while focus is inside even after the pointer leaves', async () => {
    const { fixture, host, element, show } = setup();
    await show();
    const [close, action] = element.querySelectorAll('button');
    close.focus();
    fixture.detectChanges();
    element.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    element.dispatchEvent(new MouseEvent('mouseleave'));
    action.focus();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2000);
    expect(host.onHide).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('.outside') as HTMLElement).focus();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(host.onHidden).toHaveBeenCalledOnce();
  });

  it('uses autohide=false for persistent toasts and applies a changed delay', async () => {
    const { fixture, host, show } = setup();
    host.autohide.set(false);
    fixture.detectChanges();
    await show();
    await vi.advanceTimersByTimeAsync(10000);
    expect(host.onHide).not.toHaveBeenCalled();
    host.delay.set(2000);
    host.autohide.set(true);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1999);
    expect(host.onHide).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(host.onHidden).toHaveBeenCalledOnce();
  });

  it('allows show and hide events to cancel the operation', async () => {
    const { fixture, host, show } = setup();
    host.onShow.mockImplementationOnce((event) => event.preventDefault());
    await show();
    expect(host.toast().isShown()).toBe(false);
    expect(host.onShown).not.toHaveBeenCalled();
    await show();
    host.onHide.mockImplementationOnce((event) => event.preventDefault());
    await host.toast().hide();
    fixture.detectChanges();
    expect(host.toast().isShown()).toBe(true);
    expect(host.onHidden).not.toHaveBeenCalled();
  });

  it('waits for animation completion, ignores transition-time calls, and resolves on destruction', async () => {
    const { fixture, host, animations } = setup();
    let finish!: () => void;
    animations.mockReturnValue([
      {
        finished: new Promise<void>((resolve) => {
          finish = resolve;
        }),
      } as unknown as Animation,
    ]);
    const showing = host.toast().show();
    fixture.detectChanges();
    await host.toast().hide();
    await host.toast().show();
    expect(host.onShown).not.toHaveBeenCalled();
    finish();
    await showing;
    fixture.detectChanges();
    expect(host.onShown).toHaveBeenCalledOnce();
    const hiding = host.toast().hide();
    fixture.destroy();
    await hiding;
    await vi.advanceTimersByTimeAsync(2000);
    expect(host.onHidden).not.toHaveBeenCalled();
  });

  it('treats a zero delay as immediate auto-hide, not persistence', async () => {
    const { fixture, host, show } = setup();
    host.delay.set(0);
    fixture.detectChanges();
    await show();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(host.onHidden).toHaveBeenCalledOnce();
  });
});
