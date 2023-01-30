import {
	Engine,
	Scene,
	MeshBuilder,
	Vector3,
	ArcRotateCamera,
	CubeTexture,
	Tools,
	StandardMaterial,
	Texture,
	Color3,
	DirectionalLight,
	SceneLoader,
	NodeMaterial,
	ShadowGenerator
} from 'babylonjs';
import 'babylonjs-loaders';

export class Babylon {
	scene: Scene;
	engine: Engine;
	dirLight: DirectionalLight;
	textures: Texture[] = [];
	bottle: any = {};
	table: any = {};
	sodaMats: any = {};
	bottleTex: any = {};
	liquidTex: any = {};
	bottleParameters: any = {};
	liquidParameters: any = {};
	shadows: any = {};

	constructor(public canvas: HTMLCanvasElement) {
		this.engine = new Engine(canvas, true);
		window.addEventListener('resize', () => {
			this.engine.resize();
		});
		this.scene = new Scene(this.engine);
		this.dirLight = new DirectionalLight('dirLight', new Vector3(0.6, -0.7, 0.63), this.scene);
		this.createScene();
	}

	private async createScene(): Promise<void> {
		this.setupCamera();
		this.setupLighting();
		this.setupSkyBox();
		this.setupLightsDirection();
		await this.loadMeshes();
		await this.loadTexturesAsync();
		await this.createMaterials();
		this.generateShadows();
	}
	private setupCamera() {
		const camera = new ArcRotateCamera(
			'camera',
			Tools.ToRadians(0),
			Tools.ToRadians(70),
			0.5,
			new Vector3(0.0, 0.1, 0.0),
			this.scene
		);
		camera.minZ = 0.01;
		camera.wheelDeltaPercentage = 0.01;
		camera.upperRadiusLimit = 0.5;
		camera.lowerRadiusLimit = 0.25;
		camera.upperBetaLimit = 1.575;
		camera.lowerBetaLimit = 0;
		camera.panningAxis = new Vector3(0, 0, 0);
		camera.attachControl(this.canvas, true);
	}

	private setupLighting() {
		const light = CubeTexture.CreateFromPrefilteredData(
			'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/env/hamburg_hbf.env',
			this.scene
		);
		light.name = 'hamburg_hbf';
		light.gammaSpace = false;
		light.rotationY = Tools.ToRadians(0);
		this.scene.environmentTexture = light;
	}

	private setupSkyBox() {
		const skybox = MeshBuilder.CreateBox('skyBox', { size: 1000.0 }, this.scene);
		const skyboxMaterial = new StandardMaterial('skyBox', this.scene);
		skyboxMaterial.backFaceCulling = false;
		skyboxMaterial.reflectionTexture = new CubeTexture(
			'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/skybox/hamburg',
			this.scene
		);
		skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
		skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
		skyboxMaterial.specularColor = new Color3(0, 0, 0);
		skybox.material = skyboxMaterial;
	}

	private setupLightsDirection() {
		this.dirLight.position = new Vector3(-0.05, 0.35, -0.05);
		this.dirLight.shadowMaxZ = 0.45;
		this.dirLight.intensity = 10;
	}

	private async loadMeshes() {
		this.bottle.file = await SceneLoader.AppendAsync(
			'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaBottle.gltf'
		);
		this.bottle.glass = this.scene.getMeshByName('sodaBottle_low');
		this.bottle.liquid = this.scene.getMeshByName('soda_low');
		if (this.bottle.glass === null || this.bottle.liquid === null) return;
		this.bottle.root = this.bottle.glass.parent;
		this.bottle.glass.alphaIndex = 2;
		this.bottle.liquid.alphaIndex = 1;
		this.bottle.glassLabels = this.bottle.glass.clone('glassLabels');
		if (this.bottle.glassLabels === null || this.bottle.root === null) return;
		this.bottle.glassLabels.alphaIndex = 0;
		this.table.file = await SceneLoader.AppendAsync(
			'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/table.gltf'
		);
		this.table.mesh = this.scene.getMeshByName('table_low');
		this.bottle.root.position = new Vector3(-0.09, 0.0, -0.09);
		this.bottle.root.rotation = new Vector3(0.0, 4.0, 0.0);
		this.dirLight.includedOnlyMeshes.push(this.table.mesh);
	}

