import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import {
  ChatMessage,
  GameService,
  Team,
} from '../../services/game/game.service';
import { first, Observable, tap, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  LoggerService,
  LogMessage,
} from '../../services/logger/logger.service';

@Component({
  selector: 'zappy-statistic',
  templateUrl: './statistic.component.html',
  styleUrls: ['./statistic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticComponent {
  teams$: Observable<Team[]>;
  messages$: Observable<ChatMessage[]>;
  @ViewChild('chatView') chatViewPort?: CdkVirtualScrollViewport;
  @ViewChild('logView') logViewPort?: CdkVirtualScrollViewport;
  log$: Observable<LogMessage[]>;
  private delay = 10;

  constructor(
    private readonly gameService: GameService,
    private readonly loggerService: LoggerService
  ) {
    this.teams$ = gameService.gameSettings$.pipe(map((data) => data.teams));
    this.messages$ = this.gameService.messages().pipe(
      tap((data) => {
        timer(this.delay)
          .pipe(
            first(),
            tap(() => this.scrollToEnd(data.length - 1, this.chatViewPort))
          )
          .subscribe();
      })
    );
    this.log$ = this.loggerService.messages().pipe(
      tap((data) => {
        timer(this.delay)
          .pipe(
            first(),
            tap(() => this.scrollToEnd(data.length - 1, this.logViewPort))
          )
          .subscribe();
      })
    );
  }

  scrollToEnd(index: number, port?: CdkVirtualScrollViewport) {
    port?.scrollToIndex(index, 'smooth');
  }
}
