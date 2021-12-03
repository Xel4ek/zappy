import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { SettingsService } from '../../services/settings/settings.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'zappy-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent {
  mode$: Observable<'3d' | '2d'>;
  constructor(private readonly settingsService: SettingsService) {
    this.mode$ = this.settingsService
      .settings()
      .pipe(map((settings) => settings.mode));
  }
}
