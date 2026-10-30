import { effect } from '@angular/core';

type Point = { x: number; y: number };

export function hoverMenu(
  wrapper: HTMLElement,
  trigger: () => HTMLElement,
  floating: () => HTMLElement,
  isOpen: () => boolean,
  open: () => void,
  close: () => void,
) {
  effect((onCleanup) => {
    const anchor = trigger();
    const menu = floating();
    let departure: Point | null = null;

    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') open();
    };
    const leave = (event: PointerEvent) => {
      if (isOpen() && event.pointerType === 'mouse') {
        departure = { x: event.clientX, y: event.clientY };
      }
    };
    const move = (event: PointerEvent) => {
      if (!isOpen() || event.pointerType !== 'mouse') return;
      if (wrapper.contains(event.target as Node)) {
        departure = null;
        return;
      }
      const target = event.target as Element;
      if (target.closest?.('[role="menuitem"]') && wrapper.parentElement?.contains(target)) {
        departure = null;
        close();
        return;
      }
      if (!departure) return;

      const bounds = menu.getBoundingClientRect();
      const edge = bounds.left > anchor.getBoundingClientRect().left ? bounds.left : bounds.right;
      // Bridge the gap without a delayed close, including diagonal pointer travel.
      if (
        inTriangle(
          { x: event.clientX, y: event.clientY },
          departure,
          { x: edge, y: bounds.top - 8 },
          { x: edge, y: bounds.bottom + 8 },
        )
      )
        return;

      departure = null;
      close();
    };

    anchor.addEventListener('pointerenter', enter);
    wrapper.addEventListener('pointerleave', leave);
    wrapper.ownerDocument.addEventListener('pointermove', move);
    wrapper.ownerDocument.addEventListener('pointerover', move);
    onCleanup(() => {
      anchor.removeEventListener('pointerenter', enter);
      wrapper.removeEventListener('pointerleave', leave);
      wrapper.ownerDocument.removeEventListener('pointermove', move);
      wrapper.ownerDocument.removeEventListener('pointerover', move);
    });
  });
}

function inTriangle(point: Point, a: Point, b: Point, c: Point) {
  const cross = (start: Point, end: Point) =>
    (point.x - end.x) * (start.y - end.y) - (start.x - end.x) * (point.y - end.y);
  const sides = [cross(a, b), cross(b, c), cross(c, a)];
  if (a.x === b.x) return false;
  return !(sides.some((side) => side < 0) && sides.some((side) => side > 0));
}
