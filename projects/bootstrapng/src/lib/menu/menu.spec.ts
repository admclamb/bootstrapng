import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { computePosition } from '@floating-ui/dom';
import { vi } from 'vitest';
import { Menu, MenuItem, MenuTrigger, Submenu } from './menu';

const stopPositioning = vi.hoisted(() => vi.fn());
vi.mock('@floating-ui/dom', () => ({
  autoUpdate: vi.fn((_reference: Element, _menu: HTMLElement, update: () => void) => {
    update();
    return stopPositioning;
  }),
  computePosition: vi.fn(),
  offset: vi.fn(),
  flip: vi.fn(),
  shift: vi.fn(),
}));

@Component({
  imports: [Menu, MenuItem, MenuTrigger],
  template: `
    <button type="button" [bngMenuTrigger]="actions" [disabled]="disabled()">Actions</button>
    <div bngMenu #actions="bngMenu">
      <button type="button" bngMenuItem (click)="selected()">Edit</button>
      <a bngMenuItem href="#delete" disabled (click)="selected()">Delete</a>
      <button type="button" bngMenuItem (click)="selected()">Duplicate</button>
    </div>
    <button type="button" class="outside">Outside</button>
  `,
})
class TestHost {
  disabled = signal(false);
  selected = vi.fn();
  menu = viewChild.required(Menu);
}

@Component({
  imports: [Menu, MenuItem, MenuTrigger, Submenu],
  template: `
    <div [attr.dir]="direction()">
      <button type="button" [bngMenuTrigger]="actions">Actions</button>
      <div bngMenu #actions="bngMenu">
        <button type="button" bngMenuItem>Level 1 action</button>
        <div bngSubmenu>
          <button type="button" bngMenuItem [bngMenuTrigger]="second">Level 1 submenu</button>
          <div bngMenu #second="bngMenu">
            <button type="button" bngMenuItem>Level 2 action</button>
            <div bngSubmenu>
              <button type="button" bngMenuItem [bngMenuTrigger]="third">Level 2 submenu</button>
              <div bngMenu #third="bngMenu">
                <button type="button" bngMenuItem (click)="selected()">Level 3 action</button>
              </div>
            </div>
          </div>
        </div>
        <div bngSubmenu>
          <button type="button" bngMenuItem [bngMenuTrigger]="sibling" [disabled]="disabled()">
            Sibling submenu
          </button>
          <div bngMenu #sibling="bngMenu">
            <button type="button" bngMenuItem>Sibling action</button>
          </div>
        </div>
        <button type="button" bngMenuItem>Another level 1</button>
      </div>
    </div>
    <button type="button" class="outside">Outside</button>
  `,
})
class NestedHost {
  direction = signal('ltr');
  disabled = signal(false);
  selected = vi.fn();
  menu = viewChild.required(Menu);
}

@Component({
  imports: [Submenu],
  template: `<div bngSubmenu></div>`,
})
class InvalidSubmenuHost {}

