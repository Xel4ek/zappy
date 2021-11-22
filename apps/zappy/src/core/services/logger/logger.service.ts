import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LogMessage {
  timestamp: number;
  text: string;
}
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private store$ = new BehaviorSubject<LogMessage[]>([]);
  messages() {
    return this.store$.asObservable();
  }
  addMessage(text: string) {
    const messages = this.store$.value;
    this.store$.next([...messages, { timestamp: Date.now(), text }]);
  }
}
