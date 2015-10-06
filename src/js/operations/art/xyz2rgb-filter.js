/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class Xyz2RgbFilter extends Filter {
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
        float var_R = color.r *  3.2406 + color.g * -1.5372 + color.b * -0.4986;
        float var_G = color.r * -0.9689 + color.g *  1.8758 + color.b *  0.0415;
        float var_B = color.r *  0.0557 + color.g * -0.2040 + color.b *  1.0570;

        if ( var_R > 0.0031308 ) {
          var_R = 1.055 * pow( var_R, ( 1.0 / 2.4 ) ) - 0.055;
        }
        else {
          var_R = 12.92 * var_R;
        }
        if ( var_G > 0.0031308 ) {
          var_G = 1.055 * pow( var_G, ( 1.0 / 2.4 ) ) - 0.055;
        }
        else {
          var_G = 12.92 * var_G;
        }
        if ( var_B > 0.0031308 ) {
          var_B = 1.055 * pow( var_B, ( 1.0 / 2.4 ) ) - 0.055;
        }
        else {
          var_B = 12.92 * var_B;
        }
        gl_FragColor = vec4(var_R, var_G, var_B, 1.0);
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
  static get identifier () { return 'xyz2rgb' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'Xyz2Rgb' }
}

export default Xyz2RgbFilter
