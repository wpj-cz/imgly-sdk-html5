/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class Lab2XyzFilter extends Filter {
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
        float var_Y = (( color.r + 16.0 ) / 116.0);
        float var_X = (color.g / 500.0 + var_Y);
        float var_Z = (var_Y - color.b / 200.0);

        if (var_X > 0.206897) {
          var_X = var_X * var_X * var_X;
        }
        else {
          var_X = (var_X - 16.0 / 116.0) / 7.787;
        }
        if (var_Y > 0.206897) {
          var_Y = var_Y * var_Y * var_Y;
        }
        else {
          var_Y = (var_Y - 16.0 / 116.0) / 7.787;
        }
        if (var_Z > 0.206897) {
          var_Z = var_Z * var_Z * var_Z;
        }
        else {
          var_Z = (var_Z - 16.0 / 116.0) / 7.787;
        }
        gl_FragColor = vec4(var_X * 95.047, var_Y * 100.0, var_Z * 108.883, 1.0);
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
  static get identifier () { return 'lab2xyz' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'Lab2Xyz' }
}

export default Lab2XyzFilter
