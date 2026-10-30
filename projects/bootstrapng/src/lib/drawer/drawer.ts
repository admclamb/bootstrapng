import { computed, Directive, inject, input } from '@angular/core';
import { NativeDialog } from '../dialog/native-dialog';

export const drawerVariants = {
  base: 'drawer',
  placement: {
    start: 'drawer-start',
    end: 'drawer-end',
    top: 'drawer-top',
    bottom: 'drawer-bottom',
  },
  defaultVariants: {
    placement: 'start',
  },
};

export type DrawerPlacement = keyof typeof drawerVariants.placement;

@Directive({
  selector: 'dialog[bngDrawer]',
  exportAs: 'bngDrawer',
  host: {
    '[class]': 'classes()',
  },
  hostDirectives: [
    { directive: NativeDialog, inputs: ['keyboard', 'backdrop'], outputs: ['opened', 'closed'] },
  ],
})
export class Drawer {
  private readonly dialog = inject(NativeDialog);
  readonly placement = input<DrawerPlacement>(
    drawerVariants.defaultVariants.placement as DrawerPlacement,
  );
  readonly classes = computed(() =>
    [drawerVariants.base, drawerVariants.placement[this.placement()]].join(' '),
  );
  readonly isOpen = this.dialog.isOpen;
  readonly open = this.dialog.open;
  readonly close = this.dialog.close;
}
