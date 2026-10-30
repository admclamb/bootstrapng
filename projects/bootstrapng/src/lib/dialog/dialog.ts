import { Directive, inject } from '@angular/core';
import { NativeDialog } from './native-dialog';

@Directive({
  selector: 'dialog[bngDialog]',
  exportAs: 'bngDialog',
  host: { class: 'dialog' },
  hostDirectives: [
    { directive: NativeDialog, inputs: ['keyboard', 'backdrop'], outputs: ['opened', 'closed'] },
  ],
})
export class Dialog {
  private readonly dialog = inject(NativeDialog);
  readonly isOpen = this.dialog.isOpen;
  readonly open = this.dialog.open;
  readonly close = this.dialog.close;
}
