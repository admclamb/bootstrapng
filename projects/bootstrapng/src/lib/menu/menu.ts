import {
  afterRenderEffect,
  contentChildren,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import type { Placement } from '@floating-ui/dom';
import { dismissOnOutside } from '../interaction/dismiss-on-outside';
import { floatingPosition } from '../positioning/floating-position';
import { MenuItem } from './menu-item';
import { focusMenuItem, navigateMenu, type MenuFocus } from './menu-navigation';

export { MenuItem } from './menu-item';
export { MenuTrigger } from './menu-trigger';
export { Submenu } from './submenu';

let nextMenuId = 0;

@Directive({
  selector: '[bngMenu]',
  exportAs: 'bngMenu',
  host: {
    class: 'menu',
    role: 'menu',
    tabindex: '-1',
    '[attr.id]': 'id',
    '[attr.aria-labelledby]': 'trigger()?.id',
    '[attr.aria-hidden]': '!isOpen()',
    '[attr.inert]': 'isOpen() ? null : ""',
    '[class.show]': 'isOpen()',
    '[style.position]': '"fixed"',
    '[style.left.px]': 'position()?.x',
    '[style.top.px]': 'position()?.y',
    '[style.visibility]': 'isOpen() && !position() ? "hidden" : null',
    '[attr.data-bs-placement]': 'position()?.placement',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusin($event)',
  },
})
export class Menu {
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly parent: Menu | null = inject(Menu, { optional: true, skipSelf: true });
  readonly id = this.element.id || `bng-menu-${nextMenuId++}`;
  readonly placement = input<Placement>();
  readonly trigger = signal<HTMLElement | null>(null);

  private readonly opened = signal(false);
  readonly isOpen = this.opened.asReadonly();
  private readonly items = contentChildren(MenuItem, { descendants: true });
  private readonly menus = contentChildren(Menu, { descendants: true });
  private readonly pendingFocus = signal<MenuFocus | null>(null);
  protected readonly position = floatingPosition(
    () => (this.isOpen() ? this.trigger() : null),
    this.element,
    () =>
      this.placement() ??
      (this.parent ? (this.isRtl() ? 'left-start' : 'right-start') : 'bottom-start'),
  );

  constructor() {
    dismissOnOutside(
      this.isOpen,
      (target) => this.element.contains(target) || !!this.trigger()?.contains(target),
      (restoreFocus) => this.close(restoreFocus),
    );

    afterRenderEffect(() => {
      const target = this.pendingFocus();
      if (!this.isOpen() || !this.position() || !target) return;

      const items = this.enabledItems();
      if (items.length) focusMenuItem(items, target);
      else this.element.focus();
      this.pendingFocus.set(null);
    });
  }

  get root(): Menu {
    return this.parent?.root ?? this;
  }

  isRtl() {
    return (
      this.element.ownerDocument.defaultView?.getComputedStyle(this.element).direction === 'rtl'
    );
  }

  open(focus: MenuFocus | null = 'first') {
    if (!this.trigger() || this.trigger()?.hasAttribute('disabled')) return;
    if (this.parent && !this.parent.isOpen()) return;
    this.parent?.closeChildren(this);
    this.pendingFocus.set(focus);
    this.opened.set(true);
  }

  close(restoreFocus = false) {
    this.closeChildren();
    this.pendingFocus.set(null);
    this.opened.set(false);
    if (restoreFocus) this.trigger()?.focus();
  }

  protected onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return;
    event.stopPropagation();
    if (
      event.key === 'Escape' ||
      (this.parent && event.key === (this.isRtl() ? 'ArrowRight' : 'ArrowLeft'))
    ) {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (event.key === 'Tab') {
      // Let the browser tab from the trigger, not from an item that becomes inert.
      if (event.shiftKey) event.preventDefault();
      this.root.trigger()?.focus();
      this.root.close();
    } else {
      navigateMenu(event, this.enabledItems());
    }
  }

  protected onFocusin(event: FocusEvent) {
    for (const menu of this.childMenus()) {
      if (event.target !== menu.trigger() && !menu.element.contains(event.target as Node)) {
        menu.close();
      }
    }
  }

  private childMenus() {
    return this.menus().filter((menu) => menu.parent === this);
  }

  private closeChildren(except?: Menu) {
    for (const menu of this.childMenus()) {
      if (menu !== except) menu.close();
    }
  }

  private enabledItems() {
    return this.items()
      .filter((item) => item.menu === this && !item.disabled())
      .map((item) => item.element);
  }
}
