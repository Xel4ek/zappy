import { Component, OnInit } from '@angular/core';
import { GameService } from '../../services/game/game.service';

@Component({
  selector: 'zappy-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {
  constructor(private readonly gameService: GameService) {}

  ngOnInit(): void {}
}
