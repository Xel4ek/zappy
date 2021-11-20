import { Component, ViewChild } from '@angular/core';
import {
  ChatMessage,
  GameService,
  Team,
} from '../../services/game/game.service';
import { first, Observable, tap, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  selector: 'zappy-statistic',
  templateUrl: './statistic.component.html',
  styleUrls: ['./statistic.component.scss'],
})
export class StatisticComponent {
  teams$: Observable<Team[]>;
  messages$: Observable<ChatMessage[]>;
  @ViewChild('chatView') chatViewPort?: CdkVirtualScrollViewport;
  @ViewChild('logView') logViewPort?: CdkVirtualScrollViewport;
  log$: Observable<ChatMessage[]>;
  private delay = 10;

  constructor(private readonly gameService: GameService) {
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
    this.log$ = this.gameService.log().pipe(
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
