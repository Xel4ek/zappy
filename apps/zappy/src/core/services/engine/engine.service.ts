import {
  ElementRef,
  Inject,
  Injectable,
  NgZone,
  OnDestroy,
} from '@angular/core';

import {
  AbstractMesh,
  Animation,
  ArcRotateCamera,
  AssetContainer,
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  HemisphericLight,
  Light,
  Material,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Scene,
  SceneLoader,
  StandardMaterial,
  SubMesh,
  Texture,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials/grid';

import { DOCUMENT } from '@angular/common';

import '@babylonjs/core/Loading/loadingScreen';
import '@babylonjs/loaders/glTF';

import {
  Cell,
  ChatMessage,
  GameSettings,
  Player,
  Team,
} from '../game/game.service';
import {
  BehaviorSubject,
  Observable,
  of,
  pairwise,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { WebsocketService } from '../websocket/websocket.service';
import { SoundService } from '../sound/sound.service';
import { LoggerService } from '../logger/logger.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
  private cashRead = false;
  private readonly resColorMap = [
    new Color3(1, 1, 0),
    new Color3(1, 0, 0.2),
    new Color3(0.8, 0, 0.8),
    new Color3(0.8, 0, 1),
    new Color3(0.4, 0.1, 1),
    new Color3(0.4, 0.8, 1),
    new Color3(0.4, 0.5, 0.4),
    new Color3(0.5, 0.4, 0.8),
    new Color3(0.8, 0, 1),
    new Color3(0, 0.2, 0.5),
  ];
  width = 0;
  private readonly destroy$ = new Subject<void>();
  private readonly cellSize = 10;
  private frameRate = 30;
  private gameSettings$ = new BehaviorSubject<GameSettings>({
    teams: [],
    speed: 0,
  });
  private messages$ = new BehaviorSubject<ChatMessage[]>([]);
  private worldMap$ = new BehaviorSubject<Cell[]>([]);
  private players$ = new BehaviorSubject<{ [index: number]: Player }>({});
  private info$ = new BehaviorSubject<{
    id: number;
    type: 'player' | 'cell' | 'empty';
  }>({ id: -1, type: 'empty' });
  private canvas?: HTMLCanvasElement;
  private engine?: Engine;
  private camera?: ArcRotateCamera;
  private scene?: Scene;
  private light?: Light;
  private readonly windowRef: Window | null;
  private xSize = 0;
  private zSize = 0;
  private container?: AssetContainer;
  private materialsMap = new Map<string, Material>();

  public constructor(
    private ngZone: NgZone,
    @Inject(DOCUMENT) private document: Document,
    private readonly websocketService: WebsocketService,
    private readonly soundService: SoundService,
    private readonly loggerService: LoggerService
  ) {
    this.windowRef = this.document.defaultView;
    this.restApi();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private getColor() {
    return this.resColorMap[
      Math.trunc(Math.random() * this.resColorMap.length)
    ];
  }
  public async createScene(
    canvas: ElementRef<HTMLCanvasElement>,
    size: { x: number; y: number }
  ): Promise<Engine> {
    this.xSize = size.x;
    this.zSize = size.y;
    this.canvas = canvas.nativeElement;
    this.engine = new Engine(this.canvas, true);

    this.engine.setHardwareScalingLevel(
      1 / (this.windowRef?.devicePixelRatio ?? 1)
    );
    // this.resize();
    this.scene = new Scene(this.engine);
    this.setupCamera();
    const greenMat = new StandardMaterial('greenMat', this.scene);
    greenMat.diffuseTexture = new Texture(
      '/assets/textures/green_grass.jpg',
      this.scene
    );
    greenMat.alpha = 0.5;
    greenMat.freeze();
    this.materialsMap.set('grass', greenMat);
    const sandMat = new StandardMaterial('sandMat', this.scene);
    sandMat.diffuseTexture = new Texture(
      '/assets/textures/imgonline-com-ua-CompressBySize-LvTTyCbHgRsxt.jpg',
      this.scene
    );
    sandMat.freeze();
    this.materialsMap.set('sand', sandMat);
    this.container = await SceneLoader.LoadAssetContainerAsync(
      '/assets/blender/',
      'terrain.glb',
      this.scene
    );
    // this.terrainMaterial = new NodeMaterial('terrainMaterial', this.scene, {
    //   emitComments: true,
    // });
    // console.log(this.terrainMaterial);
    // this.container = new AssetsManager(this.scene);
    // const taskKeeper = this.container.addMeshTask(
    //   'load test',
    //   '',
    //   '/assets/mesh/monster/scenes/',
    //   'Rabbit.babylon'
    // );
    // taskKeeper.onSuccess = (task: MeshAssetTask) => {
    //   task.loadedMeshes[0].setEnabled(false);
    //   this.playerMesh = task.loadedMeshes[0] as Mesh;
    //   // task.loadedMeshes[0].position = Vector3.Zero();
    //   console.log(task.loadedMeshes[0]);
    // };
    // taskKeeper.onError = (err: any) => {
    //   console.log(err);
    // };
    this.scene.onPointerObservable.add((eventData) => {
      if (eventData.pickInfo?.hit && this.camera) {
        const obj = eventData.pickInfo.pickedMesh;
        if (!obj) return;
        // console.log(obj.name, obj.position);
        if (obj.name.startsWith('player_')) {
          return this.info$.next({
            id: +obj?.name.split('_')[1],
            type: 'player',
          });
        }
        if (obj.parent?.parent?.name?.startsWith('cell_')) {
          return this.info$.next({
            id: +obj.parent?.parent?.name.split('_')[1],
            type: 'cell',
          });
        }
        return this.info$.next({
          id: -1,
          type: 'empty',
        });
      }
    }, PointerEventTypes.POINTERTAP);
    this.scene.clearColor = new Color4(0.68, 0.68, 0.68, 1);

    // this.buildGround2();
    this.buildGround();
    // this.container.instantiateModelsToScene(() => 'test');

    this.scene.registerAfterRender(() => {
      // this.sphere?.rotate(new Vector3(0, 1, 0), 0.02, Space.LOCAL);
    });

    // generates the world x-y-z axis for better understanding
    // this.showWorldAxis(8);
    // this.container.load();
    return this.engine;
  }

  public animate(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this.ngZone.runOutsideAngular(() => {
      const rendererLoopCallback = () => {
        this.scene?.render();
      };

      if (this.document.readyState !== 'loading') {
        this.engine?.runRenderLoop(rendererLoopCallback);
      } else {
        this.windowRef?.addEventListener('DOMContentLoaded', () => {
          this.engine?.runRenderLoop(rendererLoopCallback);
        });
      }

      this.windowRef?.addEventListener('resize', () => {
        this.engine?.resize();
      });
    });
  }

  /**
   * creates the world axes
   *
   * Source: https://doc.babylonjs.com/snippets/world_axes
   *
   * @param size number
   */
  public showWorldAxis(size: number): void {
    const makeTextPlane = (text: string, color: string, textSize: number) => {
      const dynamicTexture = new DynamicTexture(
        'DynamicTexture',
        50,
        this.scene,
        true
      );
      dynamicTexture.hasAlpha = true;
      dynamicTexture.drawText(
        text,
        5,
        40,
        'bold 36px Arial',
        color,
        'transparent',
        true
      );
      if (this.scene) {
        const plane = Mesh.CreatePlane('TextPlane', textSize, this.scene, true);
        const material = new StandardMaterial('TextPlaneMaterial', this.scene);
        material.backFaceCulling = false;
        material.specularColor = new Color3(0, 0, 0);
        material.diffuseTexture = dynamicTexture;
        plane.material = material;

        return plane;
      }
      throw new Error('Scene not define');
    };

    const axisX = Mesh.CreateLines(
      'axisX',
      [
        Vector3.Zero(),
        new Vector3(size, 0, 0),
        new Vector3(size * 0.95, 0.05 * size, 0),
        new Vector3(size, 0, 0),
        new Vector3(size * 0.95, -0.05 * size, 0),
      ],
      this.scene
    );

    axisX.color = new Color3(1, 0, 0);
    const xChar = makeTextPlane('X', 'red', size / 10);
    xChar.position = new Vector3(0.9 * size, -0.05 * size, 0);

    const axisY = Mesh.CreateLines(
      'axisY',
      [
        Vector3.Zero(),
        new Vector3(0, size, 0),
        new Vector3(-0.05 * size, size * 0.95, 0),
        new Vector3(0, size, 0),
        new Vector3(0.05 * size, size * 0.95, 0),
      ],
      this.scene
    );

    axisY.color = new Color3(0, 1, 0);
    const yChar = makeTextPlane('Y', 'green', size / 10);
    yChar.position = new Vector3(0, 0.9 * size, -0.05 * size);

    const axisZ = Mesh.CreateLines(
      'axisZ',
      [
        Vector3.Zero(),
        new Vector3(0, 0, size),
        new Vector3(0, -0.05 * size, size * 0.95),
        new Vector3(0, 0, size),
        new Vector3(0, 0.05 * size, size * 0.95),
      ],
      this.scene
    );

    axisZ.color = new Color3(0, 0, 1);
    const zChar = makeTextPlane('Z', 'blue', size / 10);
    zChar.position = new Vector3(0, 0.05 * size, 0.9 * size);
  }

  settings(): Observable<GameSettings> {
    return this.gameSettings$.asObservable();
  }

  worldMap() {
    return this.worldMap$.asObservable();
  }

  players() {
    return this.players$.asObservable();
  }

  messages() {
    return this.messages$.asObservable();
  }

  info(): Observable<
    { type: 'player'; data: Player } | { type: 'cell'; data: Cell } | undefined
  > {
    return this.info$.pipe(
      pairwise(),
      map(([oldValue, newValue]) => {
        if (oldValue.type === 'cell') {
          this.selectCell(oldValue.id, false);
        }
        if (newValue.type === 'cell') {
          this.selectCell(newValue.id, true);
        }
        return newValue;
      }),
      switchMap(({ id, type }) => {
        if (type === 'cell')
          return this.worldMap$.asObservable().pipe(
            map((data) => data.find((item) => item.id === id)),
            map((data) => {
              if (data) return { type, data };
              return void 0;
            })
          );
        if (type === 'player')
          return this.players$.asObservable().pipe(
            map((data) => data[id]),
            map((data) => {
              if (data) return { type, data };
              return void 0;
            })
          );
        return of(undefined);
      }),
      tap((infoData) => {
        if (infoData) {
          const { data, type } = infoData;
          const obj = this.scene?.getMeshByName(type + '_' + data.id);
          if (obj) {
            this.soundService.click();
            this.animateCamera(obj);
          }
        }
      })
    );
  }

  setInfo(id: number, type: 'player' | 'cell' | 'empty') {
    this.info$.next({ id, type });
  }

  increaseSpeed() {
    this.websocketService.send('sst', this.gameSettings$.value.speed * 2);
  }

  decreaseSpeed() {
    this.websocketService.send('sst', this.gameSettings$.value.speed * 0.5);
  }

  private selectCell(id: number, active: boolean) {
    const mesh = this.scene
      ?.getMeshByName('cell_' + id)
      ?.getChildMeshes()
      .find((mesh) => mesh.name.slice(9) === 'border');
    if (mesh && this.scene) {
      const material = new StandardMaterial('border_mat', this.scene);
      material.diffuseColor = active
        ? new Color3(0, 1, 0)
        : new Color3(0, 0, 0);
      mesh.material = material;
    }
  }
  private buildGround() {
    if (!this.scene) throw new Error('scene not define');
    Object.values(this.players$.value).map((player) => this.addPlayer(player));
    this.cashRead = true;
    for (let col = 0; col < this.xSize; ++col) {
      for (let row = 0; row < this.zSize; ++row) {
        if (this.container) {
          const terrain = this.container.instantiateModelsToScene();
          const terrainRoot = terrain.rootNodes[0];

          const id = row * this.zSize + col;
          terrainRoot.name = 'cell_' + id;
          terrainRoot.scaling = new Vector3(0.25, 0.25, 0.25);
          this.updateCell(this.worldMap$.value[id].res, terrainRoot);
          terrainRoot.position.x =
            this.cellSize * (col - this.xSize / 2 + 1 / 2);
          terrainRoot.position.z =
            this.cellSize * (row - this.zSize / 2 + 1 / 2);
        }
      }
    }
  }

  private setupCamera() {
    if (!this.scene) return;
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.5,
      this.cellSize * Math.max(this.xSize, this.zSize) * 0.7,
      Vector3.Zero(),
      this.scene
    );
    this.camera.lockedTarget = new TransformNode('root');
    this.camera.attachControl(this.canvas, true);

    this.light = new HemisphericLight(
      'light',
      new Vector3(0, this.cellSize * 10, 0),
      this.scene
    );
    this.light.intensity = 0.7;
    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.lowerRadiusLimit = this.cellSize * 2;
    this.camera.upperRadiusLimit =
      Math.max(this.xSize, this.zSize) * 1.5 * this.cellSize;
  }

  private setPlayerPosition(
    player: AbstractMesh,
    x: number,
    y: number,
    xOffset: number = 0,
    yOffset: number = 0
  ) {
    player.position.x = this.cellSize * (x - this.xSize / 2 + 1 / 2);
    player.position.z = this.cellSize * (y - this.zSize / 2 + 1 / 2);
  }

  private playerFactory(player: { id: number; level: number; color: string }) {
    if (!this.scene || !this.light) throw new Error('Scene undefined');
    let shape: Mesh;
    if (player.level < 6) {
      shape = MeshBuilder.CreatePolyhedron(
        'player_' + player.id,
        {
          type: player.level - 1,
          size: this.cellSize / 4,
        },
        this.scene
      );
    } else {
      shape = MeshBuilder.CreateSphere(
        'player_' + player.id,
        {
          diameter: this.cellSize / 4,
        },
        this.scene
      );
    }
    const material = new StandardMaterial(
      'player_' + player.id + '_mat',
      this.scene
    );
    material.diffuseColor = Color3.FromHexString(player.color);
    material.alpha = 0.7;
    shape.material = material;
    return shape;
  }

  private addPlayer(player: Player) {
    if (!this.scene) return;
    const scenePlayer = this.playerFactory(player);
    this.setPlayerPosition(scenePlayer, player.x, player.y);
    scenePlayer.position.y = 8;
    Animation.CreateAndStartAnimation(
      '' + 'intro',
      scenePlayer,
      'scaling',
      this.frameRate,
      this.frameRate,
      new Vector3(0, 0, 0),
      scenePlayer.scaling,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    const rotate = Array.from(
      { length: 3 },
      () => 0.03 * (Math.random() - 0.5)
    );
    this.scene?.registerBeforeRender(() => {
      scenePlayer.rotation.y += rotate[0];
      scenePlayer.rotation.x += rotate[1];
      scenePlayer.rotation.z += rotate[2];
    });
  }

  private movePlayer(player: Pick<Player, 'id' | 'direction' | 'x' | 'y'>) {
    if (!this.scene) return;
    const scenePlayer = this.scene.getMeshByName('player_' + player.id);
    if (!scenePlayer) return;
    const oldPosition = new Vector3(
      scenePlayer.position.x,
      scenePlayer.position.y,
      scenePlayer.position.z
    );
    this.setPlayerPosition(scenePlayer, player.x, player.y);
    if (
      Math.abs(oldPosition.x - scenePlayer.position.x) +
        Math.abs(oldPosition.z - scenePlayer.position.z) ===
      this.cellSize
    )
      Animation.CreateAndStartAnimation(
        'playerAnimation',
        scenePlayer,
        'position',
        this.frameRate,
        (this.frameRate * 7) / (this.gameSettings$?.value.speed ?? 1),
        oldPosition,
        scenePlayer.position,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
  }
  removePlayer(player: Pick<Player, 'id'>) {
    if (!this.scene) return;
    const scenePlayer = this.scene.getMeshByName('player_' + player.id);
    if (!scenePlayer) return;
    Animation.CreateAndStartAnimation(
      'removePlayerAnimation',
      scenePlayer,
      'scaling',
      this.frameRate,
      (this.frameRate * 5) / (this.gameSettings$?.value.speed ?? 1),
      scenePlayer.scaling,
      new Vector3(0, 0, 0),
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      () => scenePlayer.dispose()
    );
  }
  startCastPlayer(player: Pick<Player, 'id'>) {
    this.loggerService.addMessage('Player ' + player.id + ' start cast!');
    if (!this.scene) return;
    const scenePlayer = this.scene.getMeshByName('player_' + player.id);
    if (scenePlayer) {
      Animation.CreateAndStartAnimation(
        'castPlayerAnimation',
        scenePlayer,
        'scaling',
        this.frameRate,
        (this.frameRate * 7) / (this.gameSettings$?.value.speed ?? 1),
        scenePlayer.scaling,
        new Vector3(0.3, 0.3, 0.3),
        Animation.ANIMATIONLOOPMODE_CYCLE,
        undefined,
        () => scenePlayer.dispose()
      );
    }
  }
  stopCastPlayer(player: Pick<Player, 'id'>, result: boolean) {
    this.loggerService.addMessage(
      'Player ' +
        player.id +
        ' finish cast with ' +
        (result ? 'success' : 'fail')
    );
  }
  private updateCell(resources: Record<string, number>, node: TransformNode) {
    const hasRes = !!Object.entries(resources).filter(
      ([key, value]) => key !== 'Nourriture' && value
    ).length;
    node.getChildMeshes().map((mesh) => {
      const name = mesh.name.slice(9);

      if (name === 'top') {
        if (resources['Nourriture']) {
          mesh.material = this.materialsMap.get('grass') ?? null;
        } else {
          mesh.material = this.materialsMap.get('sand') ?? null;
        }
      } else if (name === 'ore') {
        if (hasRes) {
          mesh.visibility = 1;
        } else {
          mesh.visibility = 0;
        }
      } else if (name === 'crystal') {
        if (hasRes && this.scene) {
          mesh.visibility = 1;
          const material = new StandardMaterial('kristal_mat', this.scene);
          material.diffuseColor = this.getColor();
          material.alpha = 0.7;
          material.freeze();
          mesh.material = material;
        } else {
          mesh.visibility = 0;
        }
      } else if (name === 'border') {
        if (!(mesh.material as StandardMaterial).diffuseColor && this.scene) {
          const material = new StandardMaterial('border_mat', this.scene);
          material.diffuseColor = new Color3(0, 0, 0);
          material.freeze();
          mesh.material = material;
        }
      }
    });
  }
  private restApi() {
    this.websocketService
      .on('msz')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const { x: sizeX, y: sizeY } = <{ x: number; y: number }>data;
          this.width = sizeX;
          const settings = this.gameSettings$.value;
          settings.sizeX = sizeX;
          settings.sizeY = sizeY;
          this.gameSettings$.next(settings);
          this.worldMap$.next(
            Array.from({ length: sizeX * sizeY }, (_, index) => ({
              id: index,
              res: {},
              players: [],
            }))
          );
        })
      )
      .subscribe();

    this.websocketService
      .on('bct')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const worldMap = this.worldMap$.value;
          const { x, y, resources } = <any>data;
          const index = x + y * this.width;
          worldMap[index].res = resources;
          this.worldMap$.next([...worldMap]);
          const node = this.scene?.getNodeByName(
            'cell_' + index
          ) as TransformNode;
          if (node) this.updateCell(resources, node);
        })
      )
      .subscribe();

    this.websocketService
      .on<Team>('tna')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const settings = this.gameSettings$.value;
          settings.teams?.push(data);
          this.gameSettings$.next(settings);
          this.loggerService.addMessage('Team: "' + data.name + '" join game');
        })
      )
      .subscribe();

    this.websocketService
      .on<Player>('pnw')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const player = data;
          const { x, y } = data;
          player.color =
            '#' +
              this.gameSettings$.value.teams.find(
                (team) => team.name === player.team
              )?.color ?? '#00000';
          player.inventory = {};
          const worldMap = this.worldMap$.value;
          worldMap[x + y * this.width].players.push(player);
          const players = this.players$.value;
          players[player.id] = player;
          this.players$.next({ ...players });
          this.worldMap$.next([...worldMap]);
          this.loggerService.addMessage(
            'Player: "' + player.id + '" join ' + player.team + ' team'
          );
          if (this.cashRead) this.addPlayer(player);
        })
      )
      .subscribe();

    this.websocketService
      .on<Pick<Player, 'id' | 'direction' | 'x' | 'y'>>('ppo')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          this.movePlayer(data);
          const { x, y, id, direction } = data;
          const worldMap = this.worldMap$.value;
          const cellIndex = worldMap.findIndex((cell) =>
            cell.players.find((pl) => pl.id === id)
          );
          if (cellIndex !== -1) {
            let cellPlayers = worldMap[cellIndex].players;
            const pIndex = cellPlayers.findIndex((pl) => pl.id === id);
            const player = cellPlayers[pIndex];
            cellPlayers = cellPlayers.filter((pl) => pl.id !== id);
            const players = this.players$.value;
            worldMap[cellIndex].players = cellPlayers;
            if (player) {
              player.direction = direction;
              worldMap[x + y * this.width].players.push(player);
              players[player.id] = { ...players[player.id], ...data };
            }
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
          }
        })
      )
      .subscribe();

    this.websocketService
      .on<{ id: number; level: number }>('plv')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const worldMap = this.worldMap$.value;
          const players = this.players$.value;
          const player = worldMap
            .find((cell) => cell.players.find((pl) => pl.id === data.id))
            ?.players.find((pl) => pl.id === data.id);
          if (player) {
            player.level = data.level;
            players[player.id].level = data.level;
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
            this.removePlayer(player);
            this.addPlayer(player);
          }
        })
      )
      .subscribe();

    this.websocketService
      .on<Player>('pin')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const worldMap = this.worldMap$.value;
          const players = this.players$.value;
          const player = worldMap
            .find((cell) => cell.players.find((pl) => pl.id === data.id))
            ?.players.find((pl) => pl.id === data.id);
          if (player) {
            player.inventory = data.inventory;
            players[player.id].inventory = data.inventory;
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
          }
        })
      )
      .subscribe();
    this.websocketService
      .on<ChatMessage>('pbc')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const messages = this.messages$.value;
          const players = this.players$.value;
          const message = {
            team: players[data.id].team,
            color: players[data.id].color,
            id: data.id,
            text: data.text,
            timestamp: data.timestamp,
          };
          this.soundService.message();
          this.messages$.next([...messages, message]);
        })
      )
      .subscribe();
    this.websocketService
      .on<{ speed: number }>('sgt')
      .pipe(
        takeUntil(this.destroy$),
        tap((speed) => {
          this.gameSettings$.next({ ...this.gameSettings$.value, ...speed });
        })
      )
      .subscribe();
    this.websocketService
      .on<{ id: number }>('pdi')
      .pipe(
        takeUntil(this.destroy$),
        tap(({ id }) => {
          const worldMap = this.worldMap$.value;
          const cellIndex = worldMap.findIndex((cell) =>
            cell.players.find((pl) => pl.id === id)
          );
          if (cellIndex !== -1) {
            let cellPlayers = worldMap[cellIndex].players;
            cellPlayers = cellPlayers.filter((pl) => pl.id !== id);
            const players = this.players$.value;
            worldMap[cellIndex].players = cellPlayers;
            this.loggerService.addMessage(
              'Player ' + id + ' from ' + players[+id].team + ' dead'
            );
            delete players[+id];
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
            this.removePlayer({ id });
          }
        })
      )
      .subscribe();
    this.websocketService
      .on<{ ids: number[] }>('pic')
      .pipe(
        takeUntil(this.destroy$),
        tap(({ ids }) => {
          ids.map((id) => {
            this.startCastPlayer({ id });
          });
        })
      )
      .subscribe();

    this.websocketService
      .on<{ x: number; y: number; result: boolean }>('pie')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          Object.values(this.players$.value)
            .filter((pl) => pl.x === data.x && pl.y === data.y)
            .map((pl) => this.stopCastPlayer(pl, data.result));
        })
      )
      .subscribe();
  }

  private animateCamera(newTarget: AbstractMesh) {
    if (!this.camera) throw new Error('camera not define');
    const position = this.camera.lockedTarget.position.clone();
    this.camera.setTarget(newTarget.getAbsolutePosition(), true);
    Animation.CreateAndStartAnimation(
      'anim',
      this.camera.lockedTarget,
      'position',
      this.frameRate,
      this.frameRate / 2,
      position,
      newTarget.getAbsolutePosition(),
      2
    );
  }
}
