/**
*
* @class
* @alias ImglyKit.Filter
*/

import Filter from '../filters/filter'

class CefFilter extends Filter {
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
  var img = renderer.getCanvas()
  this._canvasWidth = img.width
  this._canvasHeight = img.height
  this._setStaticParameters()
  this._renderer = renderer
  var st = null

  st = this._gpu_cef_st(img, st, this._sigma_d, this._tau_r, this._jacobi_steps)
}
/* THESE ARE SET in the original code, we have to mind these while converting
new ParamChoice (g, "order", "rk2", "euler|rk2", &m_order);
new ParamBool   (g, "adaptive", true, &m_adaptive);
new ParamChoice (g, "st_sampling", "linear", "nearest|linear", &m_st_sampling);
new ParamChoice (g, "color_sampling", "linear", "nearest|linear", &m_color_sampling);
g = new ParamGroup(this, "shock filtering", true, &m_shock_filtering);
g = new ParamGroup(this, "edge smoothing", true, &m_edge_smooting);
*/
_setStaticParameters () {
  this._sigma_d = 1.0
  this._tau_r = 0.002
  this._jacobi_steps = 1.0
  this._N = 10
  this._sigma_t = 6.0
  this._step_size = 1
  this._sigma_i = 0
  this._sigma_g = 1.5
  this._r = 2.0
  this._tau_s = 0.005
  this._sigma_a = 1.5
}