describe('Menu', () => {
  const position = {
    x: 10,
    y: 20,
    placement: 'bottom-start',
    strategy: 'fixed',
    middlewareData: {},
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(computePosition).mockResolvedValue(position);
  });

  describe('Submenu', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(computePosition).mockImplementation(async (_reference, _floating, options) => ({
        x: 10,
        y: 20,
        placement: options?.placement ?? 'bottom-start',
        strategy: 'fixed',
        middlewareData: {},
      }));
    });

    async function setup() {
      const fixture = TestBed.createComponent(NestedHost);
      await fixture.whenStable();
      const menu = fixture.componentInstance.menu();
      const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[];
      const button = (label: string) =>
        buttons.find((element) => element.textContent?.trim() === label)!;
      const press = async (key: string) => {
        document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
        await fixture.whenStable();
      };
      trigger.click();
      await fixture.whenStable();
      return { fixture, menu, trigger, button, press };
    }

    it('requires an ancestor menu', () => {
      expect(() => TestBed.createComponent(InvalidSubmenuHost)).toThrow(/Menu/);
    });

    it('navigates one level at a time and closes only the active level on Escape', async () => {
      const { button, press, trigger } = await setup();
      await press('ArrowDown');
      expect(document.activeElement).toBe(button('Level 1 submenu'));
      await press('ArrowRight');
      expect(document.activeElement).toBe(button('Level 2 action'));
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('true');
      await press('ArrowDown');
      expect(document.activeElement).toBe(button('Level 2 submenu'));
      await press('Enter');
      expect(document.activeElement).toBe(button('Level 3 action'));
      await press('Escape');
      expect(document.activeElement).toBe(button('Level 2 submenu'));
      expect(button('Level 2 submenu').getAttribute('aria-expanded')).toBe('false');
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('true');
      await press('ArrowLeft');
      expect(document.activeElement).toBe(button('Level 1 submenu'));
      await press('Escape');
      expect(document.activeElement).toBe(trigger);
    });

    it('toggles with click, opens with Space, and closes the whole tree on leaf selection', async () => {
      const { fixture, button, press, trigger, menu } = await setup();
      button('Level 1 submenu').click();
      await fixture.whenStable();
      expect(menu.isOpen()).toBe(true);
      expect(document.activeElement).toBe(button('Level 2 action'));
      button('Level 1 submenu').click();
      await fixture.whenStable();
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('false');
      button('Level 1 submenu').focus();
      await press(' ');
      await press('ArrowDown');
      await press(' ');
      await press('Enter');
      expect(fixture.componentInstance.selected).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(trigger);
      expect(menu.isOpen()).toBe(false);
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('false');
      expect(button('Level 2 submenu').getAttribute('aria-expanded')).toBe('false');
    });

    it('closes sibling branches and closes a branch when focus moves to another item', async () => {
      const { fixture, button, press, menu } = await setup();
      button('Level 1 submenu').click();
      await fixture.whenStable();
      button('Level 2 submenu').click();
      await fixture.whenStable();
      button('Sibling submenu').click();
      await fixture.whenStable();
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('false');
      expect(button('Level 2 submenu').getAttribute('aria-expanded')).toBe('false');
      expect(button('Sibling submenu').getAttribute('aria-expanded')).toBe('true');
      await press('ArrowLeft');
      await press('ArrowDown');
      expect(document.activeElement).toBe(button('Another level 1'));
      expect(button('Sibling submenu').getAttribute('aria-expanded')).toBe('false');
      expect(menu.isOpen()).toBe(true);
    });

    it('tabs out of the entire tree and closes descendants when the root closes', async () => {
      const { fixture, button, press, trigger, menu } = await setup();
      button('Level 1 submenu').click();
      await fixture.whenStable();
      button('Level 2 submenu').click();
      await fixture.whenStable();
      await press('Tab');
      expect(menu.isOpen()).toBe(false);
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('false');
      expect(button('Level 2 submenu').getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await fixture.whenStable();
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('false');
    });

    it('opens on mouse hover without moving focus and respects disabled triggers', async () => {
      const { fixture, button, menu } = await setup();
      const focused = document.activeElement;
      button('Level 1 submenu').dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      );
      await fixture.whenStable();
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(focused);
      button('Another level 1').dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }),
      );
      await fixture.whenStable();
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('false');
      fixture.componentInstance.disabled.set(true);
      await fixture.whenStable();
      button('Sibling submenu').dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      );
      await fixture.whenStable();
      expect(button('Sibling submenu').getAttribute('aria-expanded')).toBe('false');
      expect(menu.isOpen()).toBe(true);
    });

    it('reverses horizontal navigation and preferred placement in RTL', async () => {
      const { fixture, button, press } = await setup();
      fixture.componentInstance.direction.set('rtl');
      await fixture.whenStable();
      button('Level 1 submenu').focus();
      await press('ArrowLeft');
      expect(document.activeElement).toBe(button('Level 2 action'));
      expect(computePosition).toHaveBeenLastCalledWith(
        button('Level 1 submenu'),
        expect.any(HTMLElement),
        expect.objectContaining({ placement: 'left-start' }),
      );
      await press('ArrowRight');
      expect(document.activeElement).toBe(button('Level 1 submenu'));
      expect(button('Level 1 submenu').getAttribute('aria-expanded')).toBe('false');
    });

    it.each(['ltr', 'rtl'])(
      'protects diagonal hover travel and closes on departure in %s',
      async (direction) => {
        const { fixture, button } = await setup();
        fixture.componentInstance.direction.set(direction);
        await fixture.whenStable();
        const trigger = button('Level 1 submenu');
        const wrapper = trigger.parentElement!;
        const menu = trigger.nextElementSibling as HTMLElement;
        vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 100, 30));
        vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue(
          new DOMRect(direction === 'ltr' ? 112 : -152, 20, 160, 120),
        );

        trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
        await fixture.whenStable();
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
        await fixture.whenStable();

        wrapper.dispatchEvent(
          new PointerEvent('pointerleave', {
            pointerType: 'mouse',
            clientX: direction === 'ltr' ? 110 : 10,
            clientY: 35,
          }),
        );
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            clientX: direction === 'ltr' ? 111 : 9,
            clientY: 40,
          }),
        );
        await fixture.whenStable();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');

        button('Level 2 action').dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerType: 'mouse',
            clientX: direction === 'ltr' ? 120 : 0,
            clientY: 40,
          }),
        );
        await fixture.whenStable();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');

        wrapper.dispatchEvent(
          new PointerEvent('pointerleave', {
            pointerType: 'mouse',
            clientX: direction === 'ltr' ? 120 : 0,
            clientY: 160,
          }),
        );
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            clientX: direction === 'ltr' ? 140 : -20,
            clientY: 180,
          }),
        );
        await fixture.whenStable();
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
      },
    );
  });

  async function setup() {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const menu = fixture.componentInstance.menu();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    return { fixture, menu, trigger };
  }

  it('connects ARIA attributes and positions the open menu', async () => {
    const { fixture, menu, trigger } = await setup();
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(menu.element.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(menu.element.hasAttribute('inert')).toBe(true);

    trigger.click();
    await fixture.whenStable();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(menu.element.hasAttribute('inert')).toBe(false);
    expect(menu.element.style.left).toBe('10px');
    expect(menu.element.style.top).toBe('20px');
    expect(computePosition).toHaveBeenCalledWith(
      trigger,
      menu.element,
      expect.objectContaining({ strategy: 'fixed', placement: 'bottom-start' }),
    );
  });

  it('closes on selection and invokes the caller action', async () => {
    const { fixture, menu, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    menu.element.querySelector('button')!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.selected).toHaveBeenCalledOnce();
    expect(menu.isOpen()).toBe(false);
    expect(stopPositioning).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps the last position during the closing transition and repositions on reopen', async () => {
    const { fixture, menu, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    trigger.click();
    await fixture.whenStable();

    expect(menu.isOpen()).toBe(false);
    expect(stopPositioning).toHaveBeenCalledOnce();
    expect(menu.element.style.position).toBe('fixed');
    expect(menu.element.style.left).toBe('10px');
    expect(menu.element.style.top).toBe('20px');
    expect(menu.element.getAttribute('data-bs-placement')).toBe('bottom-start');

    vi.mocked(computePosition).mockResolvedValueOnce({ ...position, x: 30, y: 40 });
    trigger.click();
    await fixture.whenStable();

    expect(menu.element.style.left).toBe('30px');
    expect(menu.element.style.top).toBe('40px');
  });

  it('blocks disabled link actions without closing the menu', async () => {
    const { fixture, menu, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const disabled = menu.element.querySelector('a')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    disabled.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.selected).not.toHaveBeenCalled();
    expect(menu.isOpen()).toBe(true);
  });

  it('navigates enabled items, wraps, and restores trigger focus on Escape', async () => {
    const { fixture, menu, trigger } = await setup();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await fixture.whenStable();
    const [edit, duplicate] = menu.element.querySelectorAll('button');
    expect(document.activeElement).toBe(duplicate);

    const press = (key: string) =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    press('ArrowDown');
    expect(document.activeElement).toBe(edit);
    press('ArrowUp');
    expect(document.activeElement).toBe(duplicate);
    press('Home');
    expect(document.activeElement).toBe(edit);
    press('End');
    expect(document.activeElement).toBe(duplicate);
    press('e');
    expect(document.activeElement).toBe(edit);
    press('Escape');
    expect(menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('activates an item with Space without a duplicate native click', async () => {
    const { fixture, menu, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      cancelable: true,
    });
    menu.element.querySelector('button')!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.selected).toHaveBeenCalledOnce();
    expect(menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on outside click and focus without stealing focus', async () => {
    const { fixture, menu, trigger } = await setup();
    const outside: HTMLButtonElement = fixture.nativeElement.querySelector('.outside');
    trigger.click();
    await fixture.whenStable();
    outside.click();
    expect(menu.isOpen()).toBe(false);

    trigger.click();
    await fixture.whenStable();
    outside.focus();
    expect(menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('does not open a disabled trigger and closes when disabled while open', async () => {
    const { fixture, menu, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(menu.isOpen()).toBe(false);
    trigger.click();
    expect(menu.isOpen()).toBe(false);
  });

  it('ignores a pending position result after close', async () => {
    let resolvePosition!: (result: typeof position) => void;
    vi.mocked(computePosition).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePosition = resolve;
        }),
    );
    const { fixture, menu, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    menu.close();
    await fixture.whenStable();
    resolvePosition(position);
    await fixture.whenStable();

    expect(menu.element.style.left).toBe('');
    expect(menu.isOpen()).toBe(false);
  });

  it('releases positioning and document listeners when destroyed', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    fixture.destroy();
    expect(stopPositioning).toHaveBeenCalledOnce();
    expect(() => document.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
  });
});
