  /**
   *
   * @class
   * @alias ImglyKit.Filter
   */

  import Filter from '../filters/filter'

  class SobelFilter extends Filter {
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
        uniform highp vec2 texelSize;
        uniform sampler2D inputImageTexture;
        uniform highp float threshold2;
        precision highp float;

        void main (void)
        {
          vec2 uv = v_texCoord;
          vec3 color = texture2D(inputImageTexture, uv).rgb;
          vec3 u = -0.183 * texture2D(inputImageTexture, uv + vec2(-1.0, -1.0) * texelSize).rgb;
          u += -0.183 * texture2D(inputImageTexture, uv + vec2(-1.0, 0.0) * texelSize).rgb;
          u += -0.183 * texture2D(inputImageTexture, uv + vec2(-1.0, 1.0) * texelSize).rgb;
          u += 0.183 * texture2D(inputImageTexture, uv + vec2(1.0, -1.0) * texelSize).rgb;
          u += 0.183 * texture2D(inputImageTexture, uv + vec2(1.0, 0.0) * texelSize).rgb;
          u += 0.183 * texture2D(inputImageTexture, uv + vec2(1.0, 1.0) * texelSize).rgb;
          u *= 0.5;
          vec3 v = -0.183 * texture2D(inputImageTexture, uv + vec2(-1.0, -1.0) * texelSize).rgb;
          v += -0.183 * texture2D(inputImageTexture, uv + vec2(0.0, -1.0) * texelSize).rgb;
          v += -0.183 * texture2D(inputImageTexture, uv + vec2(1.0, -1.0) * texelSize).rgb;
          v += 0.183 * texture2D(inputImageTexture, uv + vec2(-1.0, 1.0) * texelSize).rgb;
          v += 0.183 * texture2D(inputImageTexture, uv + vec2(0.0, 1.0) * texelSize).rgb;
          v += 0.183 * texture2D(inputImageTexture, uv + vec2(1.0, 1.0) * texelSize).rgb;
          v *= 0.5;
          vec3 g = vec3(dot(u, u), dot(v, v), dot(u, v));
          float mag = g.x * g.x + g.y * g.y + 2.0 * g.z * g.z;
          if (mag < threshold2) {
            gl_FragColor = vec4(color, 1.0);
          } else {
            gl_FragColor = vec4( g, mag);
          }
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
          texelSize: { type: '2f', value: [ 1.0 / canvas.width, 1.0 / canvas.height ] },
          threshold2: { type: 'f', value: 0.002 }
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
      var threshold2 = 0.002
      var canvas = renderer.getCanvas()
      var context = renderer.getContext()
      var imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      var pixels = imageData.data
      var original = pixels.slice(0)
      var index = 0
      var u = [0, 0, 0]
      var v = [0, 0, 0]
      for (var y = 1; y < canvas.height; y++) {
        for (var x = 1; x < canvas.width; x++) {
          var ix = x
          var iy = y
          for (var c = 0; c < 3; c++) {
            // calculate u
            u[c] = 0
            ix = x - 1
            iy = y - 1
            index = (iy * canvas.width + ix) * 4 + c
            u[c] += -0.183 * original[index]

            iy = y
            index = (iy * canvas.width + ix) * 4 + c
            u[c] += -0.183 * original[index]

            iy = y + 1
            index = (iy * canvas.width + ix) * 4 + c
            u[c] += -0.183 * original[index]

            ix = x + 1
            iy = y - 1
            index = (iy * canvas.width + ix) * 4 + c
            u[c] += 0.183 * original[index]

            iy = y
            index = (iy * canvas.width + ix) * 4 + c
            u[c] += 0.183 * original[index]

            iy = y + 1
            index = (iy * canvas.width + ix) * 4 + c
            u[c] += 0.183 * original[index]
            u[c] *= 0.5
        // calculate v
            v[c] = 0
            iy = y - 1
            ix = x - 1
            index = (iy * canvas.width + ix) * 4 + c
            v[c] += -0.183 * original[index]

            ix = x
            index = (iy * canvas.width + ix) * 4 + c
            v[c] += -0.183 * original[index]

            ix = x + 1
            index = (iy * canvas.width + ix) * 4 + c
            v[c] += -0.183 * original[index]

            iy = y + 1
            ix = x - 1
            index = (iy * canvas.width + ix) * 4 + c
            v[c] += 0.183 * original[index]

            ix = x
            index = (iy * canvas.width + ix) * 4 + c
            v[c] += 0.183 * original[index]

            ix = x + 1
            index = (iy * canvas.width + ix) * 4 + c
            v[c] += 0.183 * original[index]
            v[c] *= 0.5
//            console.log(v[c])
          }

          var g = [0, 0, 0]
          // g.x = dot(u, u)

          u[0] /= 255
          u[1] /= 255
          u[2] /= 255

          v[0] /= 255
          v[1] /= 255
          v[2] /= 255

          g[0] = u[0] * u[0] + u[1] * u[1] + u[2] * u[2]
          g[1] = v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
          g[2] = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]

          var mag = g[0] * g[0] + g[1] * g[1] + 2 * g[2] * g[2]

          index = (y * canvas.width + x) * 4
          if (mag > threshold2) {
            pixels[index] = g[0] * 255
            pixels[index + 1] = g[1] * 255
            pixels[index + 2] = g[2] * 255
            pixels[index + 3] = mag
          } else {
            pixels[index] = original[index]
            pixels[index + 1] = original[index + 1]
            pixels[index + 2] = original[index + 2]
            pixels[index + 3] = 255
          }
        }
      }
      // pixels = pixels.map((x, i) => {x * 255})
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

  export default SobelFilter