_gpu_cef_st (src, st_prev, sigma_d, tau_r, jacobi_steps) {
  var st = this._gpu_cef_scharr(src)
  st = this._gpu_cef_merge(st, st_prev)
  st = this._gpu_gauss_filter_xy(st, sigma_d)
  return st
}
// threshold = sigma_d
_gpu_cef_merge (st_cur, st_prev) {
  var dst = this._renderer.createCanvas() // TODO move canvas create, so we don't create it everytime
  dst.width = this._canvasWidth
  dst.height = this._canvasHeight
  var dstContext = dst.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, this._canvasWidth, this._canvasHeight)
  var dstPixels = dstData.data

  var curContext = st_cur.getContext('2d')
  var prevContext = st_prev.getContext('2d')
  var curData = curContext.getImageData(0, 0, this._canvasWidth, this._canvasHeight)
  var prevData = prevContext.getImageData(0, 0, this._canvasWidth, this._canvasHeight)
  var curPixels = curData.data
  var prevPixels = prevData.data

  var st = [0, 0, 0, 0]
  var index = 0
  for (let y = 1; y < this._canvasHeight; y++) {
    for (let x = 1; x < this._canvasWidth; x++) {
      index = (y * this._canvasWidth + x) * 4
      st[0] = curPixels[index]
      st[1] = curPixels[index + 1]
      st[2] = curPixels[index + 2]
      st[3] = curPixels[index + 3]

      let mag = this._st_lambda1(st[0], st[1], st[2])
      if (mag < this._sigma_d) {
        st[0] = prevPixels[index]
        st[1] = prevPixels[index + 1]
        st[2] = prevPixels[index + 2]
        st[3] = prevPixels[index + 3]
      } else {
        st[3] = 1
      }
      dstPixels[index] = st[0]
      dstPixels[index + 1] = st[1]
      dstPixels[index + 2] = st[2]
      dstPixels[index + 3] = st[3]
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

_gpu_cef_relax (st) {
  if ((st.width <= 2) || (st.height <= 2)) {
    return st
  }
  var tmp = this._gpu_cef_restrict(st)
  tmp = this._gpu_cef_relax(tmp)
  tmp = this._gpu_cef_interpolate(st, tmp)
  tmp = this._gpu_cef_jacobi_step(tmp)
  return tmp
}

_gpu_cef_restrict (st) {
  var dst = this._renderer.createCanvas() // TODO move canvas create, so we don't create it everytime
  dst.width = Math.round((this._canvasWidth + 1) / 2)
  dst.height = Math.round((this._canvasHeight + 1) / 2)
  var dstContext = dst.getContext('2d')
  var stContext = st.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, dst.width, dst.height)
  var stData = stContext.getImageData(0, 0, this._canvasWidth, this._canvasHeight)
  var dstPixels = dstData.data
  var stPixels = stData.data

  var index = 0

  for (let y = 1; y < dst.height; y++) {
    for (let x = 1; x < dst.width; x++) {
      index = (2 * y + this._canvasWidth + 2 * x) * 4
      var sum = [0, 0, 0, 0]
      if (stPixels[index + 3] > 0) {
        sum[0] += stPixels[index]
        sum[1] += stPixels[index + 1]
        sum[2] += stPixels[index + 2]
        sum[3] += stPixels[index + 3]
      }

      index = (2 * y + this._canvasWidth + 2 * x + 1) * 4
      if (stPixels[index + 3] > 0) {
        sum[0] += stPixels[index]
        sum[1] += stPixels[index + 1]
        sum[2] += stPixels[index + 2]
        sum[3] += stPixels[index + 3]
      }

      index = (2 * y + 1 + this._canvasWidth + 2 * x) * 4
      if (stPixels[index + 3] > 0) {
        sum[0] += stPixels[index]
        sum[1] += stPixels[index + 1]
        sum[2] += stPixels[index + 2]
        sum[3] += stPixels[index + 3]
      }

      index = (2 * y + 1 + this._canvasWidth + 2 * x + 1) * 4
      if (stPixels[index + 3] > 0) {
        sum[0] += stPixels[index]
        sum[1] += stPixels[index + 1]
        sum[2] += stPixels[index + 2]
        sum[3] += stPixels[index + 3]
      }

      if (sum[3] > 0) {
        sum[0] /= sum[3]
        sum[1] /= sum[3]
        sum[2] /= sum[3]
        sum[3] /= sum[3]
      }

      index = (y + this._canvasWidth + x) * 4
      dstPixels[index] = sum[0]
      dstPixels[index + 1] = sum[1]
      dstPixels[index + 2] = sum[2]
      dstPixels[index + 3] = sum[3]
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

_gpu_cef_interpolate (st_fine, st_coarse) {
  st_coarse = this._filterLinear(st_coarse)
  var dst = this._renderer.createCanvas()
  dst.width = st_fine.width
  dst.height = st_fine.height
  var dstContext = dst.getContext('2d')
  var fineContext = st_fine.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, dst.width, dst.height)
  var fineData = fineContext.getImageData(0, 0, dst.width, dst.height)
  var dstPixels = dstData.data
  var finePixels = fineData.data
  var coarsePixels = st_coarse.getContext('2d').getImageData(0, 0, st_coarse.width, st_coarse.height)

  var tmp = [0, 0, 0, 0]
  var index = 0
  var halfIndex = 0
  for (let y = 1; y < this._canvasHeight; y++) {
    for (let x = 1; x < this._canvasWidth; x++) {
      index = (y * this._canvasWidth + x) * 4
      if (srcPixels[index + 3] < 255) {
        halfIndex = ((y * 0.5) * this._canvasWidth + (x * 0.5) * 4
        tmp[index] = coarsePixels[halfIndex]
        tmp[index + 1] = coarsePixels[halfIndex + 1]
        tmp[index + 2] = coarsePixels[halfIndex + 2]
        tmp[index + 3] = 0
      } else {
        tmp[index] = srcPixels[index]
        tmp[index + 1] = srcPixels[index + 1]
        tmp[index + 2] = srcPixels[index + 2]
        tmp[index + 3] = srcPixels[index + 3]
      }
      dstPixels[index] = tmp[index]
      dstPixels[index + 1] = tmp[index + 1]
      dstPixels[index + 2] = tmp[index + 2]
      dstPixels[index + 3] = tmp[index + 3]
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

_gpu_cef_jacobi_step (st) {
  return st
}

_filterLinear (src) {
  var dst = this._renderer.createCanvas()
  dst.width = src.width
  dst.height = src.height
  var dstContext = dst.getContext('2d')
  var srcContext = src.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, dst.width, dst.height)
  var srcData = srcContext.getImageData(0, 0, this._canvasWidth, this._canvasHeight)
  var dstPixels = dstData.data
  var srcPixels = srcData.data

  var sum = [0, 0, 0, 0]
  var index = 0
  for (let y = 1; y < this._canvasHeight; y++) {
    for (let x = 1; x < this._canvasWidth; x++) {
      sum = [0, 0, 0, 0]
      for (let u = -1; u <= 1; u++) {
        for (let v = -1; v <= 1; v++) {
          index = ((y + v) * this._canvasWidth + (x + u)) * 4
          sum[0] += srcPixels[index]
          sum[1] += srcPixels[index + 1]
          sum[2] += srcPixels[index + 2]
          sum[3] += srcPixels[index + 3]
        }
      }
      sum[0] /= 9
      sum[1] /= 9
      sum[2] /= 9
      sum[3] /= 9

      index = (y * this._canvasWidth + x) * 4

      dstPixels[index] = sum[0]
      dstPixels[index + 1] = sum[1]
      dstPixels[index + 2] = sum[2]
      dstPixels[index + 3] = sum[3]
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

/*

gpu_image<float4> gpu_cef_relax( const gpu_image<float4>& st,
                                 int jacobi_steps )
{
    if ((st.w() <= 2) || (st.h() <= 2)) return st;
    gpu_image<float4> tmp;
    tmp = gpu_cef_restrict(st);
    tmp = gpu_cef_relax(tmp, jacobi_steps);
    tmp = gpu_cef_interpolate(st, tmp);
    for (int k = 0; k < jacobi_steps; ++k) {
        tmp = gpu_cef_jacobi_step(tmp);
    }
    return tmp;
}

 */

_st_lambda1 (E, F, G) {
  E /= 255.0
  F /= 255.0
  G /= 255.0

  var B = (E + G) / 2
  if (B > 0) {
    var D = (E - G) / 2
    var FF = F * F
    var R = Math.sqrt(D * D + FF)
    return (B + R) * 255.0
  }
  return 0
}

_gpu_cef_scharr (src) {
  var dst = this._renderer.createCanvas() // TODO move canvas create, so we don't create it everytime
  dst.width = this._canvasWidth
  dst.height = this._canvasHeight
  var dstContext = dst.getContext('2d')
  var srcContext = src.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, this._canvasWidth, this._canvasHeight)
  var srcData = srcContext.getImageData(0, 0, this._canvasWidth, this._canvasHeight)
  var dstPixels = dstData.data
  var original = srcData.data

  var index = 0
  var u = [0, 0, 0]
  var v = [0, 0, 0]
  for (var y = 1; y < this._canvasHeight; y++) {
    for (var x = 1; x < this._canvasWidth; x++) {
      var ix = x
      var iy = y
      for (var c = 0; c < 3; c++) {
        // calculate u
        u[c] = 0
        ix = x - 1
        iy = y - 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        u[c] += -0.183 * original[index]

        iy = y
        index = (iy * this._canvasWidth + ix) * 4 + c
        u[c] += -0.183 * original[index]

        iy = y + 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        u[c] += -0.183 * original[index]

        ix = x + 1
        iy = y - 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        u[c] += 0.183 * original[index]

        iy = y
        index = (iy * this._canvasWidth + ix) * 4 + c
        u[c] += 0.183 * original[index]

        iy = y + 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        u[c] += 0.183 * original[index]
        u[c] *= 0.5
        // calculate v
        v[c] = 0
        iy = y - 1
        ix = x - 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        v[c] += -0.183 * original[index]

        ix = x
        index = (iy * this._canvasWidth + ix) * 4 + c
        v[c] += -0.183 * original[index]

        ix = x + 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        v[c] += -0.183 * original[index]

        iy = y + 1
        ix = x - 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        v[c] += 0.183 * original[index]

        ix = x
        index = (iy * this._canvasWidth + ix) * 4 + c
        v[c] += 0.183 * original[index]

        ix = x + 1
        index = (iy * this._canvasWidth + ix) * 4 + c
        v[c] += 0.183 * original[index]
        v[c] *= 0.5
      }

      var g = [0, 0, 0]
      u[0] /= 255
      u[1] /= 255
      u[2] /= 255

      v[0] /= 255
      v[1] /= 255
      v[2] /= 255

      g[0] = u[0] * u[0] + u[1] * u[1] + u[2] * u[2]
      g[1] = v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
      g[2] = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]

      index = (y * this._canvasWidth + x) * 4
      dstPixels[index] = g[0] * 255
      dstPixels[index + 1] = g[1] * 255
      dstPixels[index + 2] = g[2] * 255
      dstPixels[index + 3] = 1
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

/**
* A unique string that identifies this operation. Can be used to select
* the active filter.
* @type {String}
*/
static get identifier () { return 'cefFilter' }

/**
* The name that is displayed in the UI
* @type {String}
*/
get name () { return 'CefFilter' }
}

export default CefFilter
