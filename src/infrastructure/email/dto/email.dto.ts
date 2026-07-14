export class MailDispatcherDto {
  readonly from!: string;
  readonly to!: string | string[];
  readonly subject!: string;
  readonly html?: string;
  readonly text?: string;
  readonly attachments?: object[];
}
