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
  BezierCurveEase,
  Color3,
  Color4,
  DynamicTexture,
  EasingFunction,
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
  VertexBuffer,
  VertexData,
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
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { WebsocketService } from '../websocket/websocket.service';
import { SoundService } from '../sound/sound.service';
import { LoggerService } from '../logger/logger.service';
import { map } from 'rxjs/operators';
import { WoodProceduralTexture } from '@babylonjs/procedural-textures';

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
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
  private info$ = new Subject<{
    id: number;
    type: 'player' | 'cell' | 'empty';
  }>();
  private canvas?: HTMLCanvasElement;
  private engine?: Engine;
  private camera?: ArcRotateCamera;
  private scene?: Scene;
  private light?: Light;
  private readonly windowRef: Window | null;
  private sphere?: Mesh;
  private xSize = 0;
  private zSize = 0;
  private container?: AssetContainer;
  private playerMesh?: Mesh;
  // private ground?: Mesh;
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
  ): Promise<void> {
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
    this.materialsMap.set('grass', greenMat);
    const sandMat = new StandardMaterial('sandMat', this.scene);
    sandMat.diffuseTexture = new Texture(
      '/assets/textures/fabio-hanashiro-vIWHM6xI-dc-unsplash.jpg',
      this.scene
    );
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
        console.log(obj.name, obj.position);
        const easingFunction = new BezierCurveEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        if (obj.name.startsWith('player_')) {
          this.info$.next({ id: +obj?.name.split('_')[1], type: 'player' });
        } else if (obj.parent?.parent?.name?.startsWith('cell_')) {
          this.info$.next({
            id: +obj.parent?.parent?.name.split('_')[1],
            type: 'cell',
          });
        } else {
          return;
        }
        this.soundService.click();
        this.animateCamera(obj);
      }
    }, PointerEventTypes.POINTERTAP);
    this.scene.clearColor = new Color4(0.18, 0.18, 0.18, 1);

    // this.buildGround2();
    this.buildGround();
    // this.container.instantiateModelsToScene(() => 'test');

    this.scene.registerAfterRender(() => {
      // this.sphere?.rotate(new Vector3(0, 1, 0), 0.02, Space.LOCAL);
    });

    // generates the world x-y-z axis for better understanding
    // this.showWorldAxis(8);
    // this.container.load();
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

  private addResources() {}
  private removeResources() {}

  private buildGround() {
    if (!this.scene) throw new Error('scene not define');

    //Resolution is the number of actual grid points that you'll have. width x height. Then add 1 to make it an odd number of grid points.

    for (let col = 0; col < this.xSize; ++col) {
      for (let row = 0; row < this.zSize; ++row) {
        if (this.container) {
          const terrain = this.container.instantiateModelsToScene();
          const terrainRoot = terrain.rootNodes[0];
          const id = row * this.zSize + col;
          terrainRoot.name = 'cell_' + id;
          this.updateCell(this.worldMap$.value[id].res, terrainRoot);

          terrainRoot.scaling = new Vector3(0.25, 0.25, 0.25);
          terrainRoot.position.x =
            this.cellSize * (col - this.xSize / 2 + 1 / 2);
          terrainRoot.position.z =
            this.cellSize * (row - this.zSize / 2 + 1 / 2);
        }
      }
    }

    // console.log(terrainRoot.getScalingVectorToFit());
  }

  private buildGround2() {
    if (this.scene) {
      const groundMat = new GridMaterial('grid', this.scene);
      groundMat.gridRatio = 10;
      groundMat.majorUnitFrequency = 1;
      groundMat.mainColor = new Color3(0.01, 0.3, 0.1);
      // const groundMat = new StandardMaterial('groundMat', this.scene);
      // groundMat.diffuseColor = new Color3(0.01, 0.3, 0.1);

      const ground = MeshBuilder.CreateGround('ground', {
        width: this.xSize * this.cellSize,
        height: this.zSize * this.cellSize,
        subdivisionsX: this.xSize,
        subdivisionsY: this.zSize,
      });
      let base = 0;
      const length =
        (ground?.getIndices()?.length ?? 0) / (this.xSize * this.zSize);
      for (let row = 0; row < this.xSize; ++row) {
        for (let col = 0; col < this.zSize; ++col) {
          ground.subMeshes.push(
            new SubMesh(
              row + col,
              0,
              ground.getTotalVertices(),
              base,
              length,
              ground
            )
          );
          base += length;
        }
      }
      ground.material = groundMat;
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
    // this.camera = new FreeCamera(
    //   'camera1',
    //   new Vector3(5, 10, -20),
    //   this.scene
    // );

    // target the camera to scene origin

    // attach the camera to the canvas
    this.camera.attachControl(this.canvas, true);

    this.light = new HemisphericLight(
      'light',
      new Vector3(0, this.cellSize * 10, 0),
      this.scene
    );
    this.light.intensity = 0.7;
    // this.light = new DirectionalLight(
    //   'light1',
    //   new Vector3(-1, -3, 1),
    //   this.scene
    // );
    // this.light.position = new Vector3(0, 10, 0);
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
    const shape = MeshBuilder.CreatePolyhedron(
      'player_' + player.id,
      {
        type: player.level - 1,
        size: this.cellSize / 4,
      },
      this.scene
    );

    const material = new StandardMaterial(
      'player_' + player.id + '_mat',
      this.scene
    );
    material.diffuseColor = Color3.FromHexString(player.color);
    material.alpha = 0.7;
    shape.material = material;
    return shape;
  }

  private treeFactory(
    sizeBranch: number,
    sizeTrunk: number,
    radius: number,
    trunkMaterial: Material,
    leafMaterial: Material,
    scene: Scene
  ) {
    const treeParent = Mesh.CreatePlane('treeParent', this.cellSize, scene);
    treeParent.isVisible = false;

    const leaves = new Mesh('leaves', scene);

    //const vertexData = BABYLON.VertexData.CreateSphere(2,sizeBranch); //this line for BABYLONJS2.2 or earlier
    const vertexData = VertexData.CreateSphere({
      segments: 2,
      diameter: sizeBranch,
    }); //this line for BABYLONJS2.3 or later

    vertexData.applyToMesh(leaves, false);

    const positions = leaves.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const indices = leaves.getIndices();
    const numberOfPoints = positions.length / 3;

    const map = [];

    // The higher point in the sphere
    // const v3 = Vector3;
    const max = [];

    for (let i = 0; i < numberOfPoints; i++) {
      const p = new Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );

      if (p.y >= sizeBranch / 2) {
        max.push(p);
      }

      let found = false;
      for (let index = 0; index < map.length && !found; index++) {
        const array = map[index];
        const p0 = array[0];
        if (
          p0 instanceof Vector3 &&
          (p0.equals(p) || p0.subtract(p).lengthSquared() < 0.01)
        ) {
          array.push(i * 3);
          found = true;
        }
      }
      if (!found) {
        const array = [];
        array.push(p, i * 3);
        map.push(array);
      }
    }
    const randomNumber = function (min: number, max: number) {
      if (min == max) {
        return min;
      }
      const random = Math.random();
      return random * (max - min) + min;
    };

    map.forEach(function (array) {
      let index;
      const min = -sizeBranch / 10;
      const max = sizeBranch / 10;
      const rx = randomNumber(min, max);
      const ry = randomNumber(min, max);
      const rz = randomNumber(min, max);

      for (index = 1; index < array.length; index++) {
        const i = array[index];
        if (typeof i === 'number') {
          positions[i] += rx;
          positions[i + 1] += ry;
          positions[i + 2] += rz;
        }
      }
    });

    leaves.setVerticesData(VertexBuffer.PositionKind, positions);
    VertexData.ComputeNormals(positions, indices, []);
    leaves.setVerticesData(VertexBuffer.NormalKind, []);
    leaves.convertToFlatShadedMesh();

    leaves.material = leafMaterial;
    leaves.position.y = sizeTrunk + sizeBranch / 2 - 2;

    const trunk = Mesh.CreateCylinder(
      'trunk',
      sizeTrunk,
      radius - 2 < 1 ? 1 : radius - 2,
      radius,
      10,
      2,
      scene
    );

    trunk.position.y = sizeBranch / 2 + 2 - sizeTrunk / 2;

    trunk.material = trunkMaterial;
    trunk.convertToFlatShadedMesh();

    leaves.parent = treeParent;
    trunk.parent = treeParent;
    const mTree = Mesh.MergeMeshes(
      [treeParent, trunk, leaves],
      false,
      true,
      undefined,
      false,
      true
    );

    return mTree;
  }

  private addFood() {
    if (!this.scene) return;
    const leafMaterial = new StandardMaterial('leafMaterial', this.scene);
    leafMaterial.diffuseColor = new Color3(0.5, 1, 0.5);

    const woodMaterial = new StandardMaterial('woodMaterial', this.scene);
    const woodTexture = new WoodProceduralTexture(
      'woodTexture',
      512,
      this.scene
    );
    woodTexture.ampScale = 1;
    woodMaterial.diffuseTexture = woodTexture;
    const tree1 = this.treeFactory(
      15,
      10,
      5,
      woodMaterial,
      leafMaterial,
      this.scene
    );
    if (!tree1) return;
    const tree2 = tree1.createInstance('tree2');
    tree2.position.x = 20;
    const tree3 = tree1.createInstance('tree3');
    tree3.position.x = -20;
  }

  private addPlayer(player: Player) {
    const scenePlayer = this.playerFactory(player);
    this.setPlayerPosition(scenePlayer, player.x, player.y);
    scenePlayer.position.y = 8;
    Animation.CreateAndStartAnimation(
      '' + 'intro',
      scenePlayer,
      'position.y',
      this.frameRate,
      this.frameRate,
      200,
      scenePlayer.position.y,
      2
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
        2
      );
  }

  private updateCell(resources: Record<string, number>, node: TransformNode) {
    const hasRes = !!Object.entries(resources).filter(
      ([key, value]) => key !== 'Nourriture' && value
    ).length;
    const orePosition = new Vector3(
      (Math.random() - 0.5) * this.cellSize * 2,
      0,
      (Math.random() - 0.5) * this.cellSize * 2
    );
    const cristalPosition = new Vector3(
      orePosition.x - 3.5,
      7.17,
      orePosition.z
    );
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
          mesh.position = orePosition;
        } else {
          mesh.visibility = 0;
        }
      } else if (name === 'crystal') {
        if (hasRes && this.scene) {
          mesh.visibility = 1;
          mesh.position = cristalPosition;
          const material = new StandardMaterial('kristal_mat', this.scene);
          material.diffuseColor = this.getColor();
          mesh.material = material;
        } else {
          mesh.visibility = 0;
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
          this.addPlayer(player);
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
          }
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
