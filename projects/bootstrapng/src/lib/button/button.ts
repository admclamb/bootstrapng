import { computed, Directive, input } from '@angular/core';

export const buttonVariants = {
  base: 'btn',
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
  variants: {
    solid: 'btn-solid',
    outline: 'btn-outline',
    subtle: 'btn-subtle',
    link: 'btn-link',
  },
  sizes: {
    default: '',
    xs: 'btn-xs',
    sm: 'btn-sm',
    lg: 'btn-lg',
    icon: 'btn-icon',
  },
  defaultVariants: {
    variant: 'solid',
    theme: 'primary',
    size: 'default',
  },
};

export type ButtonTheme = keyof typeof buttonVariants.theme;
export type ButtonVariant = keyof typeof buttonVariants.variants;
export type ButtonSize = keyof typeof buttonVariants.sizes;

@Directive({
  selector: '[bngButton]',
  host: {
    '[class]': 'classes()',
  },
})
export class Button {
  variant = input<ButtonVariant>(buttonVariants.defaultVariants.variant as ButtonVariant);
  theme = input<ButtonTheme>(buttonVariants.defaultVariants.theme as ButtonTheme);
  size = input<ButtonSize>(buttonVariants.defaultVariants.size as ButtonSize);

  classes = computed(() =>
    [
      buttonVariants.base,
      buttonVariants.variants[this.variant()],
      buttonVariants.theme[this.theme()],
      buttonVariants.sizes[this.size()],
    ]
      .filter(Boolean)
      .join(' '),
  );
}
