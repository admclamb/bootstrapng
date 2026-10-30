import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Alert } from './alert';

describe('Alert', () => {
  it('only shows a close button when dismissible', async () => {
    const fixture = TestBed.createComponent(Alert);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();

    fixture.componentRef.setInput('dismissible', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')?.getAttribute('aria-label')).toBe('Close');
  });

  it('emits synchronously on dismissal and leaves removal to the parent', async () => {
    const fixture = TestBed.createComponent(Alert);
    fixture.componentRef.setInput('dismissible', true);
    await fixture.whenStable();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    fixture.nativeElement.querySelector('button').click();

    expect(closed).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.isConnected).toBe(true);
    expect(fixture.nativeElement.classList.contains('hiding')).toBe(false);
  });

  it('supports programmatic close requests', () => {
    const fixture = TestBed.createComponent(Alert);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    fixture.componentInstance.close();

    expect(closed).toHaveBeenCalledOnce();
  });
});
