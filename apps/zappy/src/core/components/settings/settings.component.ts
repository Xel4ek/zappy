import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Cell, GameService, Player } from '../../services/game/game.service';

@Component({
  selector: 'zappy-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  info$: Observable<
    { type: 'player'; data: Player } | { type: 'cell'; data: Cell } | undefined
  >;
  constructor(private readonly gameService: GameService) {
    this.info$ = this.gameService.info();
  }
}
