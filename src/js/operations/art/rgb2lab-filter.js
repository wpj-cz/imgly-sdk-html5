/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class Rgb2LabFilter extends Filter {
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

      precision highp float;

      void main (void)
      {
        vec2 uv = v_texCoord;
        vec3 color = texture2D(inputImageTexture, uv).rgb;

        const mat3 RGB2XYZ = mat3(0.4124564, 0.3575761, 0.1804375,
          0.2126729,  0.7151522,  0.0721750,
          0.0193339,  0.1191920,  0.9503041);
          vec3 XYZ = RGB2XYZ * color.rgb;
        gl_FragColor = vec4(XYZ.x, XYZ.y, XYZ.z, 1.0);
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
    renderer.runShader(null, this._fragmentShader, {
      uniforms: {
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
  //  var pixels = imageData.data

    context.putImageData(imageData, 0, 0)
  }

  /**
   * A unique string that identifies this operation. Can be used to select
   * the active filter.
   * @type {String}
   */
  static get identifier () { return 'rgb2lab' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'Rgb2Lab' }
}

export default Rgb2LabFilter
