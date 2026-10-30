import { Directive, inject } from '@angular/core';
import { Toast } from './toast';

@Directive({
  selector: 'button[bngToastClose]',
  host: { '(click)': 'toast.hide()' },
})
export class ToastClose {
  protected readonly toast = inject(Toast, { skipSelf: true });
}
