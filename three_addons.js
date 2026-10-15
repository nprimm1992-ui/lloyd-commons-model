( function () {

	/**
 * Full-screen textured quad shader
 */

	const CopyShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'opacity': {
				value: 1.0
			}
		},
		vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: /* glsl */`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );
			gl_FragColor.a *= opacity;


		}`
	};

	THREE.CopyShader = CopyShader;

} )();
( function () {

	class Pass {

		constructor() {

			// if set to true, the pass is processed by the composer
			this.enabled = true;

			// if set to true, the pass indicates to swap read and write buffer after rendering
			this.needsSwap = true;

			// if set to true, the pass clears its buffer before rendering
			this.clear = false;

			// if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
			this.renderToScreen = false;

		}
		setSize() {}
		render() {

			console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );

		}
		dispose() {}

	}

	// Helper for passes that need to fill the viewport with a single quad.

	const _camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );

	// https://github.com/mrdoob/three.js/pull/21358

	const _geometry = new THREE.BufferGeometry();
	_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );
	_geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );
	class FullScreenQuad {

		constructor( material ) {

			this._mesh = new THREE.Mesh( _geometry, material );

		}
		dispose() {

			this._mesh.geometry.dispose();

		}
		render( renderer ) {

			renderer.render( this._mesh, _camera );

		}
		get material() {

			return this._mesh.material;

		}
		set material( value ) {

			this._mesh.material = value;

		}

	}

	THREE.FullScreenQuad = FullScreenQuad;
	THREE.Pass = Pass;

} )();
( function () {

	class MaskPass extends THREE.Pass {

		constructor( scene, camera ) {

			super();
			this.scene = scene;
			this.camera = camera;
			this.clear = true;
			this.needsSwap = false;
			this.inverse = false;

		}
		render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

			const context = renderer.getContext();
			const state = renderer.state;

			// don't update color or depth

			state.buffers.color.setMask( false );
			state.buffers.depth.setMask( false );

			// lock buffers

			state.buffers.color.setLocked( true );
			state.buffers.depth.setLocked( true );

			// set up stencil

			let writeValue, clearValue;
			if ( this.inverse ) {

				writeValue = 0;
				clearValue = 1;

			} else {

				writeValue = 1;
				clearValue = 0;

			}

			state.buffers.stencil.setTest( true );
			state.buffers.stencil.setOp( context.REPLACE, context.REPLACE, context.REPLACE );
			state.buffers.stencil.setFunc( context.ALWAYS, writeValue, 0xffffffff );
			state.buffers.stencil.setClear( clearValue );
			state.buffers.stencil.setLocked( true );

			// draw into the stencil buffer

			renderer.setRenderTarget( readBuffer );
			if ( this.clear ) renderer.clear();
			renderer.render( this.scene, this.camera );
			renderer.setRenderTarget( writeBuffer );
			if ( this.clear ) renderer.clear();
			renderer.render( this.scene, this.camera );

			// unlock color and depth buffer for subsequent rendering

			state.buffers.color.setLocked( false );
			state.buffers.depth.setLocked( false );

			// only render where stencil is set to 1

			state.buffers.stencil.setLocked( false );
			state.buffers.stencil.setFunc( context.EQUAL, 1, 0xffffffff ); // draw if == 1
			state.buffers.stencil.setOp( context.KEEP, context.KEEP, context.KEEP );
			state.buffers.stencil.setLocked( true );

		}

	}
	class ClearMaskPass extends THREE.Pass {

		constructor() {

			super();
			this.needsSwap = false;

		}
		render( renderer /*, writeBuffer, readBuffer, deltaTime, maskActive */ ) {

			renderer.state.buffers.stencil.setLocked( false );
			renderer.state.buffers.stencil.setTest( false );

		}

	}

	THREE.ClearMaskPass = ClearMaskPass;
	THREE.MaskPass = MaskPass;

} )();
( function () {

	class ClearPass extends THREE.Pass {

		constructor( clearColor, clearAlpha ) {

			super();
			this.needsSwap = false;
			this.clearColor = clearColor !== undefined ? clearColor : 0x000000;
			this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
			this._oldClearColor = new THREE.Color();

		}
		render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

			let oldClearAlpha;
			if ( this.clearColor ) {

				renderer.getClearColor( this._oldClearColor );
				oldClearAlpha = renderer.getClearAlpha();
				renderer.setClearColor( this.clearColor, this.clearAlpha );

			}

			renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );
			renderer.clear();
			if ( this.clearColor ) {

				renderer.setClearColor( this._oldClearColor, oldClearAlpha );

			}

		}

	}

	THREE.ClearPass = ClearPass;

} )();
( function () {

	class ShaderPass extends THREE.Pass {

		constructor( shader, textureID ) {

			super();
			this.textureID = textureID !== undefined ? textureID : 'tDiffuse';
			if ( shader instanceof THREE.ShaderMaterial ) {

				this.uniforms = shader.uniforms;
				this.material = shader;

			} else if ( shader ) {

				this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );
				this.material = new THREE.ShaderMaterial( {
					defines: Object.assign( {}, shader.defines ),
					uniforms: this.uniforms,
					vertexShader: shader.vertexShader,
					fragmentShader: shader.fragmentShader
				} );

			}

			this.fsQuad = new THREE.FullScreenQuad( this.material );

		}
		render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

			if ( this.uniforms[ this.textureID ] ) {

				this.uniforms[ this.textureID ].value = readBuffer.texture;

			}

			this.fsQuad.material = this.material;
			if ( this.renderToScreen ) {

				renderer.setRenderTarget( null );
				this.fsQuad.render( renderer );

			} else {

				renderer.setRenderTarget( writeBuffer );
				// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
				if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
				this.fsQuad.render( renderer );

			}

		}
		dispose() {

			this.material.dispose();
			this.fsQuad.dispose();

		}

	}

	THREE.ShaderPass = ShaderPass;

} )();
( function () {

	class RenderPass extends THREE.Pass {

		constructor( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

			super();
			this.scene = scene;
			this.camera = camera;
			this.overrideMaterial = overrideMaterial;
			this.clearColor = clearColor;
			this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
			this.clear = true;
			this.clearDepth = false;
			this.needsSwap = false;
			this._oldClearColor = new THREE.Color();

		}
		render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

			const oldAutoClear = renderer.autoClear;
			renderer.autoClear = false;
			let oldClearAlpha, oldOverrideMaterial;
			if ( this.overrideMaterial !== undefined ) {

				oldOverrideMaterial = this.scene.overrideMaterial;
				this.scene.overrideMaterial = this.overrideMaterial;

			}

			if ( this.clearColor ) {

				renderer.getClearColor( this._oldClearColor );
				oldClearAlpha = renderer.getClearAlpha();
				renderer.setClearColor( this.clearColor, this.clearAlpha );

			}

			if ( this.clearDepth ) {

				renderer.clearDepth();

			}

			renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );

			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			renderer.render( this.scene, this.camera );
			if ( this.clearColor ) {

				renderer.setClearColor( this._oldClearColor, oldClearAlpha );

			}

			if ( this.overrideMaterial !== undefined ) {

				this.scene.overrideMaterial = oldOverrideMaterial;

			}

			renderer.autoClear = oldAutoClear;

		}

	}

	THREE.RenderPass = RenderPass;

} )();
( function () {

	class EffectComposer {

		constructor( renderer, renderTarget ) {

			this.renderer = renderer;
			if ( renderTarget === undefined ) {

				const size = renderer.getSize( new THREE.Vector2() );
				this._pixelRatio = renderer.getPixelRatio();
				this._width = size.width;
				this._height = size.height;
				renderTarget = new THREE.WebGLRenderTarget( this._width * this._pixelRatio, this._height * this._pixelRatio );
				renderTarget.texture.name = 'EffectComposer.rt1';

			} else {

				this._pixelRatio = 1;
				this._width = renderTarget.width;
				this._height = renderTarget.height;

			}

			this.renderTarget1 = renderTarget;
			this.renderTarget2 = renderTarget.clone();
			this.renderTarget2.texture.name = 'EffectComposer.rt2';
			this.writeBuffer = this.renderTarget1;
			this.readBuffer = this.renderTarget2;
			this.renderToScreen = true;
			this.passes = [];

			// dependencies

			if ( THREE.CopyShader === undefined ) {

				console.error( 'THREE.EffectComposer relies on THREE.CopyShader' );

			}

			if ( THREE.ShaderPass === undefined ) {

				console.error( 'THREE.EffectComposer relies on THREE.ShaderPass' );

			}

			this.copyPass = new THREE.ShaderPass( THREE.CopyShader );
			this.clock = new THREE.Clock();

		}
		swapBuffers() {

			const tmp = this.readBuffer;
			this.readBuffer = this.writeBuffer;
			this.writeBuffer = tmp;

		}
		addPass( pass ) {

			this.passes.push( pass );
			pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

		}
		insertPass( pass, index ) {

			this.passes.splice( index, 0, pass );
			pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

		}
		removePass( pass ) {

			const index = this.passes.indexOf( pass );
			if ( index !== - 1 ) {

				this.passes.splice( index, 1 );

			}

		}
		isLastEnabledPass( passIndex ) {

			for ( let i = passIndex + 1; i < this.passes.length; i ++ ) {

				if ( this.passes[ i ].enabled ) {

					return false;

				}

			}

			return true;

		}
		render( deltaTime ) {

			// deltaTime value is in seconds

			if ( deltaTime === undefined ) {

				deltaTime = this.clock.getDelta();

			}

			const currentRenderTarget = this.renderer.getRenderTarget();
			let maskActive = false;
			for ( let i = 0, il = this.passes.length; i < il; i ++ ) {

				const pass = this.passes[ i ];
				if ( pass.enabled === false ) continue;
				pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass( i );
				pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );
				if ( pass.needsSwap ) {

					if ( maskActive ) {

						const context = this.renderer.getContext();
						const stencil = this.renderer.state.buffers.stencil;

						//context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );
						stencil.setFunc( context.NOTEQUAL, 1, 0xffffffff );
						this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime );

						//context.stencilFunc( context.EQUAL, 1, 0xffffffff );
						stencil.setFunc( context.EQUAL, 1, 0xffffffff );

					}

					this.swapBuffers();

				}

				if ( THREE.MaskPass !== undefined ) {

					if ( pass instanceof THREE.MaskPass ) {

						maskActive = true;

					} else if ( pass instanceof THREE.ClearMaskPass ) {

						maskActive = false;

					}

				}

			}

			this.renderer.setRenderTarget( currentRenderTarget );

		}
		reset( renderTarget ) {

			if ( renderTarget === undefined ) {

				const size = this.renderer.getSize( new THREE.Vector2() );
				this._pixelRatio = this.renderer.getPixelRatio();
				this._width = size.width;
				this._height = size.height;
				renderTarget = this.renderTarget1.clone();
				renderTarget.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

			}

			this.renderTarget1.dispose();
			this.renderTarget2.dispose();
			this.renderTarget1 = renderTarget;
			this.renderTarget2 = renderTarget.clone();
			this.writeBuffer = this.renderTarget1;
			this.readBuffer = this.renderTarget2;

		}
		setSize( width, height ) {

			this._width = width;
			this._height = height;
			const effectiveWidth = this._width * this._pixelRatio;
			const effectiveHeight = this._height * this._pixelRatio;
			this.renderTarget1.setSize( effectiveWidth, effectiveHeight );
			this.renderTarget2.setSize( effectiveWidth, effectiveHeight );
			for ( let i = 0; i < this.passes.length; i ++ ) {

				this.passes[ i ].setSize( effectiveWidth, effectiveHeight );

			}

		}
		setPixelRatio( pixelRatio ) {

			this._pixelRatio = pixelRatio;
			this.setSize( this._width, this._height );

		}
		dispose() {

			this.renderTarget1.dispose();
			this.renderTarget2.dispose();
			this.copyPass.dispose();

		}

	}
	class Pass {

		constructor() {

			// if set to true, the pass is processed by the composer
			this.enabled = true;

			// if set to true, the pass indicates to swap read and write buffer after rendering
			this.needsSwap = true;

			// if set to true, the pass clears its buffer before rendering
			this.clear = false;

			// if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
			this.renderToScreen = false;

		}
		setSize() {}
		render() {

			console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );

		}

	}

	// Helper for passes that need to fill the viewport with a single quad.

	const _camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );

	// https://github.com/mrdoob/three.js/pull/21358

	const _geometry = new THREE.BufferGeometry();
	_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );
	_geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );
	class FullScreenQuad {

		constructor( material ) {

			this._mesh = new THREE.Mesh( _geometry, material );

		}
		dispose() {

			this._mesh.geometry.dispose();

		}
		render( renderer ) {

			renderer.render( this._mesh, _camera );

		}
		get material() {

			return this._mesh.material;

		}
		set material( value ) {

			this._mesh.material = value;

		}

	}

	THREE.EffectComposer = EffectComposer;
	THREE.FullScreenQuad = FullScreenQuad;
	THREE.Pass = Pass;

} )();
( function () {

	/**
 * SAO implementation inspired from bhouston previous SAO work
 */

	class SAOPass extends THREE.Pass {

		constructor( scene, camera, useDepthTexture = false, useNormals = false, resolution = new THREE.Vector2( 256, 256 ) ) {

			super();
			this.scene = scene;
			this.camera = camera;
			this.clear = true;
			this.needsSwap = false;
			this.supportsDepthTextureExtension = useDepthTexture;
			this.supportsNormalTexture = useNormals;
			this.originalClearColor = new THREE.Color();
			this._oldClearColor = new THREE.Color();
			this.oldClearAlpha = 1;
			this.params = {
				output: 0,
				saoBias: 0.5,
				saoIntensity: 0.18,
				saoScale: 1,
				saoKernelRadius: 100,
				saoMinResolution: 0,
				saoBlur: true,
				saoBlurRadius: 8,
				saoBlurStdDev: 4,
				saoBlurDepthCutoff: 0.01
			};
			this.resolution = new THREE.Vector2( resolution.x, resolution.y );
			this.saoRenderTarget = new THREE.WebGLRenderTarget( this.resolution.x, this.resolution.y );
			this.blurIntermediateRenderTarget = this.saoRenderTarget.clone();
			this.beautyRenderTarget = this.saoRenderTarget.clone();
			this.normalRenderTarget = new THREE.WebGLRenderTarget( this.resolution.x, this.resolution.y, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter
			} );
			this.depthRenderTarget = this.normalRenderTarget.clone();
			let depthTexture;
			if ( this.supportsDepthTextureExtension ) {

				depthTexture = new THREE.DepthTexture();
				depthTexture.type = THREE.UnsignedShortType;
				this.beautyRenderTarget.depthTexture = depthTexture;
				this.beautyRenderTarget.depthBuffer = true;

			}

			this.depthMaterial = new THREE.MeshDepthMaterial();
			this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
			this.depthMaterial.blending = THREE.NoBlending;
			this.normalMaterial = new THREE.MeshNormalMaterial();
			this.normalMaterial.blending = THREE.NoBlending;
			if ( THREE.SAOShader === undefined ) {

				console.error( 'THREE.SAOPass relies on THREE.SAOShader' );

			}

			this.saoMaterial = new THREE.ShaderMaterial( {
				defines: Object.assign( {}, THREE.SAOShader.defines ),
				fragmentShader: THREE.SAOShader.fragmentShader,
				vertexShader: THREE.SAOShader.vertexShader,
				uniforms: THREE.UniformsUtils.clone( THREE.SAOShader.uniforms )
			} );
			this.saoMaterial.extensions.derivatives = true;
			this.saoMaterial.defines[ 'DEPTH_PACKING' ] = this.supportsDepthTextureExtension ? 0 : 1;
			this.saoMaterial.defines[ 'NORMAL_TEXTURE' ] = this.supportsNormalTexture ? 1 : 0;
			this.saoMaterial.defines[ 'PERSPECTIVE_CAMERA' ] = this.camera.isPerspectiveCamera ? 1 : 0;
			this.saoMaterial.uniforms[ 'tDepth' ].value = this.supportsDepthTextureExtension ? depthTexture : this.depthRenderTarget.texture;
			this.saoMaterial.uniforms[ 'tNormal' ].value = this.normalRenderTarget.texture;
			this.saoMaterial.uniforms[ 'size' ].value.set( this.resolution.x, this.resolution.y );
			this.saoMaterial.uniforms[ 'cameraInverseProjectionMatrix' ].value.copy( this.camera.projectionMatrixInverse );
			this.saoMaterial.uniforms[ 'cameraProjectionMatrix' ].value = this.camera.projectionMatrix;
			this.saoMaterial.blending = THREE.NoBlending;
			if ( THREE.DepthLimitedBlurShader === undefined ) {

				console.error( 'THREE.SAOPass relies on THREE.DepthLimitedBlurShader' );

			}

			this.vBlurMaterial = new THREE.ShaderMaterial( {
				uniforms: THREE.UniformsUtils.clone( THREE.DepthLimitedBlurShader.uniforms ),
				defines: Object.assign( {}, THREE.DepthLimitedBlurShader.defines ),
				vertexShader: THREE.DepthLimitedBlurShader.vertexShader,
				fragmentShader: THREE.DepthLimitedBlurShader.fragmentShader
			} );
			this.vBlurMaterial.defines[ 'DEPTH_PACKING' ] = this.supportsDepthTextureExtension ? 0 : 1;
			this.vBlurMaterial.defines[ 'PERSPECTIVE_CAMERA' ] = this.camera.isPerspectiveCamera ? 1 : 0;
			this.vBlurMaterial.uniforms[ 'tDiffuse' ].value = this.saoRenderTarget.texture;
			this.vBlurMaterial.uniforms[ 'tDepth' ].value = this.supportsDepthTextureExtension ? depthTexture : this.depthRenderTarget.texture;
			this.vBlurMaterial.uniforms[ 'size' ].value.set( this.resolution.x, this.resolution.y );
			this.vBlurMaterial.blending = THREE.NoBlending;
			this.hBlurMaterial = new THREE.ShaderMaterial( {
				uniforms: THREE.UniformsUtils.clone( THREE.DepthLimitedBlurShader.uniforms ),
				defines: Object.assign( {}, THREE.DepthLimitedBlurShader.defines ),
				vertexShader: THREE.DepthLimitedBlurShader.vertexShader,
				fragmentShader: THREE.DepthLimitedBlurShader.fragmentShader
			} );
			this.hBlurMaterial.defines[ 'DEPTH_PACKING' ] = this.supportsDepthTextureExtension ? 0 : 1;
			this.hBlurMaterial.defines[ 'PERSPECTIVE_CAMERA' ] = this.camera.isPerspectiveCamera ? 1 : 0;
			this.hBlurMaterial.uniforms[ 'tDiffuse' ].value = this.blurIntermediateRenderTarget.texture;
			this.hBlurMaterial.uniforms[ 'tDepth' ].value = this.supportsDepthTextureExtension ? depthTexture : this.depthRenderTarget.texture;
			this.hBlurMaterial.uniforms[ 'size' ].value.set( this.resolution.x, this.resolution.y );
			this.hBlurMaterial.blending = THREE.NoBlending;
			if ( THREE.CopyShader === undefined ) {

				console.error( 'THREE.SAOPass relies on THREE.CopyShader' );

			}

			this.materialCopy = new THREE.ShaderMaterial( {
				uniforms: THREE.UniformsUtils.clone( THREE.CopyShader.uniforms ),
				vertexShader: THREE.CopyShader.vertexShader,
				fragmentShader: THREE.CopyShader.fragmentShader,
				blending: THREE.NoBlending
			} );
			this.materialCopy.transparent = true;
			this.materialCopy.depthTest = false;
			this.materialCopy.depthWrite = false;
			this.materialCopy.blending = THREE.CustomBlending;
			this.materialCopy.blendSrc = THREE.DstColorFactor;
			this.materialCopy.blendDst = THREE.ZeroFactor;
			this.materialCopy.blendEquation = THREE.AddEquation;
			this.materialCopy.blendSrcAlpha = THREE.DstAlphaFactor;
			this.materialCopy.blendDstAlpha = THREE.ZeroFactor;
			this.materialCopy.blendEquationAlpha = THREE.AddEquation;
			if ( THREE.UnpackDepthRGBAShader === undefined ) {

				console.error( 'THREE.SAOPass relies on THREE.UnpackDepthRGBAShader' );

			}

			this.depthCopy = new THREE.ShaderMaterial( {
				uniforms: THREE.UniformsUtils.clone( THREE.UnpackDepthRGBAShader.uniforms ),
				vertexShader: THREE.UnpackDepthRGBAShader.vertexShader,
				fragmentShader: THREE.UnpackDepthRGBAShader.fragmentShader,
				blending: THREE.NoBlending
			} );
			this.fsQuad = new THREE.FullScreenQuad( null );

		}
		render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive*/ ) {

			// Rendering readBuffer first when rendering to screen
			if ( this.renderToScreen ) {

				this.materialCopy.blending = THREE.NoBlending;
				this.materialCopy.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
				this.materialCopy.needsUpdate = true;
				this.renderPass( renderer, this.materialCopy, null );

			}

			if ( this.params.output === 1 ) {

				return;

			}

			renderer.getClearColor( this._oldClearColor );
			this.oldClearAlpha = renderer.getClearAlpha();
			const oldAutoClear = renderer.autoClear;
			renderer.autoClear = false;
			renderer.setRenderTarget( this.depthRenderTarget );
			renderer.clear();
			this.saoMaterial.uniforms[ 'bias' ].value = this.params.saoBias;
			this.saoMaterial.uniforms[ 'intensity' ].value = this.params.saoIntensity;
			this.saoMaterial.uniforms[ 'scale' ].value = this.params.saoScale;
			this.saoMaterial.uniforms[ 'kernelRadius' ].value = this.params.saoKernelRadius;
			this.saoMaterial.uniforms[ 'minResolution' ].value = this.params.saoMinResolution;
			this.saoMaterial.uniforms[ 'cameraNear' ].value = this.camera.near;
			this.saoMaterial.uniforms[ 'cameraFar' ].value = this.camera.far;
			// this.saoMaterial.uniforms['randomSeed'].value = Math.random();

			const depthCutoff = this.params.saoBlurDepthCutoff * ( this.camera.far - this.camera.near );
			this.vBlurMaterial.uniforms[ 'depthCutoff' ].value = depthCutoff;
			this.hBlurMaterial.uniforms[ 'depthCutoff' ].value = depthCutoff;
			this.vBlurMaterial.uniforms[ 'cameraNear' ].value = this.camera.near;
			this.vBlurMaterial.uniforms[ 'cameraFar' ].value = this.camera.far;
			this.hBlurMaterial.uniforms[ 'cameraNear' ].value = this.camera.near;
			this.hBlurMaterial.uniforms[ 'cameraFar' ].value = this.camera.far;
			this.params.saoBlurRadius = Math.floor( this.params.saoBlurRadius );
			if ( this.prevStdDev !== this.params.saoBlurStdDev || this.prevNumSamples !== this.params.saoBlurRadius ) {

				THREE.BlurShaderUtils.configure( this.vBlurMaterial, this.params.saoBlurRadius, this.params.saoBlurStdDev, new THREE.Vector2( 0, 1 ) );
				THREE.BlurShaderUtils.configure( this.hBlurMaterial, this.params.saoBlurRadius, this.params.saoBlurStdDev, new THREE.Vector2( 1, 0 ) );
				this.prevStdDev = this.params.saoBlurStdDev;
				this.prevNumSamples = this.params.saoBlurRadius;

			}

			// Rendering scene to depth texture
			renderer.setClearColor( 0x000000 );
			renderer.setRenderTarget( this.beautyRenderTarget );
			renderer.clear();
			renderer.render( this.scene, this.camera );

			// Re-render scene if depth texture extension is not supported
			if ( ! this.supportsDepthTextureExtension ) {

				// Clear rule : far clipping plane in both RGBA and Basic encoding
				this.renderOverride( renderer, this.depthMaterial, this.depthRenderTarget, 0x000000, 1.0 );

			}

			if ( this.supportsNormalTexture ) {

				// Clear rule : default normal is facing the camera
				this.renderOverride( renderer, this.normalMaterial, this.normalRenderTarget, 0x7777ff, 1.0 );

			}

			// Rendering SAO texture
			this.renderPass( renderer, this.saoMaterial, this.saoRenderTarget, 0xffffff, 1.0 );

			// Blurring SAO texture
			if ( this.params.saoBlur ) {

				this.renderPass( renderer, this.vBlurMaterial, this.blurIntermediateRenderTarget, 0xffffff, 1.0 );
				this.renderPass( renderer, this.hBlurMaterial, this.saoRenderTarget, 0xffffff, 1.0 );

			}

			let outputMaterial = this.materialCopy;
			// Setting up SAO rendering
			if ( this.params.output === 3 ) {

				if ( this.supportsDepthTextureExtension ) {

					this.materialCopy.uniforms[ 'tDiffuse' ].value = this.beautyRenderTarget.depthTexture;
					this.materialCopy.needsUpdate = true;

				} else {

					this.depthCopy.uniforms[ 'tDiffuse' ].value = this.depthRenderTarget.texture;
					this.depthCopy.needsUpdate = true;
					outputMaterial = this.depthCopy;

				}

			} else if ( this.params.output === 4 ) {

				this.materialCopy.uniforms[ 'tDiffuse' ].value = this.normalRenderTarget.texture;
				this.materialCopy.needsUpdate = true;

			} else {

				this.materialCopy.uniforms[ 'tDiffuse' ].value = this.saoRenderTarget.texture;
				this.materialCopy.needsUpdate = true;

			}

			// Blending depends on output, only want a THREE.CustomBlending when showing SAO
			if ( this.params.output === 0 ) {

				outputMaterial.blending = THREE.CustomBlending;

			} else {

				outputMaterial.blending = THREE.NoBlending;

			}

			// Rendering SAOPass result on top of previous pass
			this.renderPass( renderer, outputMaterial, this.renderToScreen ? null : readBuffer );
			renderer.setClearColor( this._oldClearColor, this.oldClearAlpha );
			renderer.autoClear = oldAutoClear;

		}
		renderPass( renderer, passMaterial, renderTarget, clearColor, clearAlpha ) {

			// save original state
			renderer.getClearColor( this.originalClearColor );
			const originalClearAlpha = renderer.getClearAlpha();
			const originalAutoClear = renderer.autoClear;
			renderer.setRenderTarget( renderTarget );

			// setup pass state
			renderer.autoClear = false;
			if ( clearColor !== undefined && clearColor !== null ) {

				renderer.setClearColor( clearColor );
				renderer.setClearAlpha( clearAlpha || 0.0 );
				renderer.clear();

			}

			this.fsQuad.material = passMaterial;
			this.fsQuad.render( renderer );

			// restore original state
			renderer.autoClear = originalAutoClear;
			renderer.setClearColor( this.originalClearColor );
			renderer.setClearAlpha( originalClearAlpha );

		}
		renderOverride( renderer, overrideMaterial, renderTarget, clearColor, clearAlpha ) {

			renderer.getClearColor( this.originalClearColor );
			const originalClearAlpha = renderer.getClearAlpha();
			const originalAutoClear = renderer.autoClear;
			renderer.setRenderTarget( renderTarget );
			renderer.autoClear = false;
			clearColor = overrideMaterial.clearColor || clearColor;
			clearAlpha = overrideMaterial.clearAlpha || clearAlpha;
			if ( clearColor !== undefined && clearColor !== null ) {

				renderer.setClearColor( clearColor );
				renderer.setClearAlpha( clearAlpha || 0.0 );
				renderer.clear();

			}

			this.scene.overrideMaterial = overrideMaterial;
			renderer.render( this.scene, this.camera );
			this.scene.overrideMaterial = null;

			// restore original state
			renderer.autoClear = originalAutoClear;
			renderer.setClearColor( this.originalClearColor );
			renderer.setClearAlpha( originalClearAlpha );

		}
		setSize( width, height ) {

			this.beautyRenderTarget.setSize( width, height );
			this.saoRenderTarget.setSize( width, height );
			this.blurIntermediateRenderTarget.setSize( width, height );
			this.normalRenderTarget.setSize( width, height );
			this.depthRenderTarget.setSize( width, height );
			this.saoMaterial.uniforms[ 'size' ].value.set( width, height );
			this.saoMaterial.uniforms[ 'cameraInverseProjectionMatrix' ].value.copy( this.camera.projectionMatrixInverse );
			this.saoMaterial.uniforms[ 'cameraProjectionMatrix' ].value = this.camera.projectionMatrix;
			this.saoMaterial.needsUpdate = true;
			this.vBlurMaterial.uniforms[ 'size' ].value.set( width, height );
			this.vBlurMaterial.needsUpdate = true;
			this.hBlurMaterial.uniforms[ 'size' ].value.set( width, height );
			this.hBlurMaterial.needsUpdate = true;

		}
		dispose() {

			this.saoRenderTarget.dispose();
			this.blurIntermediateRenderTarget.dispose();
			this.beautyRenderTarget.dispose();
			this.normalRenderTarget.dispose();
			this.depthRenderTarget.dispose();
			this.depthMaterial.dispose();
			this.normalMaterial.dispose();
			this.saoMaterial.dispose();
			this.vBlurMaterial.dispose();
			this.hBlurMaterial.dispose();
			this.materialCopy.dispose();
			this.depthCopy.dispose();
			this.fsQuad.dispose();

		}

	}
	SAOPass.OUTPUT = {
		'Beauty': 1,
		'Default': 0,
		'SAO': 2,
		'Depth': 3,
		'Normal': 4
	};

	THREE.SAOPass = SAOPass;

} )();
( function () {

	/**
 * TODO
 */

	const SAOShader = {
		defines: {
			'NUM_SAMPLES': 7,
			'NUM_RINGS': 4,
			'NORMAL_TEXTURE': 0,
			'DIFFUSE_TEXTURE': 0,
			'DEPTH_PACKING': 1,
			'PERSPECTIVE_CAMERA': 1
		},
		uniforms: {
			'tDepth': {
				value: null
			},
			'tDiffuse': {
				value: null
			},
			'tNormal': {
				value: null
			},
			'size': {
				value: new THREE.Vector2( 512, 512 )
			},
			'cameraNear': {
				value: 1
			},
			'cameraFar': {
				value: 100
			},
			'cameraProjectionMatrix': {
				value: new THREE.Matrix4()
			},
			'cameraInverseProjectionMatrix': {
				value: new THREE.Matrix4()
			},
			'scale': {
				value: 1.0
			},
			'intensity': {
				value: 0.1
			},
			'bias': {
				value: 0.5
			},
			'minResolution': {
				value: 0.0
			},
			'kernelRadius': {
				value: 100.0
			},
			'randomSeed': {
				value: 0.0
			}
		},
		vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
		fragmentShader: /* glsl */`

		#include <common>

		varying vec2 vUv;

		#if DIFFUSE_TEXTURE == 1
		uniform sampler2D tDiffuse;
		#endif

		uniform sampler2D tDepth;

		#if NORMAL_TEXTURE == 1
		uniform sampler2D tNormal;
		#endif

		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraInverseProjectionMatrix;

		uniform float scale;
		uniform float intensity;
		uniform float bias;
		uniform float kernelRadius;
		uniform float minResolution;
		uniform vec2 size;
		uniform float randomSeed;

		// RGBA depth

		#include <packing>

		vec4 getDefaultColor( const in vec2 screenPosition ) {
			#if DIFFUSE_TEXTURE == 1
			return texture2D( tDiffuse, vUv );
			#else
			return vec4( 1.0 );
			#endif
		}

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
			#else
			return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
			#endif
		}

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {
			float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];
			vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );
			clipPosition *= clipW; // unprojection.

			return ( cameraInverseProjectionMatrix * clipPosition ).xyz;
		}

		vec3 getViewNormal( const in vec3 viewPosition, const in vec2 screenPosition ) {
			#if NORMAL_TEXTURE == 1
			return unpackRGBToNormal( texture2D( tNormal, screenPosition ).xyz );
			#else
			return normalize( cross( dFdx( viewPosition ), dFdy( viewPosition ) ) );
			#endif
		}

		float scaleDividedByCameraFar;
		float minResolutionMultipliedByCameraFar;

		float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {
			vec3 viewDelta = sampleViewPosition - centerViewPosition;
			float viewDistance = length( viewDelta );
			float scaledScreenDistance = scaleDividedByCameraFar * viewDistance;

			return max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - bias) / (1.0 + pow2( scaledScreenDistance ) );
		}

		// moving costly divides into consts
		const float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
		const float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );

		float getAmbientOcclusion( const in vec3 centerViewPosition ) {
			// precompute some variables require in getOcclusion.
			scaleDividedByCameraFar = scale / cameraFar;
			minResolutionMultipliedByCameraFar = minResolution * cameraFar;
			vec3 centerViewNormal = getViewNormal( centerViewPosition, vUv );

			// jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/
			float angle = rand( vUv + randomSeed ) * PI2;
			vec2 radius = vec2( kernelRadius * INV_NUM_SAMPLES ) / size;
			vec2 radiusStep = radius;

			float occlusionSum = 0.0;
			float weightSum = 0.0;

			for( int i = 0; i < NUM_SAMPLES; i ++ ) {
				vec2 sampleUv = vUv + vec2( cos( angle ), sin( angle ) ) * radius;
				radius += radiusStep;
				angle += ANGLE_STEP;

				float sampleDepth = getDepth( sampleUv );
				if( sampleDepth >= ( 1.0 - EPSILON ) ) {
					continue;
				}

				float sampleViewZ = getViewZ( sampleDepth );
				vec3 sampleViewPosition = getViewPosition( sampleUv, sampleDepth, sampleViewZ );
				occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );
				weightSum += 1.0;
			}

			if( weightSum == 0.0 ) discard;

			return occlusionSum * ( intensity / weightSum );
		}

		void main() {
			float centerDepth = getDepth( vUv );
			if( centerDepth >= ( 1.0 - EPSILON ) ) {
				discard;
			}

			float centerViewZ = getViewZ( centerDepth );
			vec3 viewPosition = getViewPosition( vUv, centerDepth, centerViewZ );

			float ambientOcclusion = getAmbientOcclusion( viewPosition );

			gl_FragColor = getDefaultColor( vUv );
			gl_FragColor.xyz *=  1.0 - ambientOcclusion;
		}`
	};

	THREE.SAOShader = SAOShader;

} )();
( function () {

	/**
 * TODO
 */

	const DepthLimitedBlurShader = {
		defines: {
			'KERNEL_RADIUS': 4,
			'DEPTH_PACKING': 1,
			'PERSPECTIVE_CAMERA': 1
		},
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'size': {
				value: new THREE.Vector2( 512, 512 )
			},
			'sampleUvOffsets': {
				value: [ new THREE.Vector2( 0, 0 ) ]
			},
			'sampleWeights': {
				value: [ 1.0 ]
			},
			'tDepth': {
				value: null
			},
			'cameraNear': {
				value: 10
			},
			'cameraFar': {
				value: 1000
			},
			'depthCutoff': {
				value: 10
			}
		},
		vertexShader: /* glsl */`

		#include <common>

		uniform vec2 size;

		varying vec2 vUv;
		varying vec2 vInvSize;

		void main() {
			vUv = uv;
			vInvSize = 1.0 / size;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
		fragmentShader: /* glsl */`

		#include <common>
		#include <packing>

		uniform sampler2D tDiffuse;
		uniform sampler2D tDepth;

		uniform float cameraNear;
		uniform float cameraFar;
		uniform float depthCutoff;

		uniform vec2 sampleUvOffsets[ KERNEL_RADIUS + 1 ];
		uniform float sampleWeights[ KERNEL_RADIUS + 1 ];

		varying vec2 vUv;
		varying vec2 vInvSize;

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
			#else
			return orthographicDepthToViewZ( depth, cameraNear, cameraFar );
			#endif
		}

		void main() {
			float depth = getDepth( vUv );
			if( depth >= ( 1.0 - EPSILON ) ) {
				discard;
			}

			float centerViewZ = -getViewZ( depth );
			bool rBreak = false, lBreak = false;

			float weightSum = sampleWeights[0];
			vec4 diffuseSum = texture2D( tDiffuse, vUv ) * weightSum;

			for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {

				float sampleWeight = sampleWeights[i];
				vec2 sampleUvOffset = sampleUvOffsets[i] * vInvSize;

				vec2 sampleUv = vUv + sampleUvOffset;
				float viewZ = -getViewZ( getDepth( sampleUv ) );

				if( abs( viewZ - centerViewZ ) > depthCutoff ) rBreak = true;

				if( ! rBreak ) {
					diffuseSum += texture2D( tDiffuse, sampleUv ) * sampleWeight;
					weightSum += sampleWeight;
				}

				sampleUv = vUv - sampleUvOffset;
				viewZ = -getViewZ( getDepth( sampleUv ) );

				if( abs( viewZ - centerViewZ ) > depthCutoff ) lBreak = true;

				if( ! lBreak ) {
					diffuseSum += texture2D( tDiffuse, sampleUv ) * sampleWeight;
					weightSum += sampleWeight;
				}

			}

			gl_FragColor = diffuseSum / weightSum;
		}`
	};
	const BlurShaderUtils = {
		createSampleWeights: function ( kernelRadius, stdDev ) {

			const weights = [];
			for ( let i = 0; i <= kernelRadius; i ++ ) {

				weights.push( gaussian( i, stdDev ) );

			}

			return weights;

		},
		createSampleOffsets: function ( kernelRadius, uvIncrement ) {

			const offsets = [];
			for ( let i = 0; i <= kernelRadius; i ++ ) {

				offsets.push( uvIncrement.clone().multiplyScalar( i ) );

			}

			return offsets;

		},
		configure: function ( material, kernelRadius, stdDev, uvIncrement ) {

			material.defines[ 'KERNEL_RADIUS' ] = kernelRadius;
			material.uniforms[ 'sampleUvOffsets' ].value = BlurShaderUtils.createSampleOffsets( kernelRadius, uvIncrement );
			material.uniforms[ 'sampleWeights' ].value = BlurShaderUtils.createSampleWeights( kernelRadius, stdDev );
			material.needsUpdate = true;

		}
	};
	function gaussian( x, stdDev ) {

		return Math.exp( - ( x * x ) / ( 2.0 * ( stdDev * stdDev ) ) ) / ( Math.sqrt( 2.0 * Math.PI ) * stdDev );

	}

	THREE.BlurShaderUtils = BlurShaderUtils;
	THREE.DepthLimitedBlurShader = DepthLimitedBlurShader;

} )();
( function () {

	class BloomPass extends THREE.Pass {

		constructor( strength = 1, kernelSize = 25, sigma = 4 ) {

			super();

			// render targets

			this.renderTargetX = new THREE.WebGLRenderTarget(); // will be resized later
			this.renderTargetX.texture.name = 'BloomPass.x';
			this.renderTargetY = new THREE.WebGLRenderTarget(); // will be resized later
			this.renderTargetY.texture.name = 'BloomPass.y';

			// combine material

			this.combineUniforms = THREE.UniformsUtils.clone( CombineShader.uniforms );
			this.combineUniforms[ 'strength' ].value = strength;
			this.materialCombine = new THREE.ShaderMaterial( {
				uniforms: this.combineUniforms,
				vertexShader: CombineShader.vertexShader,
				fragmentShader: CombineShader.fragmentShader,
				blending: THREE.AdditiveBlending,
				transparent: true
			} );

			// convolution material

			if ( THREE.ConvolutionShader === undefined ) console.error( 'THREE.BloomPass relies on THREE.ConvolutionShader' );
			const convolutionShader = THREE.ConvolutionShader;
			this.convolutionUniforms = THREE.UniformsUtils.clone( convolutionShader.uniforms );
			this.convolutionUniforms[ 'uImageIncrement' ].value = BloomPass.blurX;
			this.convolutionUniforms[ 'cKernel' ].value = THREE.ConvolutionShader.buildKernel( sigma );
			this.materialConvolution = new THREE.ShaderMaterial( {
				uniforms: this.convolutionUniforms,
				vertexShader: convolutionShader.vertexShader,
				fragmentShader: convolutionShader.fragmentShader,
				defines: {
					'KERNEL_SIZE_FLOAT': kernelSize.toFixed( 1 ),
					'KERNEL_SIZE_INT': kernelSize.toFixed( 0 )
				}
			} );
			this.needsSwap = false;
			this.fsQuad = new THREE.FullScreenQuad( null );

		}
		render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

			if ( maskActive ) renderer.state.buffers.stencil.setTest( false );

			// Render quad with blured scene into texture (convolution pass 1)

			this.fsQuad.material = this.materialConvolution;
			this.convolutionUniforms[ 'tDiffuse' ].value = readBuffer.texture;
			this.convolutionUniforms[ 'uImageIncrement' ].value = BloomPass.blurX;
			renderer.setRenderTarget( this.renderTargetX );
			renderer.clear();
			this.fsQuad.render( renderer );

			// Render quad with blured scene into texture (convolution pass 2)

			this.convolutionUniforms[ 'tDiffuse' ].value = this.renderTargetX.texture;
			this.convolutionUniforms[ 'uImageIncrement' ].value = BloomPass.blurY;
			renderer.setRenderTarget( this.renderTargetY );
			renderer.clear();
			this.fsQuad.render( renderer );

			// Render original scene with superimposed blur to texture

			this.fsQuad.material = this.materialCombine;
			this.combineUniforms[ 'tDiffuse' ].value = this.renderTargetY.texture;
			if ( maskActive ) renderer.state.buffers.stencil.setTest( true );
			renderer.setRenderTarget( readBuffer );
			if ( this.clear ) renderer.clear();
			this.fsQuad.render( renderer );

		}
		setSize( width, height ) {

			this.renderTargetX.setSize( width, height );
			this.renderTargetY.setSize( width, height );

		}
		dispose() {

			this.renderTargetX.dispose();
			this.renderTargetY.dispose();
			this.materialCombine.dispose();
			this.materialConvolution.dispose();
			this.fsQuad.dispose();

		}

	}
	const CombineShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'strength': {
				value: 1.0
			}
		},
		vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: /* glsl */`

		uniform float strength;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = strength * texel;

		}`
	};
	BloomPass.blurX = new THREE.Vector2( 0.001953125, 0.0 );
	BloomPass.blurY = new THREE.Vector2( 0.0, 0.001953125 );

	THREE.BloomPass = BloomPass;

} )();
( function () {

	/**
 * Convolution shader
 * ported from o3d sample to WebGL / GLSL
 */

	const ConvolutionShader = {
		defines: {
			'KERNEL_SIZE_FLOAT': '25.0',
			'KERNEL_SIZE_INT': '25'
		},
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'uImageIncrement': {
				value: new THREE.Vector2( 0.001953125, 0.0 )
			},
			'cKernel': {
				value: []
			}
		},
		vertexShader: /* glsl */`

		uniform vec2 uImageIncrement;

		varying vec2 vUv;

		void main() {

			vUv = uv - ( ( KERNEL_SIZE_FLOAT - 1.0 ) / 2.0 ) * uImageIncrement;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: /* glsl */`

		uniform float cKernel[ KERNEL_SIZE_INT ];

		uniform sampler2D tDiffuse;
		uniform vec2 uImageIncrement;

		varying vec2 vUv;

		void main() {

			vec2 imageCoord = vUv;
			vec4 sum = vec4( 0.0, 0.0, 0.0, 0.0 );

			for( int i = 0; i < KERNEL_SIZE_INT; i ++ ) {

				sum += texture2D( tDiffuse, imageCoord ) * cKernel[ i ];
				imageCoord += uImageIncrement;

			}

			gl_FragColor = sum;

		}`,
		buildKernel: function ( sigma ) {

			// We lop off the sqrt(2 * pi) * sigma term, since we're going to normalize anyway.

			const kMaxKernelSize = 25;
			let kernelSize = 2 * Math.ceil( sigma * 3.0 ) + 1;
			if ( kernelSize > kMaxKernelSize ) kernelSize = kMaxKernelSize;
			const halfWidth = ( kernelSize - 1 ) * 0.5;
			const values = new Array( kernelSize );
			let sum = 0.0;
			for ( let i = 0; i < kernelSize; ++ i ) {

				values[ i ] = gauss( i - halfWidth, sigma );
				sum += values[ i ];

			}

			// normalize the kernel

			for ( let i = 0; i < kernelSize; ++ i ) values[ i ] /= sum;
			return values;

		}
	};
	function gauss( x, sigma ) {

		return Math.exp( - ( x * x ) / ( 2.0 * sigma * sigma ) );

	}

	THREE.ConvolutionShader = ConvolutionShader;

} )();
( function () {

	/**
 * UnrealBloomPass is inspired by the bloom pass of Unreal Engine. It creates a
 * mip map chain of bloom textures and blurs them with different radii. Because
 * of the weighted combination of mips, and because larger blurs are done on
 * higher mips, this effect provides good quality and performance.
 *
 * Reference:
 * - https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/
 */
	class UnrealBloomPass extends THREE.Pass {

		constructor( resolution, strength, radius, threshold ) {

			super();
			this.strength = strength !== undefined ? strength : 1;
			this.radius = radius;
			this.threshold = threshold;
			this.resolution = resolution !== undefined ? new THREE.Vector2( resolution.x, resolution.y ) : new THREE.Vector2( 256, 256 );

			// create color only once here, reuse it later inside the render function
			this.clearColor = new THREE.Color( 0, 0, 0 );

			// render targets
			this.renderTargetsHorizontal = [];
			this.renderTargetsVertical = [];
			this.nMips = 5;
			let resx = Math.round( this.resolution.x / 2 );
			let resy = Math.round( this.resolution.y / 2 );
			this.renderTargetBright = new THREE.WebGLRenderTarget( resx, resy );
			this.renderTargetBright.texture.name = 'UnrealBloomPass.bright';
			this.renderTargetBright.texture.generateMipmaps = false;
			for ( let i = 0; i < this.nMips; i ++ ) {

				const renderTargetHorizonal = new THREE.WebGLRenderTarget( resx, resy );
				renderTargetHorizonal.texture.name = 'UnrealBloomPass.h' + i;
				renderTargetHorizonal.texture.generateMipmaps = false;
				this.renderTargetsHorizontal.push( renderTargetHorizonal );
				const renderTargetVertical = new THREE.WebGLRenderTarget( resx, resy );
				renderTargetVertical.texture.name = 'UnrealBloomPass.v' + i;
				renderTargetVertical.texture.generateMipmaps = false;
				this.renderTargetsVertical.push( renderTargetVertical );
				resx = Math.round( resx / 2 );
				resy = Math.round( resy / 2 );

			}

			// luminosity high pass material

			if ( THREE.LuminosityHighPassShader === undefined ) console.error( 'THREE.UnrealBloomPass relies on THREE.LuminosityHighPassShader' );
			const highPassShader = THREE.LuminosityHighPassShader;
			this.highPassUniforms = THREE.UniformsUtils.clone( highPassShader.uniforms );
			this.highPassUniforms[ 'luminosityThreshold' ].value = threshold;
			this.highPassUniforms[ 'smoothWidth' ].value = 0.01;
			this.materialHighPassFilter = new THREE.ShaderMaterial( {
				uniforms: this.highPassUniforms,
				vertexShader: highPassShader.vertexShader,
				fragmentShader: highPassShader.fragmentShader,
				defines: {}
			} );

			// Gaussian Blur Materials
			this.separableBlurMaterials = [];
			const kernelSizeArray = [ 3, 5, 7, 9, 11 ];
			resx = Math.round( this.resolution.x / 2 );
			resy = Math.round( this.resolution.y / 2 );
			for ( let i = 0; i < this.nMips; i ++ ) {

				this.separableBlurMaterials.push( this.getSeperableBlurMaterial( kernelSizeArray[ i ] ) );
				this.separableBlurMaterials[ i ].uniforms[ 'texSize' ].value = new THREE.Vector2( resx, resy );
				resx = Math.round( resx / 2 );
				resy = Math.round( resy / 2 );

			}

			// Composite material
			this.compositeMaterial = this.getCompositeMaterial( this.nMips );
			this.compositeMaterial.uniforms[ 'blurTexture1' ].value = this.renderTargetsVertical[ 0 ].texture;
			this.compositeMaterial.uniforms[ 'blurTexture2' ].value = this.renderTargetsVertical[ 1 ].texture;
			this.compositeMaterial.uniforms[ 'blurTexture3' ].value = this.renderTargetsVertical[ 2 ].texture;
			this.compositeMaterial.uniforms[ 'blurTexture4' ].value = this.renderTargetsVertical[ 3 ].texture;
			this.compositeMaterial.uniforms[ 'blurTexture5' ].value = this.renderTargetsVertical[ 4 ].texture;
			this.compositeMaterial.uniforms[ 'bloomStrength' ].value = strength;
			this.compositeMaterial.uniforms[ 'bloomRadius' ].value = 0.1;
			this.compositeMaterial.needsUpdate = true;
			const bloomFactors = [ 1.0, 0.8, 0.6, 0.4, 0.2 ];
			this.compositeMaterial.uniforms[ 'bloomFactors' ].value = bloomFactors;
			this.bloomTintColors = [ new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ) ];
			this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors;

			// copy material
			if ( THREE.CopyShader === undefined ) {

				console.error( 'THREE.UnrealBloomPass relies on THREE.CopyShader' );

			}

			const copyShader = THREE.CopyShader;
			this.copyUniforms = THREE.UniformsUtils.clone( copyShader.uniforms );
			this.copyUniforms[ 'opacity' ].value = 1.0;
			this.materialCopy = new THREE.ShaderMaterial( {
				uniforms: this.copyUniforms,
				vertexShader: copyShader.vertexShader,
				fragmentShader: copyShader.fragmentShader,
				blending: THREE.AdditiveBlending,
				depthTest: false,
				depthWrite: false,
				transparent: true
			} );
			this.enabled = true;
			this.needsSwap = false;
			this._oldClearColor = new THREE.Color();
			this.oldClearAlpha = 1;
			this.basic = new THREE.MeshBasicMaterial();
			this.fsQuad = new THREE.FullScreenQuad( null );

		}
		dispose() {

			for ( let i = 0; i < this.renderTargetsHorizontal.length; i ++ ) {

				this.renderTargetsHorizontal[ i ].dispose();

			}

			for ( let i = 0; i < this.renderTargetsVertical.length; i ++ ) {

				this.renderTargetsVertical[ i ].dispose();

			}

			this.renderTargetBright.dispose();

			//

			for ( let i = 0; i < this.separableBlurMaterials.length; i ++ ) {

				this.separableBlurMaterials[ i ].dispose();

			}

			this.compositeMaterial.dispose();
			this.materialCopy.dispose();
			this.basic.dispose();

			//

			this.fsQuad.dispose();

		}
		setSize( width, height ) {

			let resx = Math.round( width / 2 );
			let resy = Math.round( height / 2 );
			this.renderTargetBright.setSize( resx, resy );
			for ( let i = 0; i < this.nMips; i ++ ) {

				this.renderTargetsHorizontal[ i ].setSize( resx, resy );
				this.renderTargetsVertical[ i ].setSize( resx, resy );
				this.separableBlurMaterials[ i ].uniforms[ 'texSize' ].value = new THREE.Vector2( resx, resy );
				resx = Math.round( resx / 2 );
				resy = Math.round( resy / 2 );

			}

		}
		render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

			renderer.getClearColor( this._oldClearColor );
			this.oldClearAlpha = renderer.getClearAlpha();
			const oldAutoClear = renderer.autoClear;
			renderer.autoClear = false;
			renderer.setClearColor( this.clearColor, 0 );
			if ( maskActive ) renderer.state.buffers.stencil.setTest( false );

			// Render input to screen

			if ( this.renderToScreen ) {

				this.fsQuad.material = this.basic;
				this.basic.map = readBuffer.texture;
				renderer.setRenderTarget( null );
				renderer.clear();
				this.fsQuad.render( renderer );

			}

			// 1. Extract Bright Areas

			this.highPassUniforms[ 'tDiffuse' ].value = readBuffer.texture;
			this.highPassUniforms[ 'luminosityThreshold' ].value = this.threshold;
			this.fsQuad.material = this.materialHighPassFilter;
			renderer.setRenderTarget( this.renderTargetBright );
			renderer.clear();
			this.fsQuad.render( renderer );

			// 2. Blur All the mips progressively

			let inputRenderTarget = this.renderTargetBright;
			for ( let i = 0; i < this.nMips; i ++ ) {

				this.fsQuad.material = this.separableBlurMaterials[ i ];
				this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = inputRenderTarget.texture;
				this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = UnrealBloomPass.BlurDirectionX;
				renderer.setRenderTarget( this.renderTargetsHorizontal[ i ] );
				renderer.clear();
				this.fsQuad.render( renderer );
				this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = this.renderTargetsHorizontal[ i ].texture;
				this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = UnrealBloomPass.BlurDirectionY;
				renderer.setRenderTarget( this.renderTargetsVertical[ i ] );
				renderer.clear();
				this.fsQuad.render( renderer );
				inputRenderTarget = this.renderTargetsVertical[ i ];

			}

			// Composite All the mips

			this.fsQuad.material = this.compositeMaterial;
			this.compositeMaterial.uniforms[ 'bloomStrength' ].value = this.strength;
			this.compositeMaterial.uniforms[ 'bloomRadius' ].value = this.radius;
			this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors;
			renderer.setRenderTarget( this.renderTargetsHorizontal[ 0 ] );
			renderer.clear();
			this.fsQuad.render( renderer );

			// Blend it additively over the input texture

			this.fsQuad.material = this.materialCopy;
			this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetsHorizontal[ 0 ].texture;
			if ( maskActive ) renderer.state.buffers.stencil.setTest( true );
			if ( this.renderToScreen ) {

				renderer.setRenderTarget( null );
				this.fsQuad.render( renderer );

			} else {

				renderer.setRenderTarget( readBuffer );
				this.fsQuad.render( renderer );

			}

			// Restore renderer settings

			renderer.setClearColor( this._oldClearColor, this.oldClearAlpha );
			renderer.autoClear = oldAutoClear;

		}
		getSeperableBlurMaterial( kernelRadius ) {

			return new THREE.ShaderMaterial( {
				defines: {
					'KERNEL_RADIUS': kernelRadius,
					'SIGMA': kernelRadius
				},
				uniforms: {
					'colorTexture': {
						value: null
					},
					'texSize': {
						value: new THREE.Vector2( 0.5, 0.5 )
					},
					'direction': {
						value: new THREE.Vector2( 0.5, 0.5 )
					}
				},
				vertexShader: `varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
				fragmentShader: `#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}
				void main() {
					vec2 invSize = 1.0 / texSize;
					float fSigma = float(SIGMA);
					float weightSum = gaussianPdf(0.0, fSigma);
					vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianPdf(x, fSigma);
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`
			} );

		}
		getCompositeMaterial( nMips ) {

			return new THREE.ShaderMaterial( {
				defines: {
					'NUM_MIPS': nMips
				},
				uniforms: {
					'blurTexture1': {
						value: null
					},
					'blurTexture2': {
						value: null
					},
					'blurTexture3': {
						value: null
					},
					'blurTexture4': {
						value: null
					},
					'blurTexture5': {
						value: null
					},
					'bloomStrength': {
						value: 1.0
					},
					'bloomFactors': {
						value: null
					},
					'bloomTintColors': {
						value: null
					},
					'bloomRadius': {
						value: 0.0
					}
				},
				vertexShader: `varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
				fragmentShader: `varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`
			} );

		}

	}
	UnrealBloomPass.BlurDirectionX = new THREE.Vector2( 1.0, 0.0 );
	UnrealBloomPass.BlurDirectionY = new THREE.Vector2( 0.0, 1.0 );

	THREE.UnrealBloomPass = UnrealBloomPass;

} )();
( function () {

	/**
 * Luminosity
 * http://en.wikipedia.org/wiki/Luminosity
 */

	const LuminosityHighPassShader = {
		shaderID: 'luminosityHighPass',
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'luminosityThreshold': {
				value: 1.0
			},
			'smoothWidth': {
				value: 1.0
			},
			'defaultColor': {
				value: new THREE.Color( 0x000000 )
			},
			'defaultOpacity': {
				value: 0.0
			}
		},
		vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: /* glsl */`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`
	};

	THREE.LuminosityHighPassShader = LuminosityHighPassShader;

} )();
( function () {

	/**
 * Simple fake tilt-shift effect, modulating two pass Gaussian blur (see above) by vertical position
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 * - "r" parameter control where "focused" horizontal line lies
 */

	const HorizontalTiltShiftShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'h': {
				value: 1.0 / 512.0
			},
			'r': {
				value: 0.35
			}
		},
		vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: /* glsl */`

		uniform sampler2D tDiffuse;
		uniform float h;
		uniform float r;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			float hh = h * abs( r - vUv.y );

			sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * hh, vUv.y ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * hh, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * hh, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * hh, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * hh, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * hh, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * hh, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * hh, vUv.y ) ) * 0.051;

			gl_FragColor = sum;

		}`
	};

	THREE.HorizontalTiltShiftShader = HorizontalTiltShiftShader;

} )();
( function () {

	/**
 * Simple fake tilt-shift effect, modulating two pass Gaussian blur (see above) by vertical position
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 * - "r" parameter control where "focused" horizontal line lies
 */

	const VerticalTiltShiftShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'v': {
				value: 1.0 / 512.0
			},
			'r': {
				value: 0.35
			}
		},
		vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: /* glsl */`

		uniform sampler2D tDiffuse;
		uniform float v;
		uniform float r;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			float vv = v * abs( r - vUv.y );

			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * vv ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * vv ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * vv ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * vv ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * vv ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * vv ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * vv ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * vv ) ) * 0.051;

			gl_FragColor = sum;

		}`
	};

	THREE.VerticalTiltShiftShader = VerticalTiltShiftShader;

} )();
( function () {

	// https://github.com/mrdoob/three.js/issues/5552
	// http://en.wikipedia.org/wiki/RGBE_image_format

	class RGBELoader extends THREE.DataTextureLoader {

		constructor( manager ) {

			super( manager );
			this.type = THREE.HalfFloatType;

		}

		// adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html

		parse( buffer ) {

			const /* return codes for rgbe routines */
				//RGBE_RETURN_SUCCESS = 0,
				RGBE_RETURN_FAILURE = - 1,
				/* default error routine.  change this to change error handling */
				rgbe_read_error = 1,
				rgbe_write_error = 2,
				rgbe_format_error = 3,
				rgbe_memory_error = 4,
				rgbe_error = function ( rgbe_error_code, msg ) {

					switch ( rgbe_error_code ) {

						case rgbe_read_error:
							console.error( 'THREE.RGBELoader Read Error: ' + ( msg || '' ) );
							break;
						case rgbe_write_error:
							console.error( 'THREE.RGBELoader Write Error: ' + ( msg || '' ) );
							break;
						case rgbe_format_error:
							console.error( 'THREE.RGBELoader Bad File Format: ' + ( msg || '' ) );
							break;
						default:
						case rgbe_memory_error:
							console.error( 'THREE.RGBELoader: Error: ' + ( msg || '' ) );

					}

					return RGBE_RETURN_FAILURE;

				},
				/* offsets to red, green, and blue components in a data (float) pixel */
				//RGBE_DATA_RED = 0,
				//RGBE_DATA_GREEN = 1,
				//RGBE_DATA_BLUE = 2,

				/* number of floats per pixel, use 4 since stored in rgba image format */
				//RGBE_DATA_SIZE = 4,

				/* flags indicating which fields in an rgbe_header_info are valid */
				RGBE_VALID_PROGRAMTYPE = 1,
				RGBE_VALID_FORMAT = 2,
				RGBE_VALID_DIMENSIONS = 4,
				NEWLINE = '\n',
				fgets = function ( buffer, lineLimit, consume ) {

					const chunkSize = 128;
					lineLimit = ! lineLimit ? 1024 : lineLimit;
					let p = buffer.pos,
						i = - 1,
						len = 0,
						s = '',
						chunk = String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );
					while ( 0 > ( i = chunk.indexOf( NEWLINE ) ) && len < lineLimit && p < buffer.byteLength ) {

						s += chunk;
						len += chunk.length;
						p += chunkSize;
						chunk += String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

					}

					if ( - 1 < i ) {

						/*for (i=l-1; i>=0; i--) {
          	byteCode = m.charCodeAt(i);
          	if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
          	else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
          	if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
          }*/
						if ( false !== consume ) buffer.pos += len + i + 1;
						return s + chunk.slice( 0, i );

					}

					return false;

				},
				/* minimal header reading.  modify if you want to parse more information */
				RGBE_ReadHeader = function ( buffer ) {

					// regexes to parse header info fields
					const magic_token_re = /^#\?(\S+)/,
						gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
						exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
						format_re = /^\s*FORMAT=(\S+)\s*$/,
						dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,
						// RGBE format header struct
						header = {
							valid: 0,
							/* indicate which fields are valid */

							string: '',
							/* the actual header string */

							comments: '',
							/* comments found in header */

							programtype: 'RGBE',
							/* listed at beginning of file to identify it after "#?". defaults to "RGBE" */

							format: '',
							/* RGBE format, default 32-bit_rle_rgbe */

							gamma: 1.0,
							/* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */

							exposure: 1.0,
							/* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */

							width: 0,
							height: 0 /* image dimensions, width/height */
						};

					let line, match;
					if ( buffer.pos >= buffer.byteLength || ! ( line = fgets( buffer ) ) ) {

						return rgbe_error( rgbe_read_error, 'no header found' );

					}

					/* if you want to require the magic token then uncomment the next line */
					if ( ! ( match = line.match( magic_token_re ) ) ) {

						return rgbe_error( rgbe_format_error, 'bad initial token' );

					}

					header.valid |= RGBE_VALID_PROGRAMTYPE;
					header.programtype = match[ 1 ];
					header.string += line + '\n';
					while ( true ) {

						line = fgets( buffer );
						if ( false === line ) break;
						header.string += line + '\n';
						if ( '#' === line.charAt( 0 ) ) {

							header.comments += line + '\n';
							continue; // comment line

						}

						if ( match = line.match( gamma_re ) ) {

							header.gamma = parseFloat( match[ 1 ] );

						}

						if ( match = line.match( exposure_re ) ) {

							header.exposure = parseFloat( match[ 1 ] );

						}

						if ( match = line.match( format_re ) ) {

							header.valid |= RGBE_VALID_FORMAT;
							header.format = match[ 1 ]; //'32-bit_rle_rgbe';

						}

						if ( match = line.match( dimensions_re ) ) {

							header.valid |= RGBE_VALID_DIMENSIONS;
							header.height = parseInt( match[ 1 ], 10 );
							header.width = parseInt( match[ 2 ], 10 );

						}

						if ( header.valid & RGBE_VALID_FORMAT && header.valid & RGBE_VALID_DIMENSIONS ) break;

					}

					if ( ! ( header.valid & RGBE_VALID_FORMAT ) ) {

						return rgbe_error( rgbe_format_error, 'missing format specifier' );

					}

					if ( ! ( header.valid & RGBE_VALID_DIMENSIONS ) ) {

						return rgbe_error( rgbe_format_error, 'missing image size specifier' );

					}

					return header;

				},
				RGBE_ReadPixels_RLE = function ( buffer, w, h ) {

					const scanline_width = w;
					if (
					// run length encoding is not allowed so read flat
						scanline_width < 8 || scanline_width > 0x7fff ||
        // this file is not run length encoded
        2 !== buffer[ 0 ] || 2 !== buffer[ 1 ] || buffer[ 2 ] & 0x80 ) {

						// return the flat buffer
						return new Uint8Array( buffer );

					}

					if ( scanline_width !== ( buffer[ 2 ] << 8 | buffer[ 3 ] ) ) {

						return rgbe_error( rgbe_format_error, 'wrong scanline width' );

					}

					const data_rgba = new Uint8Array( 4 * w * h );
					if ( ! data_rgba.length ) {

						return rgbe_error( rgbe_memory_error, 'unable to allocate buffer space' );

					}

					let offset = 0,
						pos = 0;
					const ptr_end = 4 * scanline_width;
					const rgbeStart = new Uint8Array( 4 );
					const scanline_buffer = new Uint8Array( ptr_end );
					let num_scanlines = h;

					// read in each successive scanline
					while ( num_scanlines > 0 && pos < buffer.byteLength ) {

						if ( pos + 4 > buffer.byteLength ) {

							return rgbe_error( rgbe_read_error );

						}

						rgbeStart[ 0 ] = buffer[ pos ++ ];
						rgbeStart[ 1 ] = buffer[ pos ++ ];
						rgbeStart[ 2 ] = buffer[ pos ++ ];
						rgbeStart[ 3 ] = buffer[ pos ++ ];
						if ( 2 != rgbeStart[ 0 ] || 2 != rgbeStart[ 1 ] || ( rgbeStart[ 2 ] << 8 | rgbeStart[ 3 ] ) != scanline_width ) {

							return rgbe_error( rgbe_format_error, 'bad rgbe scanline format' );

						}

						// read each of the four channels for the scanline into the buffer
						// first red, then green, then blue, then exponent
						let ptr = 0,
							count;
						while ( ptr < ptr_end && pos < buffer.byteLength ) {

							count = buffer[ pos ++ ];
							const isEncodedRun = count > 128;
							if ( isEncodedRun ) count -= 128;
							if ( 0 === count || ptr + count > ptr_end ) {

								return rgbe_error( rgbe_format_error, 'bad scanline data' );

							}

							if ( isEncodedRun ) {

								// a (encoded) run of the same value
								const byteValue = buffer[ pos ++ ];
								for ( let i = 0; i < count; i ++ ) {

									scanline_buffer[ ptr ++ ] = byteValue;

								}
								//ptr += count;

							} else {

								// a literal-run
								scanline_buffer.set( buffer.subarray( pos, pos + count ), ptr );
								ptr += count;
								pos += count;

							}

						}

						// now convert data from buffer into rgba
						// first red, then green, then blue, then exponent (alpha)
						const l = scanline_width; //scanline_buffer.byteLength;
						for ( let i = 0; i < l; i ++ ) {

							let off = 0;
							data_rgba[ offset ] = scanline_buffer[ i + off ];
							off += scanline_width; //1;
							data_rgba[ offset + 1 ] = scanline_buffer[ i + off ];
							off += scanline_width; //1;
							data_rgba[ offset + 2 ] = scanline_buffer[ i + off ];
							off += scanline_width; //1;
							data_rgba[ offset + 3 ] = scanline_buffer[ i + off ];
							offset += 4;

						}

						num_scanlines --;

					}

					return data_rgba;

				};

			const RGBEByteToRGBFloat = function ( sourceArray, sourceOffset, destArray, destOffset ) {

				const e = sourceArray[ sourceOffset + 3 ];
				const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;
				destArray[ destOffset + 0 ] = sourceArray[ sourceOffset + 0 ] * scale;
				destArray[ destOffset + 1 ] = sourceArray[ sourceOffset + 1 ] * scale;
				destArray[ destOffset + 2 ] = sourceArray[ sourceOffset + 2 ] * scale;
				destArray[ destOffset + 3 ] = 1;

			};

			const RGBEByteToRGBHalf = function ( sourceArray, sourceOffset, destArray, destOffset ) {

				const e = sourceArray[ sourceOffset + 3 ];
				const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

				// clamping to 65504, the maximum representable value in float16
				destArray[ destOffset + 0 ] = THREE.DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 0 ] * scale, 65504 ) );
				destArray[ destOffset + 1 ] = THREE.DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 1 ] * scale, 65504 ) );
				destArray[ destOffset + 2 ] = THREE.DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 2 ] * scale, 65504 ) );
				destArray[ destOffset + 3 ] = THREE.DataUtils.toHalfFloat( 1 );

			};

			const byteArray = new Uint8Array( buffer );
			byteArray.pos = 0;
			const rgbe_header_info = RGBE_ReadHeader( byteArray );
			if ( RGBE_RETURN_FAILURE !== rgbe_header_info ) {

				const w = rgbe_header_info.width,
					h = rgbe_header_info.height,
					image_rgba_data = RGBE_ReadPixels_RLE( byteArray.subarray( byteArray.pos ), w, h );
				if ( RGBE_RETURN_FAILURE !== image_rgba_data ) {

					let data, type;
					let numElements;
					switch ( this.type ) {

						case THREE.FloatType:
							numElements = image_rgba_data.length / 4;
							const floatArray = new Float32Array( numElements * 4 );
							for ( let j = 0; j < numElements; j ++ ) {

								RGBEByteToRGBFloat( image_rgba_data, j * 4, floatArray, j * 4 );

							}

							data = floatArray;
							type = THREE.FloatType;
							break;
						case THREE.HalfFloatType:
							numElements = image_rgba_data.length / 4;
							const halfArray = new Uint16Array( numElements * 4 );
							for ( let j = 0; j < numElements; j ++ ) {

								RGBEByteToRGBHalf( image_rgba_data, j * 4, halfArray, j * 4 );

							}

							data = halfArray;
							type = THREE.HalfFloatType;
							break;
						default:
							console.error( 'THREE.RGBELoader: unsupported type: ', this.type );
							break;

					}

					return {
						width: w,
						height: h,
						data: data,
						header: rgbe_header_info.string,
						gamma: rgbe_header_info.gamma,
						exposure: rgbe_header_info.exposure,
						type: type
					};

				}

			}

			return null;

		}
		setDataType( value ) {

			this.type = value;
			return this;

		}
		load( url, onLoad, onProgress, onError ) {

			function onLoadCallback( texture, texData ) {

				switch ( texture.type ) {

					case THREE.FloatType:
					case THREE.HalfFloatType:
						texture.encoding = THREE.LinearEncoding;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						texture.generateMipmaps = false;
						texture.flipY = true;
						break;

				}

				if ( onLoad ) onLoad( texture, texData );

			}

			return super.load( url, onLoadCallback, onProgress, onError );

		}

	}

	THREE.RGBELoader = RGBELoader;

} )();
( function () {

	/**
 * OpenEXR loader currently supports uncompressed, ZIP(S), RLE, PIZ and DWA/B compression.
 * Supports reading as UnsignedByte, HalfFloat and Float type data texture.
 *
 * Referred to the original Industrial Light & Magic OpenEXR implementation and the TinyEXR / Syoyo Fujita
 * implementation, so I have preserved their copyright notices.
 */

	// /*
	// Copyright (c) 2014 - 2017, Syoyo Fujita
	// All rights reserved.

	// Redistribution and use in source and binary forms, with or without
	// modification, are permitted provided that the following conditions are met:
	//     * Redistributions of source code must retain the above copyright
	//       notice, this list of conditions and the following disclaimer.
	//     * Redistributions in binary form must reproduce the above copyright
	//       notice, this list of conditions and the following disclaimer in the
	//       documentation and/or other materials provided with the distribution.
	//     * Neither the name of the Syoyo Fujita nor the
	//       names of its contributors may be used to endorse or promote products
	//       derived from this software without specific prior written permission.

	// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	// DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
	// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
	// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	// */

	// // TinyEXR contains some OpenEXR code, which is licensed under ------------

	// ///////////////////////////////////////////////////////////////////////////
	// //
	// // Copyright (c) 2002, Industrial Light & Magic, a division of Lucas
	// // Digital Ltd. LLC
	// //
	// // All rights reserved.
	// //
	// // Redistribution and use in source and binary forms, with or without
	// // modification, are permitted provided that the following conditions are
	// // met:
	// // *       Redistributions of source code must retain the above copyright
	// // notice, this list of conditions and the following disclaimer.
	// // *       Redistributions in binary form must reproduce the above
	// // copyright notice, this list of conditions and the following disclaimer
	// // in the documentation and/or other materials provided with the
	// // distribution.
	// // *       Neither the name of Industrial Light & Magic nor the names of
	// // its contributors may be used to endorse or promote products derived
	// // from this software without specific prior written permission.
	// //
	// // THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	// // "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	// // LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	// // A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	// // OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	// // SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	// // LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	// // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	// // THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	// // (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	// // OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	// //
	// ///////////////////////////////////////////////////////////////////////////

	// // End of OpenEXR license -------------------------------------------------

	class EXRLoader extends THREE.DataTextureLoader {

		constructor( manager ) {

			super( manager );
			this.type = THREE.HalfFloatType;

		}
		parse( buffer ) {

			const USHORT_RANGE = 1 << 16;
			const BITMAP_SIZE = USHORT_RANGE >> 3;
			const HUF_ENCBITS = 16; // literal (value) bit length
			const HUF_DECBITS = 14; // decoding bit size (>= 8)

			const HUF_ENCSIZE = ( 1 << HUF_ENCBITS ) + 1; // encoding table size
			const HUF_DECSIZE = 1 << HUF_DECBITS; // decoding table size
			const HUF_DECMASK = HUF_DECSIZE - 1;
			const NBITS = 16;
			const A_OFFSET = 1 << NBITS - 1;
			const MOD_MASK = ( 1 << NBITS ) - 1;
			const SHORT_ZEROCODE_RUN = 59;
			const LONG_ZEROCODE_RUN = 63;
			const SHORTEST_LONG_RUN = 2 + LONG_ZEROCODE_RUN - SHORT_ZEROCODE_RUN;
			const ULONG_SIZE = 8;
			const FLOAT32_SIZE = 4;
			const INT32_SIZE = 4;
			const INT16_SIZE = 2;
			const INT8_SIZE = 1;
			const STATIC_HUFFMAN = 0;
			const DEFLATE = 1;
			const UNKNOWN = 0;
			const LOSSY_DCT = 1;
			const RLE = 2;
			const logBase = Math.pow( 2.7182818, 2.2 );
			function reverseLutFromBitmap( bitmap, lut ) {

				let k = 0;
				for ( let i = 0; i < USHORT_RANGE; ++ i ) {

					if ( i == 0 || bitmap[ i >> 3 ] & 1 << ( i & 7 ) ) {

						lut[ k ++ ] = i;

					}

				}

				const n = k - 1;
				while ( k < USHORT_RANGE ) lut[ k ++ ] = 0;
				return n;

			}

			function hufClearDecTable( hdec ) {

				for ( let i = 0; i < HUF_DECSIZE; i ++ ) {

					hdec[ i ] = {};
					hdec[ i ].len = 0;
					hdec[ i ].lit = 0;
					hdec[ i ].p = null;

				}

			}

			const getBitsReturn = {
				l: 0,
				c: 0,
				lc: 0
			};
			function getBits( nBits, c, lc, uInt8Array, inOffset ) {

				while ( lc < nBits ) {

					c = c << 8 | parseUint8Array( uInt8Array, inOffset );
					lc += 8;

				}

				lc -= nBits;
				getBitsReturn.l = c >> lc & ( 1 << nBits ) - 1;
				getBitsReturn.c = c;
				getBitsReturn.lc = lc;

			}

			const hufTableBuffer = new Array( 59 );
			function hufCanonicalCodeTable( hcode ) {

				for ( let i = 0; i <= 58; ++ i ) hufTableBuffer[ i ] = 0;
				for ( let i = 0; i < HUF_ENCSIZE; ++ i ) hufTableBuffer[ hcode[ i ] ] += 1;
				let c = 0;
				for ( let i = 58; i > 0; -- i ) {

					const nc = c + hufTableBuffer[ i ] >> 1;
					hufTableBuffer[ i ] = c;
					c = nc;

				}

				for ( let i = 0; i < HUF_ENCSIZE; ++ i ) {

					const l = hcode[ i ];
					if ( l > 0 ) hcode[ i ] = l | hufTableBuffer[ l ] ++ << 6;

				}

			}

			function hufUnpackEncTable( uInt8Array, inOffset, ni, im, iM, hcode ) {

				const p = inOffset;
				let c = 0;
				let lc = 0;
				for ( ; im <= iM; im ++ ) {

					if ( p.value - inOffset.value > ni ) return false;
					getBits( 6, c, lc, uInt8Array, p );
					const l = getBitsReturn.l;
					c = getBitsReturn.c;
					lc = getBitsReturn.lc;
					hcode[ im ] = l;
					if ( l == LONG_ZEROCODE_RUN ) {

						if ( p.value - inOffset.value > ni ) {

							throw new Error( 'Something wrong with hufUnpackEncTable' );

						}

						getBits( 8, c, lc, uInt8Array, p );
						let zerun = getBitsReturn.l + SHORTEST_LONG_RUN;
						c = getBitsReturn.c;
						lc = getBitsReturn.lc;
						if ( im + zerun > iM + 1 ) {

							throw new Error( 'Something wrong with hufUnpackEncTable' );

						}

						while ( zerun -- ) hcode[ im ++ ] = 0;
						im --;

					} else if ( l >= SHORT_ZEROCODE_RUN ) {

						let zerun = l - SHORT_ZEROCODE_RUN + 2;
						if ( im + zerun > iM + 1 ) {

							throw new Error( 'Something wrong with hufUnpackEncTable' );

						}

						while ( zerun -- ) hcode[ im ++ ] = 0;
						im --;

					}

				}

				hufCanonicalCodeTable( hcode );

			}

			function hufLength( code ) {

				return code & 63;

			}

			function hufCode( code ) {

				return code >> 6;

			}

			function hufBuildDecTable( hcode, im, iM, hdecod ) {

				for ( ; im <= iM; im ++ ) {

					const c = hufCode( hcode[ im ] );
					const l = hufLength( hcode[ im ] );
					if ( c >> l ) {

						throw new Error( 'Invalid table entry' );

					}

					if ( l > HUF_DECBITS ) {

						const pl = hdecod[ c >> l - HUF_DECBITS ];
						if ( pl.len ) {

							throw new Error( 'Invalid table entry' );

						}

						pl.lit ++;
						if ( pl.p ) {

							const p = pl.p;
							pl.p = new Array( pl.lit );
							for ( let i = 0; i < pl.lit - 1; ++ i ) {

								pl.p[ i ] = p[ i ];

							}

						} else {

							pl.p = new Array( 1 );

						}

						pl.p[ pl.lit - 1 ] = im;

					} else if ( l ) {

						let plOffset = 0;
						for ( let i = 1 << HUF_DECBITS - l; i > 0; i -- ) {

							const pl = hdecod[ ( c << HUF_DECBITS - l ) + plOffset ];
							if ( pl.len || pl.p ) {

								throw new Error( 'Invalid table entry' );

							}

							pl.len = l;
							pl.lit = im;
							plOffset ++;

						}

					}

				}

				return true;

			}

			const getCharReturn = {
				c: 0,
				lc: 0
			};
			function getChar( c, lc, uInt8Array, inOffset ) {

				c = c << 8 | parseUint8Array( uInt8Array, inOffset );
				lc += 8;
				getCharReturn.c = c;
				getCharReturn.lc = lc;

			}

			const getCodeReturn = {
				c: 0,
				lc: 0
			};
			function getCode( po, rlc, c, lc, uInt8Array, inOffset, outBuffer, outBufferOffset, outBufferEndOffset ) {

				if ( po == rlc ) {

					if ( lc < 8 ) {

						getChar( c, lc, uInt8Array, inOffset );
						c = getCharReturn.c;
						lc = getCharReturn.lc;

					}

					lc -= 8;
					let cs = c >> lc;
					cs = new Uint8Array( [ cs ] )[ 0 ];
					if ( outBufferOffset.value + cs > outBufferEndOffset ) {

						return false;

					}

					const s = outBuffer[ outBufferOffset.value - 1 ];
					while ( cs -- > 0 ) {

						outBuffer[ outBufferOffset.value ++ ] = s;

					}

				} else if ( outBufferOffset.value < outBufferEndOffset ) {

					outBuffer[ outBufferOffset.value ++ ] = po;

				} else {

					return false;

				}

				getCodeReturn.c = c;
				getCodeReturn.lc = lc;

			}

			function UInt16( value ) {

				return value & 0xFFFF;

			}

			function Int16( value ) {

				const ref = UInt16( value );
				return ref > 0x7FFF ? ref - 0x10000 : ref;

			}

			const wdec14Return = {
				a: 0,
				b: 0
			};
			function wdec14( l, h ) {

				const ls = Int16( l );
				const hs = Int16( h );
				const hi = hs;
				const ai = ls + ( hi & 1 ) + ( hi >> 1 );
				const as = ai;
				const bs = ai - hi;
				wdec14Return.a = as;
				wdec14Return.b = bs;

			}

			function wdec16( l, h ) {

				const m = UInt16( l );
				const d = UInt16( h );
				const bb = m - ( d >> 1 ) & MOD_MASK;
				const aa = d + bb - A_OFFSET & MOD_MASK;
				wdec14Return.a = aa;
				wdec14Return.b = bb;

			}

			function wav2Decode( buffer, j, nx, ox, ny, oy, mx ) {

				const w14 = mx < 1 << 14;
				const n = nx > ny ? ny : nx;
				let p = 1;
				let p2;
				let py;
				while ( p <= n ) p <<= 1;
				p >>= 1;
				p2 = p;
				p >>= 1;
				while ( p >= 1 ) {

					py = 0;
					const ey = py + oy * ( ny - p2 );
					const oy1 = oy * p;
					const oy2 = oy * p2;
					const ox1 = ox * p;
					const ox2 = ox * p2;
					let i00, i01, i10, i11;
					for ( ; py <= ey; py += oy2 ) {

						let px = py;
						const ex = py + ox * ( nx - p2 );
						for ( ; px <= ex; px += ox2 ) {

							const p01 = px + ox1;
							const p10 = px + oy1;
							const p11 = p10 + ox1;
							if ( w14 ) {

								wdec14( buffer[ px + j ], buffer[ p10 + j ] );
								i00 = wdec14Return.a;
								i10 = wdec14Return.b;
								wdec14( buffer[ p01 + j ], buffer[ p11 + j ] );
								i01 = wdec14Return.a;
								i11 = wdec14Return.b;
								wdec14( i00, i01 );
								buffer[ px + j ] = wdec14Return.a;
								buffer[ p01 + j ] = wdec14Return.b;
								wdec14( i10, i11 );
								buffer[ p10 + j ] = wdec14Return.a;
								buffer[ p11 + j ] = wdec14Return.b;

							} else {

								wdec16( buffer[ px + j ], buffer[ p10 + j ] );
								i00 = wdec14Return.a;
								i10 = wdec14Return.b;
								wdec16( buffer[ p01 + j ], buffer[ p11 + j ] );
								i01 = wdec14Return.a;
								i11 = wdec14Return.b;
								wdec16( i00, i01 );
								buffer[ px + j ] = wdec14Return.a;
								buffer[ p01 + j ] = wdec14Return.b;
								wdec16( i10, i11 );
								buffer[ p10 + j ] = wdec14Return.a;
								buffer[ p11 + j ] = wdec14Return.b;

							}

						}

						if ( nx & p ) {

							const p10 = px + oy1;
							if ( w14 ) wdec14( buffer[ px + j ], buffer[ p10 + j ] ); else wdec16( buffer[ px + j ], buffer[ p10 + j ] );
							i00 = wdec14Return.a;
							buffer[ p10 + j ] = wdec14Return.b;
							buffer[ px + j ] = i00;

						}

					}

					if ( ny & p ) {

						let px = py;
						const ex = py + ox * ( nx - p2 );
						for ( ; px <= ex; px += ox2 ) {

							const p01 = px + ox1;
							if ( w14 ) wdec14( buffer[ px + j ], buffer[ p01 + j ] ); else wdec16( buffer[ px + j ], buffer[ p01 + j ] );
							i00 = wdec14Return.a;
							buffer[ p01 + j ] = wdec14Return.b;
							buffer[ px + j ] = i00;

						}

					}

					p2 = p;
					p >>= 1;

				}

				return py;

			}

			function hufDecode( encodingTable, decodingTable, uInt8Array, inOffset, ni, rlc, no, outBuffer, outOffset ) {

				let c = 0;
				let lc = 0;
				const outBufferEndOffset = no;
				const inOffsetEnd = Math.trunc( inOffset.value + ( ni + 7 ) / 8 );
				while ( inOffset.value < inOffsetEnd ) {

					getChar( c, lc, uInt8Array, inOffset );
					c = getCharReturn.c;
					lc = getCharReturn.lc;
					while ( lc >= HUF_DECBITS ) {

						const index = c >> lc - HUF_DECBITS & HUF_DECMASK;
						const pl = decodingTable[ index ];
						if ( pl.len ) {

							lc -= pl.len;
							getCode( pl.lit, rlc, c, lc, uInt8Array, inOffset, outBuffer, outOffset, outBufferEndOffset );
							c = getCodeReturn.c;
							lc = getCodeReturn.lc;

						} else {

							if ( ! pl.p ) {

								throw new Error( 'hufDecode issues' );

							}

							let j;
							for ( j = 0; j < pl.lit; j ++ ) {

								const l = hufLength( encodingTable[ pl.p[ j ] ] );
								while ( lc < l && inOffset.value < inOffsetEnd ) {

									getChar( c, lc, uInt8Array, inOffset );
									c = getCharReturn.c;
									lc = getCharReturn.lc;

								}

								if ( lc >= l ) {

									if ( hufCode( encodingTable[ pl.p[ j ] ] ) == ( c >> lc - l & ( 1 << l ) - 1 ) ) {

										lc -= l;
										getCode( pl.p[ j ], rlc, c, lc, uInt8Array, inOffset, outBuffer, outOffset, outBufferEndOffset );
										c = getCodeReturn.c;
										lc = getCodeReturn.lc;
										break;

									}

								}

							}

							if ( j == pl.lit ) {

								throw new Error( 'hufDecode issues' );

							}

						}

					}

				}

				const i = 8 - ni & 7;
				c >>= i;
				lc -= i;
				while ( lc > 0 ) {

					const pl = decodingTable[ c << HUF_DECBITS - lc & HUF_DECMASK ];
					if ( pl.len ) {

						lc -= pl.len;
						getCode( pl.lit, rlc, c, lc, uInt8Array, inOffset, outBuffer, outOffset, outBufferEndOffset );
						c = getCodeReturn.c;
						lc = getCodeReturn.lc;

					} else {

						throw new Error( 'hufDecode issues' );

					}

				}

				return true;

			}

			function hufUncompress( uInt8Array, inDataView, inOffset, nCompressed, outBuffer, nRaw ) {

				const outOffset = {
					value: 0
				};
				const initialInOffset = inOffset.value;
				const im = parseUint32( inDataView, inOffset );
				const iM = parseUint32( inDataView, inOffset );
				inOffset.value += 4;
				const nBits = parseUint32( inDataView, inOffset );
				inOffset.value += 4;
				if ( im < 0 || im >= HUF_ENCSIZE || iM < 0 || iM >= HUF_ENCSIZE ) {

					throw new Error( 'Something wrong with HUF_ENCSIZE' );

				}

				const freq = new Array( HUF_ENCSIZE );
				const hdec = new Array( HUF_DECSIZE );
				hufClearDecTable( hdec );
				const ni = nCompressed - ( inOffset.value - initialInOffset );
				hufUnpackEncTable( uInt8Array, inOffset, ni, im, iM, freq );
				if ( nBits > 8 * ( nCompressed - ( inOffset.value - initialInOffset ) ) ) {

					throw new Error( 'Something wrong with hufUncompress' );

				}

				hufBuildDecTable( freq, im, iM, hdec );
				hufDecode( freq, hdec, uInt8Array, inOffset, nBits, iM, nRaw, outBuffer, outOffset );

			}

			function applyLut( lut, data, nData ) {

				for ( let i = 0; i < nData; ++ i ) {

					data[ i ] = lut[ data[ i ] ];

				}

			}

			function predictor( source ) {

				for ( let t = 1; t < source.length; t ++ ) {

					const d = source[ t - 1 ] + source[ t ] - 128;
					source[ t ] = d;

				}

			}

			function interleaveScalar( source, out ) {

				let t1 = 0;
				let t2 = Math.floor( ( source.length + 1 ) / 2 );
				let s = 0;
				const stop = source.length - 1;
				while ( true ) {

					if ( s > stop ) break;
					out[ s ++ ] = source[ t1 ++ ];
					if ( s > stop ) break;
					out[ s ++ ] = source[ t2 ++ ];

				}

			}

			function decodeRunLength( source ) {

				let size = source.byteLength;
				const out = new Array();
				let p = 0;
				const reader = new DataView( source );
				while ( size > 0 ) {

					const l = reader.getInt8( p ++ );
					if ( l < 0 ) {

						const count = - l;
						size -= count + 1;
						for ( let i = 0; i < count; i ++ ) {

							out.push( reader.getUint8( p ++ ) );

						}

					} else {

						const count = l;
						size -= 2;
						const value = reader.getUint8( p ++ );
						for ( let i = 0; i < count + 1; i ++ ) {

							out.push( value );

						}

					}

				}

				return out;

			}

			function lossyDctDecode( cscSet, rowPtrs, channelData, acBuffer, dcBuffer, outBuffer ) {

				let dataView = new DataView( outBuffer.buffer );
				const width = channelData[ cscSet.idx[ 0 ] ].width;
				const height = channelData[ cscSet.idx[ 0 ] ].height;
				const numComp = 3;
				const numFullBlocksX = Math.floor( width / 8.0 );
				const numBlocksX = Math.ceil( width / 8.0 );
				const numBlocksY = Math.ceil( height / 8.0 );
				const leftoverX = width - ( numBlocksX - 1 ) * 8;
				const leftoverY = height - ( numBlocksY - 1 ) * 8;
				const currAcComp = {
					value: 0
				};
				const currDcComp = new Array( numComp );
				const dctData = new Array( numComp );
				const halfZigBlock = new Array( numComp );
				const rowBlock = new Array( numComp );
				const rowOffsets = new Array( numComp );
				for ( let comp = 0; comp < numComp; ++ comp ) {

					rowOffsets[ comp ] = rowPtrs[ cscSet.idx[ comp ] ];
					currDcComp[ comp ] = comp < 1 ? 0 : currDcComp[ comp - 1 ] + numBlocksX * numBlocksY;
					dctData[ comp ] = new Float32Array( 64 );
					halfZigBlock[ comp ] = new Uint16Array( 64 );
					rowBlock[ comp ] = new Uint16Array( numBlocksX * 64 );

				}

				for ( let blocky = 0; blocky < numBlocksY; ++ blocky ) {

					let maxY = 8;
					if ( blocky == numBlocksY - 1 ) maxY = leftoverY;
					let maxX = 8;
					for ( let blockx = 0; blockx < numBlocksX; ++ blockx ) {

						if ( blockx == numBlocksX - 1 ) maxX = leftoverX;
						for ( let comp = 0; comp < numComp; ++ comp ) {

							halfZigBlock[ comp ].fill( 0 );

							// set block DC component
							halfZigBlock[ comp ][ 0 ] = dcBuffer[ currDcComp[ comp ] ++ ];
							// set block AC components
							unRleAC( currAcComp, acBuffer, halfZigBlock[ comp ] );

							// UnZigZag block to float
							unZigZag( halfZigBlock[ comp ], dctData[ comp ] );
							// decode float dct
							dctInverse( dctData[ comp ] );

						}

						if ( numComp == 3 ) {

							csc709Inverse( dctData );

						}

						for ( let comp = 0; comp < numComp; ++ comp ) {

							convertToHalf( dctData[ comp ], rowBlock[ comp ], blockx * 64 );

						}

					} // blockx

					let offset = 0;
					for ( let comp = 0; comp < numComp; ++ comp ) {

						const type = channelData[ cscSet.idx[ comp ] ].type;
						for ( let y = 8 * blocky; y < 8 * blocky + maxY; ++ y ) {

							offset = rowOffsets[ comp ][ y ];
							for ( let blockx = 0; blockx < numFullBlocksX; ++ blockx ) {

								const src = blockx * 64 + ( y & 0x7 ) * 8;
								dataView.setUint16( offset + 0 * INT16_SIZE * type, rowBlock[ comp ][ src + 0 ], true );
								dataView.setUint16( offset + 1 * INT16_SIZE * type, rowBlock[ comp ][ src + 1 ], true );
								dataView.setUint16( offset + 2 * INT16_SIZE * type, rowBlock[ comp ][ src + 2 ], true );
								dataView.setUint16( offset + 3 * INT16_SIZE * type, rowBlock[ comp ][ src + 3 ], true );
								dataView.setUint16( offset + 4 * INT16_SIZE * type, rowBlock[ comp ][ src + 4 ], true );
								dataView.setUint16( offset + 5 * INT16_SIZE * type, rowBlock[ comp ][ src + 5 ], true );
								dataView.setUint16( offset + 6 * INT16_SIZE * type, rowBlock[ comp ][ src + 6 ], true );
								dataView.setUint16( offset + 7 * INT16_SIZE * type, rowBlock[ comp ][ src + 7 ], true );
								offset += 8 * INT16_SIZE * type;

							}

						}

						// handle partial X blocks
						if ( numFullBlocksX != numBlocksX ) {

							for ( let y = 8 * blocky; y < 8 * blocky + maxY; ++ y ) {

								const offset = rowOffsets[ comp ][ y ] + 8 * numFullBlocksX * INT16_SIZE * type;
								const src = numFullBlocksX * 64 + ( y & 0x7 ) * 8;
								for ( let x = 0; x < maxX; ++ x ) {

									dataView.setUint16( offset + x * INT16_SIZE * type, rowBlock[ comp ][ src + x ], true );

								}

							}

						}

					} // comp

				} // blocky

				const halfRow = new Uint16Array( width );
				dataView = new DataView( outBuffer.buffer );

				// convert channels back to float, if needed
				for ( let comp = 0; comp < numComp; ++ comp ) {

					channelData[ cscSet.idx[ comp ] ].decoded = true;
					const type = channelData[ cscSet.idx[ comp ] ].type;
					if ( channelData[ comp ].type != 2 ) continue;
					for ( let y = 0; y < height; ++ y ) {

						const offset = rowOffsets[ comp ][ y ];
						for ( let x = 0; x < width; ++ x ) {

							halfRow[ x ] = dataView.getUint16( offset + x * INT16_SIZE * type, true );

						}

						for ( let x = 0; x < width; ++ x ) {

							dataView.setFloat32( offset + x * INT16_SIZE * type, decodeFloat16( halfRow[ x ] ), true );

						}

					}

				}

			}

			function unRleAC( currAcComp, acBuffer, halfZigBlock ) {

				let acValue;
				let dctComp = 1;
				while ( dctComp < 64 ) {

					acValue = acBuffer[ currAcComp.value ];
					if ( acValue == 0xff00 ) {

						dctComp = 64;

					} else if ( acValue >> 8 == 0xff ) {

						dctComp += acValue & 0xff;

					} else {

						halfZigBlock[ dctComp ] = acValue;
						dctComp ++;

					}

					currAcComp.value ++;

				}

			}

			function unZigZag( src, dst ) {

				dst[ 0 ] = decodeFloat16( src[ 0 ] );
				dst[ 1 ] = decodeFloat16( src[ 1 ] );
				dst[ 2 ] = decodeFloat16( src[ 5 ] );
				dst[ 3 ] = decodeFloat16( src[ 6 ] );
				dst[ 4 ] = decodeFloat16( src[ 14 ] );
				dst[ 5 ] = decodeFloat16( src[ 15 ] );
				dst[ 6 ] = decodeFloat16( src[ 27 ] );
				dst[ 7 ] = decodeFloat16( src[ 28 ] );
				dst[ 8 ] = decodeFloat16( src[ 2 ] );
				dst[ 9 ] = decodeFloat16( src[ 4 ] );
				dst[ 10 ] = decodeFloat16( src[ 7 ] );
				dst[ 11 ] = decodeFloat16( src[ 13 ] );
				dst[ 12 ] = decodeFloat16( src[ 16 ] );
				dst[ 13 ] = decodeFloat16( src[ 26 ] );
				dst[ 14 ] = decodeFloat16( src[ 29 ] );
				dst[ 15 ] = decodeFloat16( src[ 42 ] );
				dst[ 16 ] = decodeFloat16( src[ 3 ] );
				dst[ 17 ] = decodeFloat16( src[ 8 ] );
				dst[ 18 ] = decodeFloat16( src[ 12 ] );
				dst[ 19 ] = decodeFloat16( src[ 17 ] );
				dst[ 20 ] = decodeFloat16( src[ 25 ] );
				dst[ 21 ] = decodeFloat16( src[ 30 ] );
				dst[ 22 ] = decodeFloat16( src[ 41 ] );
				dst[ 23 ] = decodeFloat16( src[ 43 ] );
				dst[ 24 ] = decodeFloat16( src[ 9 ] );
				dst[ 25 ] = decodeFloat16( src[ 11 ] );
				dst[ 26 ] = decodeFloat16( src[ 18 ] );
				dst[ 27 ] = decodeFloat16( src[ 24 ] );
				dst[ 28 ] = decodeFloat16( src[ 31 ] );
				dst[ 29 ] = decodeFloat16( src[ 40 ] );
				dst[ 30 ] = decodeFloat16( src[ 44 ] );
				dst[ 31 ] = decodeFloat16( src[ 53 ] );
				dst[ 32 ] = decodeFloat16( src[ 10 ] );
				dst[ 33 ] = decodeFloat16( src[ 19 ] );
				dst[ 34 ] = decodeFloat16( src[ 23 ] );
				dst[ 35 ] = decodeFloat16( src[ 32 ] );
				dst[ 36 ] = decodeFloat16( src[ 39 ] );
				dst[ 37 ] = decodeFloat16( src[ 45 ] );
				dst[ 38 ] = decodeFloat16( src[ 52 ] );
				dst[ 39 ] = decodeFloat16( src[ 54 ] );
				dst[ 40 ] = decodeFloat16( src[ 20 ] );
				dst[ 41 ] = decodeFloat16( src[ 22 ] );
				dst[ 42 ] = decodeFloat16( src[ 33 ] );
				dst[ 43 ] = decodeFloat16( src[ 38 ] );
				dst[ 44 ] = decodeFloat16( src[ 46 ] );
				dst[ 45 ] = decodeFloat16( src[ 51 ] );
				dst[ 46 ] = decodeFloat16( src[ 55 ] );
				dst[ 47 ] = decodeFloat16( src[ 60 ] );
				dst[ 48 ] = decodeFloat16( src[ 21 ] );
				dst[ 49 ] = decodeFloat16( src[ 34 ] );
				dst[ 50 ] = decodeFloat16( src[ 37 ] );
				dst[ 51 ] = decodeFloat16( src[ 47 ] );
				dst[ 52 ] = decodeFloat16( src[ 50 ] );
				dst[ 53 ] = decodeFloat16( src[ 56 ] );
				dst[ 54 ] = decodeFloat16( src[ 59 ] );
				dst[ 55 ] = decodeFloat16( src[ 61 ] );
				dst[ 56 ] = decodeFloat16( src[ 35 ] );
				dst[ 57 ] = decodeFloat16( src[ 36 ] );
				dst[ 58 ] = decodeFloat16( src[ 48 ] );
				dst[ 59 ] = decodeFloat16( src[ 49 ] );
				dst[ 60 ] = decodeFloat16( src[ 57 ] );
				dst[ 61 ] = decodeFloat16( src[ 58 ] );
				dst[ 62 ] = decodeFloat16( src[ 62 ] );
				dst[ 63 ] = decodeFloat16( src[ 63 ] );

			}

			function dctInverse( data ) {

				const a = 0.5 * Math.cos( 3.14159 / 4.0 );
				const b = 0.5 * Math.cos( 3.14159 / 16.0 );
				const c = 0.5 * Math.cos( 3.14159 / 8.0 );
				const d = 0.5 * Math.cos( 3.0 * 3.14159 / 16.0 );
				const e = 0.5 * Math.cos( 5.0 * 3.14159 / 16.0 );
				const f = 0.5 * Math.cos( 3.0 * 3.14159 / 8.0 );
				const g = 0.5 * Math.cos( 7.0 * 3.14159 / 16.0 );
				const alpha = new Array( 4 );
				const beta = new Array( 4 );
				const theta = new Array( 4 );
				const gamma = new Array( 4 );
				for ( let row = 0; row < 8; ++ row ) {

					const rowPtr = row * 8;
					alpha[ 0 ] = c * data[ rowPtr + 2 ];
					alpha[ 1 ] = f * data[ rowPtr + 2 ];
					alpha[ 2 ] = c * data[ rowPtr + 6 ];
					alpha[ 3 ] = f * data[ rowPtr + 6 ];
					beta[ 0 ] = b * data[ rowPtr + 1 ] + d * data[ rowPtr + 3 ] + e * data[ rowPtr + 5 ] + g * data[ rowPtr + 7 ];
					beta[ 1 ] = d * data[ rowPtr + 1 ] - g * data[ rowPtr + 3 ] - b * data[ rowPtr + 5 ] - e * data[ rowPtr + 7 ];
					beta[ 2 ] = e * data[ rowPtr + 1 ] - b * data[ rowPtr + 3 ] + g * data[ rowPtr + 5 ] + d * data[ rowPtr + 7 ];
					beta[ 3 ] = g * data[ rowPtr + 1 ] - e * data[ rowPtr + 3 ] + d * data[ rowPtr + 5 ] - b * data[ rowPtr + 7 ];
					theta[ 0 ] = a * ( data[ rowPtr + 0 ] + data[ rowPtr + 4 ] );
					theta[ 3 ] = a * ( data[ rowPtr + 0 ] - data[ rowPtr + 4 ] );
					theta[ 1 ] = alpha[ 0 ] + alpha[ 3 ];
					theta[ 2 ] = alpha[ 1 ] - alpha[ 2 ];
					gamma[ 0 ] = theta[ 0 ] + theta[ 1 ];
					gamma[ 1 ] = theta[ 3 ] + theta[ 2 ];
					gamma[ 2 ] = theta[ 3 ] - theta[ 2 ];
					gamma[ 3 ] = theta[ 0 ] - theta[ 1 ];
					data[ rowPtr + 0 ] = gamma[ 0 ] + beta[ 0 ];
					data[ rowPtr + 1 ] = gamma[ 1 ] + beta[ 1 ];
					data[ rowPtr + 2 ] = gamma[ 2 ] + beta[ 2 ];
					data[ rowPtr + 3 ] = gamma[ 3 ] + beta[ 3 ];
					data[ rowPtr + 4 ] = gamma[ 3 ] - beta[ 3 ];
					data[ rowPtr + 5 ] = gamma[ 2 ] - beta[ 2 ];
					data[ rowPtr + 6 ] = gamma[ 1 ] - beta[ 1 ];
					data[ rowPtr + 7 ] = gamma[ 0 ] - beta[ 0 ];

				}

				for ( let column = 0; column < 8; ++ column ) {

					alpha[ 0 ] = c * data[ 16 + column ];
					alpha[ 1 ] = f * data[ 16 + column ];
					alpha[ 2 ] = c * data[ 48 + column ];
					alpha[ 3 ] = f * data[ 48 + column ];
					beta[ 0 ] = b * data[ 8 + column ] + d * data[ 24 + column ] + e * data[ 40 + column ] + g * data[ 56 + column ];
					beta[ 1 ] = d * data[ 8 + column ] - g * data[ 24 + column ] - b * data[ 40 + column ] - e * data[ 56 + column ];
					beta[ 2 ] = e * data[ 8 + column ] - b * data[ 24 + column ] + g * data[ 40 + column ] + d * data[ 56 + column ];
					beta[ 3 ] = g * data[ 8 + column ] - e * data[ 24 + column ] + d * data[ 40 + column ] - b * data[ 56 + column ];
					theta[ 0 ] = a * ( data[ column ] + data[ 32 + column ] );
					theta[ 3 ] = a * ( data[ column ] - data[ 32 + column ] );
					theta[ 1 ] = alpha[ 0 ] + alpha[ 3 ];
					theta[ 2 ] = alpha[ 1 ] - alpha[ 2 ];
					gamma[ 0 ] = theta[ 0 ] + theta[ 1 ];
					gamma[ 1 ] = theta[ 3 ] + theta[ 2 ];
					gamma[ 2 ] = theta[ 3 ] - theta[ 2 ];
					gamma[ 3 ] = theta[ 0 ] - theta[ 1 ];
					data[ 0 + column ] = gamma[ 0 ] + beta[ 0 ];
					data[ 8 + column ] = gamma[ 1 ] + beta[ 1 ];
					data[ 16 + column ] = gamma[ 2 ] + beta[ 2 ];
					data[ 24 + column ] = gamma[ 3 ] + beta[ 3 ];
					data[ 32 + column ] = gamma[ 3 ] - beta[ 3 ];
					data[ 40 + column ] = gamma[ 2 ] - beta[ 2 ];
					data[ 48 + column ] = gamma[ 1 ] - beta[ 1 ];
					data[ 56 + column ] = gamma[ 0 ] - beta[ 0 ];

				}

			}

			function csc709Inverse( data ) {

				for ( let i = 0; i < 64; ++ i ) {

					const y = data[ 0 ][ i ];
					const cb = data[ 1 ][ i ];
					const cr = data[ 2 ][ i ];
					data[ 0 ][ i ] = y + 1.5747 * cr;
					data[ 1 ][ i ] = y - 0.1873 * cb - 0.4682 * cr;
					data[ 2 ][ i ] = y + 1.8556 * cb;

				}

			}

			function convertToHalf( src, dst, idx ) {

				for ( let i = 0; i < 64; ++ i ) {

					dst[ idx + i ] = THREE.DataUtils.toHalfFloat( toLinear( src[ i ] ) );

				}

			}

			function toLinear( float ) {

				if ( float <= 1 ) {

					return Math.sign( float ) * Math.pow( Math.abs( float ), 2.2 );

				} else {

					return Math.sign( float ) * Math.pow( logBase, Math.abs( float ) - 1.0 );

				}

			}

			function uncompressRAW( info ) {

				return new DataView( info.array.buffer, info.offset.value, info.size );

			}

			function uncompressRLE( info ) {

				const compressed = info.viewer.buffer.slice( info.offset.value, info.offset.value + info.size );
				const rawBuffer = new Uint8Array( decodeRunLength( compressed ) );
				const tmpBuffer = new Uint8Array( rawBuffer.length );
				predictor( rawBuffer ); // revert predictor

				interleaveScalar( rawBuffer, tmpBuffer ); // interleave pixels

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressZIP( info ) {

				const compressed = info.array.slice( info.offset.value, info.offset.value + info.size );
				if ( typeof fflate === 'undefined' ) {

					console.error( 'THREE.EXRLoader: External library fflate.min.js required.' );

				}

				const rawBuffer = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef
				const tmpBuffer = new Uint8Array( rawBuffer.length );
				predictor( rawBuffer ); // revert predictor

				interleaveScalar( rawBuffer, tmpBuffer ); // interleave pixels

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressPIZ( info ) {

				const inDataView = info.viewer;
				const inOffset = {
					value: info.offset.value
				};
				const outBuffer = new Uint16Array( info.width * info.scanlineBlockSize * ( info.channels * info.type ) );
				const bitmap = new Uint8Array( BITMAP_SIZE );

				// Setup channel info
				let outBufferEnd = 0;
				const pizChannelData = new Array( info.channels );
				for ( let i = 0; i < info.channels; i ++ ) {

					pizChannelData[ i ] = {};
					pizChannelData[ i ][ 'start' ] = outBufferEnd;
					pizChannelData[ i ][ 'end' ] = pizChannelData[ i ][ 'start' ];
					pizChannelData[ i ][ 'nx' ] = info.width;
					pizChannelData[ i ][ 'ny' ] = info.lines;
					pizChannelData[ i ][ 'size' ] = info.type;
					outBufferEnd += pizChannelData[ i ].nx * pizChannelData[ i ].ny * pizChannelData[ i ].size;

				}

				// Read range compression data

				const minNonZero = parseUint16( inDataView, inOffset );
				const maxNonZero = parseUint16( inDataView, inOffset );
				if ( maxNonZero >= BITMAP_SIZE ) {

					throw new Error( 'Something is wrong with PIZ_COMPRESSION BITMAP_SIZE' );

				}

				if ( minNonZero <= maxNonZero ) {

					for ( let i = 0; i < maxNonZero - minNonZero + 1; i ++ ) {

						bitmap[ i + minNonZero ] = parseUint8( inDataView, inOffset );

					}

				}

				// Reverse LUT
				const lut = new Uint16Array( USHORT_RANGE );
				const maxValue = reverseLutFromBitmap( bitmap, lut );
				const length = parseUint32( inDataView, inOffset );

				// Huffman decoding
				hufUncompress( info.array, inDataView, inOffset, length, outBuffer, outBufferEnd );

				// Wavelet decoding
				for ( let i = 0; i < info.channels; ++ i ) {

					const cd = pizChannelData[ i ];
					for ( let j = 0; j < pizChannelData[ i ].size; ++ j ) {

						wav2Decode( outBuffer, cd.start + j, cd.nx, cd.size, cd.ny, cd.nx * cd.size, maxValue );

					}

				}

				// Expand the pixel data to their original range
				applyLut( lut, outBuffer, outBufferEnd );

				// Rearrange the pixel data into the format expected by the caller.
				let tmpOffset = 0;
				const tmpBuffer = new Uint8Array( outBuffer.buffer.byteLength );
				for ( let y = 0; y < info.lines; y ++ ) {

					for ( let c = 0; c < info.channels; c ++ ) {

						const cd = pizChannelData[ c ];
						const n = cd.nx * cd.size;
						const cp = new Uint8Array( outBuffer.buffer, cd.end * INT16_SIZE, n * INT16_SIZE );
						tmpBuffer.set( cp, tmpOffset );
						tmpOffset += n * INT16_SIZE;
						cd.end += n;

					}

				}

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressPXR( info ) {

				const compressed = info.array.slice( info.offset.value, info.offset.value + info.size );
				if ( typeof fflate === 'undefined' ) {

					console.error( 'THREE.EXRLoader: External library fflate.min.js required.' );

				}

				const rawBuffer = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

				const sz = info.lines * info.channels * info.width;
				const tmpBuffer = info.type == 1 ? new Uint16Array( sz ) : new Uint32Array( sz );
				let tmpBufferEnd = 0;
				let writePtr = 0;
				const ptr = new Array( 4 );
				for ( let y = 0; y < info.lines; y ++ ) {

					for ( let c = 0; c < info.channels; c ++ ) {

						let pixel = 0;
						switch ( info.type ) {

							case 1:
								ptr[ 0 ] = tmpBufferEnd;
								ptr[ 1 ] = ptr[ 0 ] + info.width;
								tmpBufferEnd = ptr[ 1 ] + info.width;
								for ( let j = 0; j < info.width; ++ j ) {

									const diff = rawBuffer[ ptr[ 0 ] ++ ] << 8 | rawBuffer[ ptr[ 1 ] ++ ];
									pixel += diff;
									tmpBuffer[ writePtr ] = pixel;
									writePtr ++;

								}

								break;
							case 2:
								ptr[ 0 ] = tmpBufferEnd;
								ptr[ 1 ] = ptr[ 0 ] + info.width;
								ptr[ 2 ] = ptr[ 1 ] + info.width;
								tmpBufferEnd = ptr[ 2 ] + info.width;
								for ( let j = 0; j < info.width; ++ j ) {

									const diff = rawBuffer[ ptr[ 0 ] ++ ] << 24 | rawBuffer[ ptr[ 1 ] ++ ] << 16 | rawBuffer[ ptr[ 2 ] ++ ] << 8;
									pixel += diff;
									tmpBuffer[ writePtr ] = pixel;
									writePtr ++;

								}

								break;

						}

					}

				}

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressDWA( info ) {

				const inDataView = info.viewer;
				const inOffset = {
					value: info.offset.value
				};
				const outBuffer = new Uint8Array( info.width * info.lines * ( info.channels * info.type * INT16_SIZE ) );

				// Read compression header information
				const dwaHeader = {
					version: parseInt64( inDataView, inOffset ),
					unknownUncompressedSize: parseInt64( inDataView, inOffset ),
					unknownCompressedSize: parseInt64( inDataView, inOffset ),
					acCompressedSize: parseInt64( inDataView, inOffset ),
					dcCompressedSize: parseInt64( inDataView, inOffset ),
					rleCompressedSize: parseInt64( inDataView, inOffset ),
					rleUncompressedSize: parseInt64( inDataView, inOffset ),
					rleRawSize: parseInt64( inDataView, inOffset ),
					totalAcUncompressedCount: parseInt64( inDataView, inOffset ),
					totalDcUncompressedCount: parseInt64( inDataView, inOffset ),
					acCompression: parseInt64( inDataView, inOffset )
				};
				if ( dwaHeader.version < 2 ) throw new Error( 'EXRLoader.parse: ' + EXRHeader.compression + ' version ' + dwaHeader.version + ' is unsupported' );

				// Read channel ruleset information
				const channelRules = new Array();
				let ruleSize = parseUint16( inDataView, inOffset ) - INT16_SIZE;
				while ( ruleSize > 0 ) {

					const name = parseNullTerminatedString( inDataView.buffer, inOffset );
					const value = parseUint8( inDataView, inOffset );
					const compression = value >> 2 & 3;
					const csc = ( value >> 4 ) - 1;
					const index = new Int8Array( [ csc ] )[ 0 ];
					const type = parseUint8( inDataView, inOffset );
					channelRules.push( {
						name: name,
						index: index,
						type: type,
						compression: compression
					} );
					ruleSize -= name.length + 3;

				}

				// Classify channels
				const channels = EXRHeader.channels;
				const channelData = new Array( info.channels );
				for ( let i = 0; i < info.channels; ++ i ) {

					const cd = channelData[ i ] = {};
					const channel = channels[ i ];
					cd.name = channel.name;
					cd.compression = UNKNOWN;
					cd.decoded = false;
					cd.type = channel.pixelType;
					cd.pLinear = channel.pLinear;
					cd.width = info.width;
					cd.height = info.lines;

				}

				const cscSet = {
					idx: new Array( 3 )
				};
				for ( let offset = 0; offset < info.channels; ++ offset ) {

					const cd = channelData[ offset ];
					for ( let i = 0; i < channelRules.length; ++ i ) {

						const rule = channelRules[ i ];
						if ( cd.name == rule.name ) {

							cd.compression = rule.compression;
							if ( rule.index >= 0 ) {

								cscSet.idx[ rule.index ] = offset;

							}

							cd.offset = offset;

						}

					}

				}

				let acBuffer, dcBuffer, rleBuffer;

				// Read DCT - AC component data
				if ( dwaHeader.acCompressedSize > 0 ) {

					switch ( dwaHeader.acCompression ) {

						case STATIC_HUFFMAN:
							acBuffer = new Uint16Array( dwaHeader.totalAcUncompressedCount );
							hufUncompress( info.array, inDataView, inOffset, dwaHeader.acCompressedSize, acBuffer, dwaHeader.totalAcUncompressedCount );
							break;
						case DEFLATE:
							const compressed = info.array.slice( inOffset.value, inOffset.value + dwaHeader.totalAcUncompressedCount );
							const data = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef
							acBuffer = new Uint16Array( data.buffer );
							inOffset.value += dwaHeader.totalAcUncompressedCount;
							break;

					}

				}

				// Read DCT - DC component data
				if ( dwaHeader.dcCompressedSize > 0 ) {

					const zlibInfo = {
						array: info.array,
						offset: inOffset,
						size: dwaHeader.dcCompressedSize
					};
					dcBuffer = new Uint16Array( uncompressZIP( zlibInfo ).buffer );
					inOffset.value += dwaHeader.dcCompressedSize;

				}

				// Read RLE compressed data
				if ( dwaHeader.rleRawSize > 0 ) {

					const compressed = info.array.slice( inOffset.value, inOffset.value + dwaHeader.rleCompressedSize );
					const data = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef
					rleBuffer = decodeRunLength( data.buffer );
					inOffset.value += dwaHeader.rleCompressedSize;

				}

				// Prepare outbuffer data offset
				let outBufferEnd = 0;
				const rowOffsets = new Array( channelData.length );
				for ( let i = 0; i < rowOffsets.length; ++ i ) {

					rowOffsets[ i ] = new Array();

				}

				for ( let y = 0; y < info.lines; ++ y ) {

					for ( let chan = 0; chan < channelData.length; ++ chan ) {

						rowOffsets[ chan ].push( outBufferEnd );
						outBufferEnd += channelData[ chan ].width * info.type * INT16_SIZE;

					}

				}

				// Lossy DCT decode RGB channels
				lossyDctDecode( cscSet, rowOffsets, channelData, acBuffer, dcBuffer, outBuffer );

				// Decode other channels
				for ( let i = 0; i < channelData.length; ++ i ) {

					const cd = channelData[ i ];
					if ( cd.decoded ) continue;
					switch ( cd.compression ) {

						case RLE:
							let row = 0;
							let rleOffset = 0;
							for ( let y = 0; y < info.lines; ++ y ) {

								let rowOffsetBytes = rowOffsets[ i ][ row ];
								for ( let x = 0; x < cd.width; ++ x ) {

									for ( let byte = 0; byte < INT16_SIZE * cd.type; ++ byte ) {

										outBuffer[ rowOffsetBytes ++ ] = rleBuffer[ rleOffset + byte * cd.width * cd.height ];

									}

									rleOffset ++;

								}

								row ++;

							}

							break;
						case LOSSY_DCT: // skip

						default:
							throw new Error( 'EXRLoader.parse: unsupported channel compression' );

					}

				}

				return new DataView( outBuffer.buffer );

			}

			function parseNullTerminatedString( buffer, offset ) {

				const uintBuffer = new Uint8Array( buffer );
				let endOffset = 0;
				while ( uintBuffer[ offset.value + endOffset ] != 0 ) {

					endOffset += 1;

				}

				const stringValue = new TextDecoder().decode( uintBuffer.slice( offset.value, offset.value + endOffset ) );
				offset.value = offset.value + endOffset + 1;
				return stringValue;

			}

			function parseFixedLengthString( buffer, offset, size ) {

				const stringValue = new TextDecoder().decode( new Uint8Array( buffer ).slice( offset.value, offset.value + size ) );
				offset.value = offset.value + size;
				return stringValue;

			}

			function parseRational( dataView, offset ) {

				const x = parseInt32( dataView, offset );
				const y = parseUint32( dataView, offset );
				return [ x, y ];

			}

			function parseTimecode( dataView, offset ) {

				const x = parseUint32( dataView, offset );
				const y = parseUint32( dataView, offset );
				return [ x, y ];

			}

			function parseInt32( dataView, offset ) {

				const Int32 = dataView.getInt32( offset.value, true );
				offset.value = offset.value + INT32_SIZE;
				return Int32;

			}

			function parseUint32( dataView, offset ) {

				const Uint32 = dataView.getUint32( offset.value, true );
				offset.value = offset.value + INT32_SIZE;
				return Uint32;

			}

			function parseUint8Array( uInt8Array, offset ) {

				const Uint8 = uInt8Array[ offset.value ];
				offset.value = offset.value + INT8_SIZE;
				return Uint8;

			}

			function parseUint8( dataView, offset ) {

				const Uint8 = dataView.getUint8( offset.value );
				offset.value = offset.value + INT8_SIZE;
				return Uint8;

			}

			const parseInt64 = function ( dataView, offset ) {

				const Int64 = Number( dataView.getBigInt64( offset.value, true ) );
				offset.value += ULONG_SIZE;
				return Int64;

			};

			function parseFloat32( dataView, offset ) {

				const float = dataView.getFloat32( offset.value, true );
				offset.value += FLOAT32_SIZE;
				return float;

			}

			function decodeFloat32( dataView, offset ) {

				return THREE.DataUtils.toHalfFloat( parseFloat32( dataView, offset ) );

			}

			// https://stackoverflow.com/questions/5678432/decompressing-half-precision-floats-in-javascript
			function decodeFloat16( binary ) {

				const exponent = ( binary & 0x7C00 ) >> 10,
					fraction = binary & 0x03FF;
				return ( binary >> 15 ? - 1 : 1 ) * ( exponent ? exponent === 0x1F ? fraction ? NaN : Infinity : Math.pow( 2, exponent - 15 ) * ( 1 + fraction / 0x400 ) : 6.103515625e-5 * ( fraction / 0x400 ) );

			}

			function parseUint16( dataView, offset ) {

				const Uint16 = dataView.getUint16( offset.value, true );
				offset.value += INT16_SIZE;
				return Uint16;

			}

			function parseFloat16( buffer, offset ) {

				return decodeFloat16( parseUint16( buffer, offset ) );

			}

			function parseChlist( dataView, buffer, offset, size ) {

				const startOffset = offset.value;
				const channels = [];
				while ( offset.value < startOffset + size - 1 ) {

					const name = parseNullTerminatedString( buffer, offset );
					const pixelType = parseInt32( dataView, offset );
					const pLinear = parseUint8( dataView, offset );
					offset.value += 3; // reserved, three chars
					const xSampling = parseInt32( dataView, offset );
					const ySampling = parseInt32( dataView, offset );
					channels.push( {
						name: name,
						pixelType: pixelType,
						pLinear: pLinear,
						xSampling: xSampling,
						ySampling: ySampling
					} );

				}

				offset.value += 1;
				return channels;

			}

			function parseChromaticities( dataView, offset ) {

				const redX = parseFloat32( dataView, offset );
				const redY = parseFloat32( dataView, offset );
				const greenX = parseFloat32( dataView, offset );
				const greenY = parseFloat32( dataView, offset );
				const blueX = parseFloat32( dataView, offset );
				const blueY = parseFloat32( dataView, offset );
				const whiteX = parseFloat32( dataView, offset );
				const whiteY = parseFloat32( dataView, offset );
				return {
					redX: redX,
					redY: redY,
					greenX: greenX,
					greenY: greenY,
					blueX: blueX,
					blueY: blueY,
					whiteX: whiteX,
					whiteY: whiteY
				};

			}

			function parseCompression( dataView, offset ) {

				const compressionCodes = [ 'NO_COMPRESSION', 'RLE_COMPRESSION', 'ZIPS_COMPRESSION', 'ZIP_COMPRESSION', 'PIZ_COMPRESSION', 'PXR24_COMPRESSION', 'B44_COMPRESSION', 'B44A_COMPRESSION', 'DWAA_COMPRESSION', 'DWAB_COMPRESSION' ];
				const compression = parseUint8( dataView, offset );
				return compressionCodes[ compression ];

			}

			function parseBox2i( dataView, offset ) {

				const xMin = parseUint32( dataView, offset );
				const yMin = parseUint32( dataView, offset );
				const xMax = parseUint32( dataView, offset );
				const yMax = parseUint32( dataView, offset );
				return {
					xMin: xMin,
					yMin: yMin,
					xMax: xMax,
					yMax: yMax
				};

			}

			function parseLineOrder( dataView, offset ) {

				const lineOrders = [ 'INCREASING_Y' ];
				const lineOrder = parseUint8( dataView, offset );
				return lineOrders[ lineOrder ];

			}

			function parseV2f( dataView, offset ) {

				const x = parseFloat32( dataView, offset );
				const y = parseFloat32( dataView, offset );
				return [ x, y ];

			}

			function parseV3f( dataView, offset ) {

				const x = parseFloat32( dataView, offset );
				const y = parseFloat32( dataView, offset );
				const z = parseFloat32( dataView, offset );
				return [ x, y, z ];

			}

			function parseValue( dataView, buffer, offset, type, size ) {

				if ( type === 'string' || type === 'stringvector' || type === 'iccProfile' ) {

					return parseFixedLengthString( buffer, offset, size );

				} else if ( type === 'chlist' ) {

					return parseChlist( dataView, buffer, offset, size );

				} else if ( type === 'chromaticities' ) {

					return parseChromaticities( dataView, offset );

				} else if ( type === 'compression' ) {

					return parseCompression( dataView, offset );

				} else if ( type === 'box2i' ) {

					return parseBox2i( dataView, offset );

				} else if ( type === 'lineOrder' ) {

					return parseLineOrder( dataView, offset );

				} else if ( type === 'float' ) {

					return parseFloat32( dataView, offset );

				} else if ( type === 'v2f' ) {

					return parseV2f( dataView, offset );

				} else if ( type === 'v3f' ) {

					return parseV3f( dataView, offset );

				} else if ( type === 'int' ) {

					return parseInt32( dataView, offset );

				} else if ( type === 'rational' ) {

					return parseRational( dataView, offset );

				} else if ( type === 'timecode' ) {

					return parseTimecode( dataView, offset );

				} else if ( type === 'preview' ) {

					offset.value += size;
					return 'skipped';

				} else {

					offset.value += size;
					return undefined;

				}

			}

			function parseHeader( dataView, buffer, offset ) {

				const EXRHeader = {};
				if ( dataView.getUint32( 0, true ) != 20000630 ) {

					// magic

					throw new Error( 'THREE.EXRLoader: provided file doesn\'t appear to be in OpenEXR format.' );

				}

				EXRHeader.version = dataView.getUint8( 4 );
				const spec = dataView.getUint8( 5 ); // fullMask

				EXRHeader.spec = {
					singleTile: !! ( spec & 2 ),
					longName: !! ( spec & 4 ),
					deepFormat: !! ( spec & 8 ),
					multiPart: !! ( spec & 16 )
				};

				// start of header

				offset.value = 8; // start at 8 - after pre-amble

				let keepReading = true;
				while ( keepReading ) {

					const attributeName = parseNullTerminatedString( buffer, offset );
					if ( attributeName == 0 ) {

						keepReading = false;

					} else {

						const attributeType = parseNullTerminatedString( buffer, offset );
						const attributeSize = parseUint32( dataView, offset );
						const attributeValue = parseValue( dataView, buffer, offset, attributeType, attributeSize );
						if ( attributeValue === undefined ) {

							console.warn( `EXRLoader.parse: skipped unknown header attribute type \'${attributeType}\'.` );

						} else {

							EXRHeader[ attributeName ] = attributeValue;

						}

					}

				}

				if ( ( spec & ~ 0x04 ) != 0 ) {

					// unsupported tiled, deep-image, multi-part

					console.error( 'EXRHeader:', EXRHeader );
					throw new Error( 'THREE.EXRLoader: provided file is currently unsupported.' );

				}

				return EXRHeader;

			}

			function setupDecoder( EXRHeader, dataView, uInt8Array, offset, outputType ) {

				const EXRDecoder = {
					size: 0,
					viewer: dataView,
					array: uInt8Array,
					offset: offset,
					width: EXRHeader.dataWindow.xMax - EXRHeader.dataWindow.xMin + 1,
					height: EXRHeader.dataWindow.yMax - EXRHeader.dataWindow.yMin + 1,
					channels: EXRHeader.channels.length,
					bytesPerLine: null,
					lines: null,
					inputSize: null,
					type: EXRHeader.channels[ 0 ].pixelType,
					uncompress: null,
					getter: null,
					format: null,
					encoding: null
				};
				switch ( EXRHeader.compression ) {

					case 'NO_COMPRESSION':
						EXRDecoder.lines = 1;
						EXRDecoder.uncompress = uncompressRAW;
						break;
					case 'RLE_COMPRESSION':
						EXRDecoder.lines = 1;
						EXRDecoder.uncompress = uncompressRLE;
						break;
					case 'ZIPS_COMPRESSION':
						EXRDecoder.lines = 1;
						EXRDecoder.uncompress = uncompressZIP;
						break;
					case 'ZIP_COMPRESSION':
						EXRDecoder.lines = 16;
						EXRDecoder.uncompress = uncompressZIP;
						break;
					case 'PIZ_COMPRESSION':
						EXRDecoder.lines = 32;
						EXRDecoder.uncompress = uncompressPIZ;
						break;
					case 'PXR24_COMPRESSION':
						EXRDecoder.lines = 16;
						EXRDecoder.uncompress = uncompressPXR;
						break;
					case 'DWAA_COMPRESSION':
						EXRDecoder.lines = 32;
						EXRDecoder.uncompress = uncompressDWA;
						break;
					case 'DWAB_COMPRESSION':
						EXRDecoder.lines = 256;
						EXRDecoder.uncompress = uncompressDWA;
						break;
					default:
						throw new Error( 'EXRLoader.parse: ' + EXRHeader.compression + ' is unsupported' );

				}

				EXRDecoder.scanlineBlockSize = EXRDecoder.lines;
				if ( EXRDecoder.type == 1 ) {

					// half
					switch ( outputType ) {

						case THREE.FloatType:
							EXRDecoder.getter = parseFloat16;
							EXRDecoder.inputSize = INT16_SIZE;
							break;
						case THREE.HalfFloatType:
							EXRDecoder.getter = parseUint16;
							EXRDecoder.inputSize = INT16_SIZE;
							break;

					}

				} else if ( EXRDecoder.type == 2 ) {

					// float
					switch ( outputType ) {

						case THREE.FloatType:
							EXRDecoder.getter = parseFloat32;
							EXRDecoder.inputSize = FLOAT32_SIZE;
							break;
						case THREE.HalfFloatType:
							EXRDecoder.getter = decodeFloat32;
							EXRDecoder.inputSize = FLOAT32_SIZE;

					}

				} else {

					throw new Error( 'EXRLoader.parse: unsupported pixelType ' + EXRDecoder.type + ' for ' + EXRHeader.compression + '.' );

				}

				EXRDecoder.blockCount = ( EXRHeader.dataWindow.yMax + 1 ) / EXRDecoder.scanlineBlockSize;
				for ( let i = 0; i < EXRDecoder.blockCount; i ++ ) parseInt64( dataView, offset ); // scanlineOffset

				// we should be passed the scanline offset table, ready to start reading pixel data.

				// RGB images will be converted to RGBA format, preventing software emulation in select devices.
				EXRDecoder.outputChannels = EXRDecoder.channels == 3 ? 4 : EXRDecoder.channels;
				const size = EXRDecoder.width * EXRDecoder.height * EXRDecoder.outputChannels;
				switch ( outputType ) {

					case THREE.FloatType:
						EXRDecoder.byteArray = new Float32Array( size );

						// Fill initially with 1s for the alpha value if the texture is not RGBA, RGB values will be overwritten
						if ( EXRDecoder.channels < EXRDecoder.outputChannels ) EXRDecoder.byteArray.fill( 1, 0, size );
						break;
					case THREE.HalfFloatType:
						EXRDecoder.byteArray = new Uint16Array( size );
						if ( EXRDecoder.channels < EXRDecoder.outputChannels ) EXRDecoder.byteArray.fill( 0x3C00, 0, size ); // Uint16Array holds half float data, 0x3C00 is 1

						break;
					default:
						console.error( 'THREE.EXRLoader: unsupported type: ', outputType );
						break;

				}

				EXRDecoder.bytesPerLine = EXRDecoder.width * EXRDecoder.inputSize * EXRDecoder.channels;
				if ( EXRDecoder.outputChannels == 4 ) {

					EXRDecoder.format = THREE.RGBAFormat;
					EXRDecoder.encoding = THREE.LinearEncoding;

				} else {

					EXRDecoder.format = THREE.RedFormat;
					EXRDecoder.encoding = THREE.LinearEncoding;

				}

				return EXRDecoder;

			}

			// start parsing file [START]

			const bufferDataView = new DataView( buffer );
			const uInt8Array = new Uint8Array( buffer );
			const offset = {
				value: 0
			};

			// get header information and validate format.
			const EXRHeader = parseHeader( bufferDataView, buffer, offset );

			// get input compression information and prepare decoding.
			const EXRDecoder = setupDecoder( EXRHeader, bufferDataView, uInt8Array, offset, this.type );
			const tmpOffset = {
				value: 0
			};
			const channelOffsets = {
				R: 0,
				G: 1,
				B: 2,
				A: 3,
				Y: 0
			};
			for ( let scanlineBlockIdx = 0; scanlineBlockIdx < EXRDecoder.height / EXRDecoder.scanlineBlockSize; scanlineBlockIdx ++ ) {

				const line = parseUint32( bufferDataView, offset ); // line_no
				EXRDecoder.size = parseUint32( bufferDataView, offset ); // data_len
				EXRDecoder.lines = line + EXRDecoder.scanlineBlockSize > EXRDecoder.height ? EXRDecoder.height - line : EXRDecoder.scanlineBlockSize;
				const isCompressed = EXRDecoder.size < EXRDecoder.lines * EXRDecoder.bytesPerLine;
				const viewer = isCompressed ? EXRDecoder.uncompress( EXRDecoder ) : uncompressRAW( EXRDecoder );
				offset.value += EXRDecoder.size;
				for ( let line_y = 0; line_y < EXRDecoder.scanlineBlockSize; line_y ++ ) {

					const true_y = line_y + scanlineBlockIdx * EXRDecoder.scanlineBlockSize;
					if ( true_y >= EXRDecoder.height ) break;
					for ( let channelID = 0; channelID < EXRDecoder.channels; channelID ++ ) {

						const cOff = channelOffsets[ EXRHeader.channels[ channelID ].name ];
						for ( let x = 0; x < EXRDecoder.width; x ++ ) {

							tmpOffset.value = ( line_y * ( EXRDecoder.channels * EXRDecoder.width ) + channelID * EXRDecoder.width + x ) * EXRDecoder.inputSize;
							const outIndex = ( EXRDecoder.height - 1 - true_y ) * ( EXRDecoder.width * EXRDecoder.outputChannels ) + x * EXRDecoder.outputChannels + cOff;
							EXRDecoder.byteArray[ outIndex ] = EXRDecoder.getter( viewer, tmpOffset );

						}

					}

				}

			}

			return {
				header: EXRHeader,
				width: EXRDecoder.width,
				height: EXRDecoder.height,
				data: EXRDecoder.byteArray,
				format: EXRDecoder.format,
				encoding: EXRDecoder.encoding,
				type: this.type
			};

		}
		setDataType( value ) {

			this.type = value;
			return this;

		}
		load( url, onLoad, onProgress, onError ) {

			function onLoadCallback( texture, texData ) {

				texture.encoding = texData.encoding;
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.generateMipmaps = false;
				texture.flipY = false;
				if ( onLoad ) onLoad( texture, texData );

			}

			return super.load( url, onLoadCallback, onProgress, onError );

		}

	}

	THREE.EXRLoader = EXRLoader;

} )();
