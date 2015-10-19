/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'
import Vector2 from '../../lib/vector2'

const CUDART_PIO2_F = 1.570796327

class StGaussFilter extends Filter {
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

      vec3 rgb2xyz( vec3 c ) {
          vec3 tmp;
          tmp.x = ( c.r > 0.04045 ) ? pow( ( c.r + 0.055 ) / 1.055, 2.4 ) : c.r / 12.92;
          tmp.y = ( c.g > 0.04045 ) ? pow( ( c.g + 0.055 ) / 1.055, 2.4 ) : c.g / 12.92,
          tmp.z = ( c.b > 0.04045 ) ? pow( ( c.b + 0.055 ) / 1.055, 2.4 ) : c.b / 12.92;
          return 100.0 * tmp *
              mat3( 0.4124, 0.3576, 0.1805,
                    0.2126, 0.7152, 0.0722,
                    0.0193, 0.1192, 0.9505 );
      }

      vec3 xyz2lab( vec3 c ) {
          vec3 n = c / vec3( 95.047, 100, 108.883 );
          vec3 v;
          v.x = ( n.x > 0.008856 ) ? pow( n.x, 1.0 / 3.0 ) : ( 7.787 * n.x ) + ( 16.0 / 116.0 );
          v.y = ( n.y > 0.008856 ) ? pow( n.y, 1.0 / 3.0 ) : ( 7.787 * n.y ) + ( 16.0 / 116.0 );
          v.z = ( n.z > 0.008856 ) ? pow( n.z, 1.0 / 3.0 ) : ( 7.787 * n.z ) + ( 16.0 / 116.0 );
          return vec3(( 116.0 * v.y ) - 16.0, 500.0 * ( v.x - v.y ), 200.0 * ( v.y - v.z ));
      }

      vec3 rgb2lab(vec3 c) {
          vec3 lab = xyz2lab( rgb2xyz( c ) );
          return vec3( lab.x / 100.0, 0.5 + 0.5 * ( lab.y / 127.0 ), 0.5 + 0.5 * ( lab.z / 127.0 ));
      }

      void main (void)
      {
        vec2 uv = v_texCoord;
        vec3 color = texture2D(inputImageTexture, uv).rgb;

        gl_FragColor = vec4( rgb2lab(color), 1.0 );
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

  _st2A (img, p) {
    var index = (p.y * img.width + p.x) * 4
    var color = [img.imageData[index], img.imageData[index + 1], img.imageData[index + 2]]
    color[0] /= 255
    color[1] /= 255
    color[2] /= 255
    var a = 0.5 * (color[0] + color[1])
    var b = 0.5 * Math.sqrt(Math.max(0.0, color[1] * color[1] - 2.0 * color[0] * color[1] + color[0] * color[0] + 4.0 * color[2] * color[2]))
    var lambda1 = a + b
    var lambda2 = a - b
    return (lambda1 + lambda2 > 0) ? (lambda1 - lambda2) / (lambda1 + lambda2) : 0
  }

  _st_integrate_rk2 (img, p0, sigma, cos_max, step_size) {
    this._stgauss2_filter(img, 0, 0, p0)
    var v0 = this._st2tangent(img, p0)
    var sign = -1
    do {
      var v = new Vector2(v0.x * sign, v0.y * sign)
      var p = new Vector2(p0.x + step_size * v.x, p0.y + step_size * v.y)
      var u = step_size
      while ((u < this._radius) &&
             (p.x >= 0) && (p.x < img.width) && (p.y >= 0) && (p.y < img.height)) {
        this._stgauss2_filter(sign, u, p)

        var t = this._st2tangent(p)
        var vt = this._dot(v, t)
        if (vt < 0) {
          t.x = -t.x
          t.y = -t.y
        }

        t = this._st2tangent(new Vector2(p.x + 0.5 * step_size * t.x, p.y + 0.5 * step_size * t.y))
        vt = this._dot(v, t)
        if (Math.abs(vt) <= cos_max) {
          break
        }
        if (vt < 0) {
          t.x = -t.x
          t.y = -t.y
        }

        v.x = t.x
        v.y = t.y
        p.x += step_size * t.x
        p.y += step_size * t.y
        u += step_size
      }

      sign *= -1
    } while (sign > 0)
  }

  _st2tangent (img, p) {
    var index = (p.y * img.width + p.x) * 4
    var color = [img.imageData[index], img.imageData[index + 1], img.imageData[index + 2]]
    var phi = this._st2angle(color)
    return new Vector2(Math.cos(phi), Math.sin(phi))
  }

  _st2angle (color) {
    return 0.5 * Math.atan2(2 * color[2], color[0] - color[1]) + CUDART_PIO2_F
  }

  _stgauss2_filter (sigma) {
    this._radius = 2 * sigma
    this._twoSigma2 = 2 * sigma * sigma
    this._c = [0, 0, 0, 0]
    this._w = 0
  }

  _stgauss2_filter (img, sign, u, p) {
    var k = Math.exp(-u * u / this._twoSigma2)
    var index = (p.y * img.width + p.x) * 4
    this._c[0] += k * img.imageData[index]
    this._c[1] += k * img.imageData[index + 1]
    this._c[2] += k * img.imageData[index + 2]
    this._w += k
  }

  _stgauss2_filter (dst, src, st, sigma, max_angle, adaptive = true, src_linear = true, st_linear = true, order, step_size) {
    for (var y = 1; y < src.height; y++) {
      for (var x = 1; x < src.width; x++) {
        var A = this._st2A(st, new Vector2(x, y))
        sigma *= 0.25 * (1.0 + A) * (1.0 + A)
        var cos_max = Math.cos(this._radians(max_angle))
        this._stgauss2_filter(src, sigma)
        this._st_integrate_rk2(st, sigma, cos_max, step_size)
        var index = (y * this._canvasWidth + x) * 4
        this._pixels[index] = this._c[0] / this._w
        this._pixels[index + 1] = this._c[1] / this._w
        this._pixels[index + 2] = this._c[2] / this._w
      }
    }
    this._context.putImageData(dst.imageData, 0, 0)
  }

  /**
  * Renders the oil operation to a canvas
  * @param  {CanvasRenderer} renderer
  * @private
  */
  renderCanvas (renderer) {
    // var sigma = 0.2
    // var canvas = renderer.getCanvas()
    this._context = renderer.getContext()
    // var imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    // this._pixels = imageData.data
    // this._original = this._pixels.slice(0)
    // this._canvasWidth = canvas.width
    // this._canvasHeight = canvas.height
    // var step_size = 10
    // var max_angle = 2.0
  }

  _radians (angle) {
    return angle / 180 * CUDART_PIO2_F
  }

  /**
   * A unique string that identifies this operation. Can be used to select
   * the active filter.
   * @type {String}
   */
  static get identifier () { return 'stGauss' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'StGauss' }
}

export default StGaussFilter
