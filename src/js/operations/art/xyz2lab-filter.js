/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class Xyz2LabFilter extends Filter {
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
        float var_X = color.x;
        float var_Y = color.y;
        float var_Z = color.z;

        if ( var_X > 0.008856 ) {
          var_X = pow(var_X, 1.0 / 3.0);
        }
        else {
          var_X = ( 7.787 * var_X ) + ( 16.0 / 116.0 );
        }
        if ( var_Y > 0.008856 ) {
          var_Y = pow(var_Y, 1.0 / 3.0);
        }
        else {
          var_Y = ( 7.787 * var_Y ) + ( 16.0 / 116.0 );
        }
        if ( var_Z > 0.008856 ) {
          var_Z = pow(var_Z, 1.0 / 3.0);
        }
        else {
          var_Z = ( 7.787 * var_Z ) + ( 16.0 / 116.0 );
        }

        float L = ( 116.0 * var_Y ) - 16.0;
        float a = 500.0 * ( var_X - var_Y );
        float b = 200.0 * ( var_Y - var_Z );
        gl_FragColor = vec4(L, a, b, 1.0);
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
  static get identifier () { return 'xyz2lab' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'Xyz2Lab' }
}

export default Xyz2LabFilter
