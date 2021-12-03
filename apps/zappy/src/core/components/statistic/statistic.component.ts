import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import {
  ChatMessage,
  GameService,
  Player,
  Team,
} from '../../services/game/game.service';
import { first, Observable, tap, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  LoggerService,
  LogMessage,
} from '../../services/logger/logger.service';
import { EngineService } from '../../services/engine/engine.service';

@Component({
  selector: 'zappy-statistic',
  templateUrl: './statistic.component.html',
  styleUrls: ['./statistic.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticComponent {
  teams$: Observable<Team[]>;
  players$: Observable<{ [index: number]: Player }>;
  messages$: Observable<ChatMessage[]>;
  @ViewChild('chatView') chatViewPort?: CdkVirtualScrollViewport;
  @ViewChild('logView') logViewPort?: CdkVirtualScrollViewport;
  log$: Observable<LogMessage[]>;
  private delay = 10;

  constructor(
    private readonly engineService: EngineService,
    private readonly loggerService: LoggerService
  ) {
    this.teams$ = engineService.settings().pipe(map((data) => data.teams));
    this.messages$ = this.engineService.messages().pipe(
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
    this.players$ = this.engineService.players();
  }

  scrollToEnd(index: number, port?: CdkVirtualScrollViewport) {
    port?.scrollToIndex(index, 'smooth');
  }

  focusPlayer(id: number) {
    this.engineService.setInfo(id, 'player');
  }
}
