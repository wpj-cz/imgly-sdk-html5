/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class Rgb2XyzFilter extends Filter {
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
        vec4 color = texture2D(inputImageTexture, uv).rgb;
        float var_R = color.x;
        float var_G = color.y;
        float var_B = color.z;

        if ( var_R > 0.04045 ) {
          var_R = pow((( var_R + 0.055 ) / 1.055 ), 2.4);
        }
        else {
          var_R = var_R / 12.92;
        }
        if ( var_G > 0.04045 ) {
          var_G = pow((( var_G + 0.055 ) / 1.055 ), 2.4);
        }
        else {
          var_G = var_G / 12.92;
        }
        if ( var_B > 0.04045 ) {
           var_B = pow((( var_B + 0.055 ) / 1.055 ), 2.4);
        }
        else {
          var_B = var_B / 12.92;
        }

        var_R = var_R * 100.0;
        var_G = var_G * 100.0;
        var_B = var_B * 100.0;

        //Observer. = 2°, Illuminant = D65
        float X = (var_R * 0.4124 + var_G * 0.3576 + var_B * 0.1805) / 95.047;
        float Y = (var_R * 0.2126 + var_G * 0.7152 + var_B * 0.0722) / 100.000;
        float Z = (var_R * 0.0193 + var_G * 0.1192 + var_B * 0.9505) / 108.883;
        gl_FragColor = vec4(X, Y, Z, 1.0);
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

    context.putImageData(imageData, 0, 0)
  }

  /**
   * A unique string that identifies this operation. Can be used to select
   * the active filter.
   * @type {String}
   */
  static get identifier () { return 'rgb2xyz' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'Rgb2Xyz' }
}

export default Rgb2XyzFilter
