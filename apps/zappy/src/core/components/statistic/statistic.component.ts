import { Component, OnInit } from '@angular/core';
import {
  ChatMessage,
  GameService,
  Team,
} from '../../services/game/game.service';
import { mapTo, Observable, of, startWith, switchMap, tap, timer } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'zappy-statistic',
  templateUrl: './statistic.component.html',
  styleUrls: ['./statistic.component.scss'],
})
export class StatisticComponent {
  teams$: Observable<Team[]>;
  messages$: Observable<ChatMessage[]>;
  constructor(private readonly gameService: GameService) {
    this.teams$ = gameService.gameSettings$.pipe(map((data) => data.teams));
    this.messages$ = this.gameService.messages();
  }
}
