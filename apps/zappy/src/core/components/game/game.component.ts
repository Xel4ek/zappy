import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'zappy-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent {}