	private async loadTexturesAsync() {
		return new Promise((resolve) => {
			const textureUrls = [
				'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaBottleMat_thickness.png',
				'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaMat_thickness.png',
				'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaBottleMat_translucency.png'
			];

			for (const url of textureUrls) {
				this.textures.push(new Texture(url, this.scene, false, false));
			}

			this.whenAllReady(this.textures, () => resolve(this.textures));
		}).then(() => {
			this.assignTextures(this.textures);
		});
	}

	// test if a texture is loaded
	private whenAllReady(textures: Texture[], resolve: () => void) {
		let numRemaining = textures.length;
		if (numRemaining == 0) {
			resolve();
			return;
		}

		for (let i = 0; i < textures.length; i++) {
			const texture = textures[i];
			if (texture.isReady()) {
				if (--numRemaining === 0) {
					resolve();
					return;
				}
			} else {
				const onLoadObservable = texture.onLoadObservable;
				if (onLoadObservable) {
					onLoadObservable.addOnce(() => {
						if (--numRemaining === 0) {
							resolve();
						}
					});
				}
			}
		}
	}

	private retrieveTexture(meshMat: string, channel: string, textures: Texture[]) {
		let texture;
		for (const file of textures) {
			const segment = file.name.split('/');
			if (segment[segment.length - 1].split('_')[0] === meshMat) {
				if (segment[segment.length - 1].split('_')[1] === channel + '.png') {
					texture = file;
					return texture;
				}
			}
		}
	}

	private assignTextures(textures: Texture[]) {
		this.bottleTex.baseColor = this.bottle.glass.material.albedoTexture;
		this.bottleTex.orm = this.bottle.glass.material.metallicTexture;
		this.bottleTex.normal = this.bottle.glass.material.bumpTexture;
		this.bottleTex.thickness = this.retrieveTexture('sodaBottleMat', 'thickness', textures);
		this.bottleTex.translucency = this.retrieveTexture('sodaBottleMat', 'translucency', textures);
		this.liquidTex.baseColor = this.bottle.liquid.material.albedoTexture;
		this.liquidTex.orm = this.bottle.liquid.material.metallicTexture;
		this.liquidTex.normal = this.bottle.liquid.material.bumpTexture;
		this.liquidTex.thickness = this.retrieveTexture('sodaMat', 'thickness', textures);

		this.bottle.glass.material.dispose();
		this.bottle.liquid.material.dispose();
	}

