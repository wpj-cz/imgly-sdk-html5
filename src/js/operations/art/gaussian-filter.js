/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class GaussianFilter extends Filter {
    constructor (...args) {
      super(...args)
      this._glslPrograms = {}
      this._textureIndex = 1
      /**
      * The vertex shader used for this operation
      */
      this._vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
      `

      /**
      * The fragment shader used for this operation
      */
      this._fragmentShader = `
      #define saturate(i) ( clamp( i, 0.0, 1.0 ) )
      precision highp float;

      const float pi = 3.14159265;
      uniform highp float blurscale;
      varying highp vec2 v_texCoord;
      uniform highp vec2 iResolution;
      uniform sampler2D inputImageTexture;

      float GaussianWeight( float x, float mean, float deviation )
      {
          float c = deviation;
          float a = c * sqrt( 2.0 * pi );
          float b = x - mean;
          float v = a * exp( -( ( b * b ) / ( 2.0*c*c ) ) );
          return v / a;
      }

      const int samples = 6;

      void main()
      {
         float fSamples = float( samples * samples * 2 * 2 );
          float aspect = iResolution.x / iResolution.y;

          vec2 uv = v_texCoord;

          vec3 sample = vec3(0.0);
          for( int x = -samples; x < samples; x++ )
          {
              for( int y = -samples; y < samples; y++ )
              {
                  vec2 subSampleOffset = ( vec2( float( x ), float( y ) ) / float( samples ) )
                      / ( iResolution.xy * blurscale );

                  float fx = float( x ); float fy = float( y );
                  float gaussianLength = sqrt( fx*fx + fy*fy ) / sqrt( fSamples * 0.5 );
                  float sampleWeight = GaussianWeight( gaussianLength, 0.0, 0.3 );

                  vec3 subsample = pow( texture2D( inputImageTexture, uv + subSampleOffset ).rgb, vec3(2.2) );
                  sample += saturate( subsample ) * sampleWeight;
              }
          }
          sample /= fSamples;
          sample *= 1.7;

          gl_FragColor = vec4(  pow( sample.rgb, vec3(1.0 / 2.2 ) ), 1.0 );
      }
      `
    }
    /*
    float fy = ( c.x + 16.0f ) / 116.0f;
      float fx = c.y / 500.0f + fy;
      float fz = fy - c.z / 200.0f;
    */
/**
  * Crops this image using WebGL
  * @param  {WebGLRenderer} renderer
  * @private
  */
  renderWebGL (renderer) {
    this._setupProgram(renderer)
    var canvas = renderer.getCanvas()
    renderer.runShader(null, this._fragmentShader, {
      uniforms: {
        iResolution: { type: '2f', value: [ canvas.width, canvas.height ] },
        blurscale: { type: 'f', value: 0.5 }
      }
    })
  }

  /**
  * This method initializes the shaders once
  * @param  {WebGLRenderer} renderer WebGLRenderer that is used to compile the
  * shafers
  */
  _setupProgram (renderer) {
    if (!this._glslPrograms[renderer.id]) {
      this._glslPrograms[renderer.id] = renderer.setupGLSLProgram(
        this._vertexShader,
        this._fragmentShader
      )
    }
  }

  /**
  * Renders the oil operation to a canvas
  * @param  {CanvasRenderer} renderer
  * @private
  */
  renderCanvas (renderer) {
    var canvas = renderer.getCanvas()
    var context = renderer.getContext()
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    context.putImageData(imageData, 0, 0)
  }

  /**
   * A unique string that identifies this operation. Can be used to select
   * the active filter.
   * @type {String}
   */
  static get identifier () { return 'gaussian' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'Gaussian' }
}

export default GaussianFilter
