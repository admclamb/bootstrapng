import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';
import { ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `<button bngButton class="custom" [variant]="variant()">Save</button>`,
})
class TestHost {
  variant = signal<ButtonVariant>('solid');
}

describe('Button', () => {
  it('applies and updates classes while preserving caller classes', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.classList.contains('custom')).toBe(true);
    expect(button.classList.contains('btn')).toBe(true);
    expect(button.classList.contains('btn-solid')).toBe(true);
    expect(button.classList.contains('theme-primary')).toBe(true);

    fixture.componentInstance.variant.set('outline');
    await fixture.whenStable();

    expect(button.classList.contains('btn-outline')).toBe(true);
    expect(button.classList.contains('btn-solid')).toBe(false);
    expect(button.classList.contains('custom')).toBe(true);
  });
});
