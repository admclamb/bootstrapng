import { Component, computed, input, output } from '@angular/core';

export const alertVariants = {
  theme: {
    primary: 'theme-primary',
    accent: 'theme-accent',
    success: 'theme-success',
    warning: 'theme-warning',
    danger: 'theme-danger',
    info: 'theme-info',
    inverse: 'theme-inverse',
    secondary: 'theme-secondary',
  },
};

export type AlertTheme = keyof typeof alertVariants.theme;

@Component({
  imports: [],
  selector: 'bng-alert',
  template: `
    <ng-content />
    @if (dismissible()) {
      <button type="button" class="btn-close" aria-label="Close" (click)="close()"></button>
    }
  `,
  host: {
    '[class]': 'classes()',
    'animate.leave': 'hiding',
  },
})
export class Alert {
  dismissible = input(false);
  theme = input<AlertTheme>('primary');
  closed = output<void>();

  classes = computed(() => ['alert', alertVariants.theme[this.theme()]].join(' '));

  close(): void {
    this.closed.emit();
  }
}
