import { computed, Directive, input } from '@angular/core';

export const toastContainerVariants = {
  base: 'toast-container',
  placement: {
    'top-start': 'top-0 start-0',
    'top-center': 'top-0 start-50 translate-middle-x',
    'top-end': 'top-0 end-0',
    'middle-start': 'top-50 start-0 translate-middle-y',
    'middle-center': 'top-50 start-50 translate-middle',
    'middle-end': 'top-50 end-0 translate-middle-y',
    'bottom-start': 'bottom-0 start-0',
    'bottom-center': 'bottom-0 start-50 translate-middle-x',
    'bottom-end': 'bottom-0 end-0',
  },
  position: {
    fixed: 'position-fixed',
    absolute: 'position-absolute',
    static: 'position-static',
  },
  defaultVariants: {
    placement: 'bottom-end',
    position: 'fixed',
  },
};

export type ToastPlacement = keyof typeof toastContainerVariants.placement;
export type ToastPosition = keyof typeof toastContainerVariants.position;

@Directive({
  selector: '[bngToastContainer]',
  host: {
    '[class]': 'classes()',
    'aria-live': 'polite',
    'aria-atomic': 'false',
  },
})
export class ToastContainer {
  readonly placement = input<ToastPlacement>(
    toastContainerVariants.defaultVariants.placement as ToastPlacement,
  );
  readonly position = input<ToastPosition>(
    toastContainerVariants.defaultVariants.position as ToastPosition,
  );
  readonly classes = computed(() =>
    [
      toastContainerVariants.base,
      toastContainerVariants.position[this.position()],
      this.position() === 'static' ? '' : toastContainerVariants.placement[this.placement()],
    ].join(' '),
  );
}
