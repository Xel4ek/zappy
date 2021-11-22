import { Pipe, PipeTransform } from '@angular/core';
import { Player } from '../../services/game/game.service';

@Pipe({
  name: 'player',
})
export class PlayerPipe implements PipeTransform {
  transform(
    value: { [id: number]: Player } | null,
    teamName: string
  ): Player[] {
    if (value) {
      return Object.values(value).filter((player) => player.team === teamName);
    }
    return [];
  }
}
