import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[bngCarouselSlide]',
})
export class CarouselSlide {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
  readonly label = input('');
}
