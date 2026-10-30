import { Directive, inject } from '@angular/core';
import { NativeDialog } from './native-dialog';

@Directive({
  selector: 'button[bngDialogClose]',
  host: { '(click)': 'dialog.close()' },
})
export class DialogClose {
  protected readonly dialog = inject(NativeDialog, { skipSelf: true });
}
