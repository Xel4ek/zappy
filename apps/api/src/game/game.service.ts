import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { GameServerClient } from './game.server';

@Injectable()
export class GameService {
  private store: WebSocket;
  private gameOptions;

  /**
   *
   msz X Y	msz	Размер карты
   bct X Y q q q q q q q	bct X Y	Координаты и список ресурсов клетки карты
   bct X Y q q q q q q q *

   nbr_cases

   mct	Координаты и список ресурсов каждой непустой клетки карты
   tna N * nbr_equipes	tna	Названия команд (team)
   pnw #n X Y O L N	-	Подключение нового игрока
   ppo #n X Y O	ppo #n	Позиция и направление игрока
   plv #n L	plv #n	Уровень игрока
   pin #n X Y q q q q q q q	pin #n	Инвентарь игрока
   pex #n	-	Игрок изгоняет всех с клетки
   pbc #n M	-	Игрок произносит сообщение
   pic X Y L #n #n ...	-	Первый (из списка) игрок произносит заклинание, в котором участвуют он и все следующие в списке игроки
   pie X Y R	-	Конец выполнения заклинания
   pfk #n	-	Игрок откладывает яйцо
   pdr #n i	-	Игрок выбрасывает ресурс
   pgt #n i	-	Игрок подбирает ресурс
   pdi #n	-	Игрок умирает от голода
   enw #e #n X Y	-	Яйцо было отложено игроком на квадрате X Y
   eht #e	-	Событие вылупления из яйца
   ebo #e	-	Один игрок подключился к яйцу (????)
   edi #e	-	Яйцо умерло от голода
   sgt T	sgt	Запрос единицы времени на сервере
   sgt T	sst T	Изменение единицы времени на сервере
   seg N	-	Конец игры. Номер команды - победителя
   smg M	-	Сообщение сервера
   suc	-	Неизвестная команда
   sbp	-	Неверные параметры запроса
   * @private
   */
  private static readonly resources = [
    'Nourriture',
    'Linemate',
    'Deraumere',
    'Sibur',
    'Mendiane',
    'Phiras',
    'Thystame',
  ];
  private static resourcesZip(arrayData) {
    return arrayData.reduce((acc, cur, i) => {
      if (+cur) {
        acc[GameService.resources[i]] = +cur;
      }
      return acc;
    }, {});
  }
  private static readonly eventMap = new Map([
    ['msz', (data) => ({ x: +data[0], y: +data[1] })],
    [
      'bct',
      (data) => ({
        x: +data[0],
        y: +data[1],
        resources: GameService.resourcesZip(data.slice(2)),
      }),
    ],
  ]);
  constructor(
    @Inject('GAME_SERVICE') private client: GameServerClient,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async connect() {
    this.client.addEmitter(this.eventEmitter);
    return this.client.connect();
  }

  addClients(client: WebSocket) {
    this.store = client;
  }

  @OnEvent('gameSeverMessage')
  handleGameSeverMessage(data) {
    console.log(data);
    // return { event: 'test', data };

    if (data === 'BIENVENUE') {
      this.client.emit('gameServer', 'GRAPHIC');
    } else {
      data = data.split(' ');
      const callback = GameService.eventMap.get(data[0]);
      if (callback) {
        this.store.send(
          JSON.stringify({ event: data[0], data: callback(data.slice(1)) })
        );
      }
    }
    // if (this.store) {
    //   this.store.send(JSON.stringify({ event: 'test', data }));
    // }
  }
  disconnect() {
    this.client.close();
  }
}
