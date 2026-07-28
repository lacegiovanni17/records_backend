import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Return the default greeting string
  getHello(): string {
    return 'Hello World!';
  }
}
