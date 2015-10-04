/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class DogFilter extends Filter {
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
      varying highp vec2 v_texCoord;
      uniform sampler2D inputImageTexture;

      uniform highp vec2 src_size;

      precision highp float;

      void main (void)
      {
        vec2 uv = v_texCoord;
        vec3 gray = vec3(0.299, 0.587, 0.114);
        vec3 colorMid = texture2D(inputImageTexture, uv).rgb;
        float grayMid = dot(colorMid, gray);
        vec3 colorUp = texture2D(inputImageTexture, uv + vec2(0.0, -1.0) * src_size).rgb;
        float grayUp = dot(colorUp, gray);
        vec3 colorDown = texture2D(inputImageTexture, uv + vec2(0.0, 1.0) * src_size).rgb;
        float grayDown = dot(colorDown, gray);
        vec3 colorLeft = texture2D(inputImageTexture, uv + vec2(-1.0, 0.0) * src_size).rgb;
        float grayLeft = dot(colorLeft, gray);
        vec3 colorRight = texture2D(inputImageTexture, uv + vec2(1.0, 0.0) * src_size).rgb;
        float grayRight = dot(colorRight, gray);

        float u = ( -grayLeft + grayRight) / 2.0;
        float v = ( -grayDown + grayUp) / 2.0;
        vec3 g = vec3(u * u, v * v, u * v);
        gl_FragColor = vec4(g.r, g.g, g.b, 1.0);
      }
      `
    }

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
        src_size: { type: '2f', value: [ 1.0 / canvas.width, 1.0 / canvas.height ] }
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
  static get identifier () { return 'dogFilter' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'DogFilter' }
}

export default DogFilter
