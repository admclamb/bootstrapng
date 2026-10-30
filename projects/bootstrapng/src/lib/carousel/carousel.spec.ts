import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Carousel, CarouselSlide, CarouselSlideEvent } from './carousel';

@Component({
  imports: [Carousel, CarouselSlide],
  template: `
    <bng-carousel
      [autoplay]="autoplay()"
      [interval]="1000"
      [ends]="ends()"
      (slide)="slide($event)"
      (slid)="slid($event)"
    >
      @for (item of items(); track item) {
        <ng-template bngCarouselSlide>{{ item }}</ng-template>
      }
    </bng-carousel>
  `,
})
class TestHost {
  items = signal(['First', 'Second', 'Third']);
  autoplay = signal(false);
  ends = signal<'loop' | 'stop'>('loop');
  slide = vi.fn<(event: CarouselSlideEvent) => void>();
  slid = vi.fn();
  carousel = viewChild.required(Carousel);
}

describe('Carousel', () => {
  function setup() {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    return {
      fixture,
      host: fixture.componentInstance,
      carousel: fixture.componentInstance.carousel(),
    };
  }

  afterEach(() => vi.useRealTimers());

  it('navigates, wraps, stops at ends, and allows cancellation', () => {
    const { fixture, host, carousel } = setup();
    carousel.prev();
    fixture.detectChanges();
    expect(carousel.activeIndex()).toBe(2);
    carousel.next();
    fixture.detectChanges();
    expect(carousel.activeIndex()).toBe(0);
    host.ends.set('stop');
    fixture.detectChanges();
    carousel.prev();
    expect(carousel.activeIndex()).toBe(0);
    host.slide.mockImplementationOnce((event) => event.preventDefault());
    carousel.next();
    expect(carousel.activeIndex()).toBe(0);
    carousel.to(1.5);
    expect(carousel.activeIndex()).toBe(0);
    carousel.to(100);
    fixture.detectChanges();
    expect(carousel.activeIndex()).toBe(2);
  });

  it('pauses autoplay on manual navigation and restarts only on cycle', async () => {
    vi.useFakeTimers();
    const { fixture, host, carousel } = setup();
    host.autoplay.set(true);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(carousel.activeIndex()).toBe(1);
    carousel.next();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(3000);
    expect(carousel.activeIndex()).toBe(2);
    expect(carousel.playing()).toBe(false);
    carousel.cycle();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(carousel.activeIndex()).toBe(0);
    fixture.destroy();
    await vi.advanceTimersByTimeAsync(5000);
    expect(carousel.activeIndex()).toBe(0);
  });

  it('clamps selection when slides are removed, including an empty carousel', () => {
    const { fixture, host, carousel } = setup();
    carousel.to(2);
    fixture.detectChanges();
    host.items.set(['First']);
    fixture.detectChanges();
    expect(carousel.activeIndex()).toBe(0);
    host.items.set([]);
    fixture.detectChanges();
    carousel.next();
    expect(carousel.activeIndex()).toBe(0);
  });
});