	private async createMaterials() {
		NodeMaterial.IgnoreTexturesAtLoadTime = true;

		this.sodaMats.bottle = new NodeMaterial('sodaBottleMat', this.scene, { emitComments: false });
		await this.sodaMats.bottle.loadAsync(
			'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/shaders/glassShader.json'
		);
		this.sodaMats.bottle.build(false);

		this.sodaMats.liquid = new NodeMaterial('sodaMat', this.scene, { emitComments: false });
		await this.sodaMats.liquid.loadAsync(
			'https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/shaders/sodaShader.json'
		);
		this.sodaMats.liquid.build(false);

		this.sodaMats.glassLabels = this.sodaMats.bottle.clone('glassLabelsMat');

		// get shader parameters
		this.bottleParameters.baseColor = this.sodaMats.bottle.getBlockByName('baseColorTex');
		this.bottleParameters.orm = this.sodaMats.bottle.getBlockByName('orm');
		this.bottleParameters.normal = this.sodaMats.bottle.getBlockByName('normalTex');
		this.bottleParameters.thickness = this.sodaMats.bottle.getBlockByName('thicknessTex');
		this.bottleParameters.maxThickness = this.sodaMats.bottle.getBlockByName('maxThickness');
		this.bottleParameters.glassTint = this.sodaMats.bottle.getBlockByName('glassTint');
		this.bottleParameters.fresnelColor = this.sodaMats.bottle.getBlockByName('fresnelColor');
		this.bottleParameters.translucency = this.sodaMats.bottle.getBlockByName('refractionInt');
		this.bottleParameters.glassAlphaSwitch = this.sodaMats.bottle.getBlockByName('alphaSwitch');
		this.bottleParameters.pbr = this.sodaMats.bottle.getBlockByName('PBRMetallicRoughness');

		this.bottleParameters.labelBaseColor = this.sodaMats.glassLabels.getBlockByName('baseColorTex');
		this.bottleParameters.labelOrm = this.sodaMats.glassLabels.getBlockByName('orm');
		this.bottleParameters.labelNormal = this.sodaMats.glassLabels.getBlockByName('normalTex');
		this.bottleParameters.labelThickness = this.sodaMats.glassLabels.getBlockByName('thicknessTex');
		this.bottleParameters.labelMaxThickness =
			this.sodaMats.glassLabels.getBlockByName('maxThickness');
		this.bottleParameters.labelGlassTint = this.sodaMats.glassLabels.getBlockByName('glassTint');
		this.bottleParameters.labelFresnelColor =
			this.sodaMats.glassLabels.getBlockByName('fresnelColor');
		this.bottleParameters.labelTranslucency =
			this.sodaMats.glassLabels.getBlockByName('refractionInt');
		this.bottleParameters.labelGlassAlphaSwitch =
			this.sodaMats.glassLabels.getBlockByName('alphaSwitch');
		this.bottleParameters.labelPbr =
			this.sodaMats.glassLabels.getBlockByName('PBRMetallicRoughness');

		this.liquidParameters.maxThickness = this.sodaMats.liquid.getBlockByName('maxThickness');

		// set up glass rendering parameters
		this.sodaMats.bottle.getAlphaTestTexture = () => this.bottleTex.baseColor;
		this.sodaMats.liquid.getAlphaTestTexture = () => this.liquidTex.baseColor;
		this.sodaMats.bottle.needDepthPrePass = true;
		this.sodaMats.bottle.backFaceCulling = false;
		this.sodaMats.glassLabels.forceDepthWrite = true;

		// assign textures and baseline shader parameters
		this.bottle.glass.material = this.sodaMats.bottle;
		this.bottle.glassLabels.material = this.sodaMats.glassLabels;
		this.bottleParameters.baseColor.texture = this.bottleParameters.labelBaseColor.texture =
			this.bottleTex.baseColor;
		this.bottleParameters.orm.texture = this.bottleParameters.labelOrm.texture = this.bottleTex.orm;
		this.bottleParameters.normal.texture = this.bottleParameters.labelNormal.texture =
			this.bottleTex.normal;
		this.bottleParameters.thickness.texture = this.bottleParameters.labelThickness.texture =
			this.bottleTex.thickness;
		this.bottleParameters.translucency.texture = this.bottleParameters.labelTranslucency.texture =
			this.bottleTex.translucency;
		this.bottleParameters.pbr.alphaTestCutoff = 0.0;
		this.bottleParameters.labelPbr.alphaTestCutoff = 0.999;
		this.bottleParameters.glassAlphaSwitch.value = 0.0;
		this.bottleParameters.labelGlassAlphaSwitch.value = 1.0;
		this.bottleParameters.maxThickness.value = this.bottleParameters.labelMaxThickness.value = 5.0;
		this.bottleParameters.glassTint.value = this.bottleParameters.labelGlassTint.value =
			Color3.FromHexString('#aaaaaa');

		// set up baseline shader parameters for liquid material
		this.bottle.liquid.material = this.sodaMats.liquid;
		this.liquidParameters.maxThickness.value = 1.5;
	}

	private generateShadows() {
		this.shadows.shadowGenerator = new ShadowGenerator(1024, this.dirLight);
		this.shadows.shadowGenerator.useBlurExponentialShadowMap = true;
		this.shadows.shadowGenerator.blurBoxOffset = 2;
		this.shadows.shadowGenerator.depthScale = 0;

		this.shadows.shadowGenerator.addShadowCaster(this.bottle.glass);
		this.shadows.shadowGenerator.addShadowCaster(this.bottle.liquid);

		this.shadows.shadowGenerator.enableSoftTransparentShadow = true;
		this.shadows.shadowGenerator.transparencyShadow = true;

		this.table.mesh.receiveShadows = true;
		this.table.mesh.material.environmentIntensity = 0.2;
	}

	run(): void {
		// chrome audio warning fix
		this.engine.getAudioContext()?.resume();
		this.engine.runRenderLoop(() => {
			this.scene.render();
		});
	}
}
