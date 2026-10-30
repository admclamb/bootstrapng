import { contentChild, Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { hoverMenu } from '../interaction/hover-menu';
import { Menu } from './menu';
import { MenuTrigger } from './menu-trigger';

@Directive({
  selector: '[bngSubmenu]',
  exportAs: 'bngSubmenu',
  host: {
    class: 'submenu',
    '[class.show]': 'menu().isOpen()',
  },
})
export class Submenu {
  readonly parent = inject(Menu, { skipSelf: true });
  readonly menu = contentChild.required<Menu>(forwardRef(() => Menu));
  private readonly trigger = contentChild.required<MenuTrigger>(forwardRef(() => MenuTrigger));
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    hoverMenu(
      this.element,
      () => this.trigger().element,
      () => this.menu().element,
      () => this.menu().isOpen(),
      () => {
        if (!this.trigger().disabled()) this.menu().open(null);
      },
      () => {
        const menu = this.menu();
        menu.close(menu.element.contains(this.element.ownerDocument.activeElement));
      },
    );
  }
}
