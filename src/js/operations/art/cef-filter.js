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
//  console.log(img)
  this._setStaticParameters()
  this._renderer = renderer
  var st = null
  for (var k = 0; k < this._N; ++k) {
    st = this._gpu_cef_st(img, st, this._sigma_d, this._tau_r, this._jacobi_steps)
    img = this._gpu_stgauss3_filter(img, st)
  }

  var context = st.getContext('2d')
  var imageData = context.getImageData(0, 0, img.width, img.height)
  var index = 0
  for (let y = 1; y < st.height; y++) {
    for (let x = 1; x < st.width; x++) {
      index = (y * st.width + x) * 4
      imageData.data[index + 3] = 255
    }
  }
  img.getContext('2d').putImageData(imageData, 0, 0)
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
  st = this._filterLinear(st)
  return st
}
// threshold = sigma_d
_gpu_cef_merge (st_cur, st_prev) {
  if (st_prev === null) {
    console.log('null')
    return this._gpu_cef_jacobi_step(st_cur)
  }

  var dst = this._renderer.createCanvas() // TODO move canvas create, so we don't create it everytime
  dst.width = st_cur.width
  dst.height = st_cur.height
  var dstContext = dst.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, st_cur.width, st_cur.height)
  var dstPixels = dstData.data

  var curContext = st_cur.getContext('2d')
  var prevContext = st_prev.getContext('2d')
  var curData = curContext.getImageData(0, 0, st_cur.width, st_cur.height)
  var prevData = prevContext.getImageData(0, 0, st_cur.width, st_cur.height)
  var curPixels = curData.data
  var prevPixels = prevData.data

  var st = [0, 0, 0, 0]
  var index = 0
  for (let y = 0; y < st_cur.height; y++) {
    for (let x = 0; x < st_cur.width; x++) {
      index = (y * st_cur.width + x) * 4
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
  dst.width = Math.round((st.width + 1) / 2)
  dst.height = Math.round((st.height + 1) / 2)
  var dstContext = dst.getContext('2d')
  var stContext = st.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, dst.width, dst.height)
  var stData = stContext.getImageData(0, 0, st.width, st.height)
  var dstPixels = dstData.data
  var stPixels = stData.data

  var index = 0

  for (let y = 1; y < st.height; y++) {
    for (let x = 1; x < st.width; x++) {
      index = (2 * y + st.width + 2 * x) * 4
      var sum = [0, 0, 0, 0]
      if (stPixels[index + 3] > 0) {
        sum[0] += stPixels[index]
        sum[1] += stPixels[index + 1]
        sum[2] += stPixels[index + 2]
        sum[3] += stPixels[index + 3]
      }

      index = (2 * y + st.width + 2 * x + 1) * 4
      if (stPixels[index + 3] > 0) {
        sum[0] += stPixels[index]
        sum[1] += stPixels[index + 1]
        sum[2] += stPixels[index + 2]
        sum[3] += stPixels[index + 3]
      }

      index = (2 * y + 1 + st.width + 2 * x) * 4
      if (stPixels[index + 3] > 0) {
        sum[0] += stPixels[index]
        sum[1] += stPixels[index + 1]
        sum[2] += stPixels[index + 2]
        sum[3] += stPixels[index + 3]
      }

      index = (2 * y + 1 + st.width + 2 * x + 1) * 4
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

      index = (y + st.width + x) * 4
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
  var st_coarse_filtred = this._filterLinear(st_coarse)
  var dst = this._renderer.createCanvas()
  dst.width = st_fine.width
  dst.height = st_fine.height
  var dstContext = dst.getContext('2d')
  var fineContext = st_fine.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, dst.width, dst.height)
  var fineData = fineContext.getImageData(0, 0, dst.width, dst.height)
  var dstPixels = dstData.data
  var finePixels = fineData.data
  var coarsePixels = st_coarse_filtred.getContext('2d').getImageData(0, 0, st_coarse.width, st_coarse.height)

  var tmp = [0, 0, 0, 0]
  var index = 0
  var halfIndex = 0
  for (let y = 1; y < st_fine.height; y++) {
    for (let x = 1; x < st_fine.width; x++) {
      index = (y * st_fine.width + x) * 4
      if (finePixels[index + 3] < 1) {
        halfIndex = ((y * 0.5) * st_fine.width + (x * 0.5) * 4)
        tmp[0] = coarsePixels[halfIndex]
        tmp[1] = coarsePixels[halfIndex + 1]
        tmp[2] = coarsePixels[halfIndex + 2]
        tmp[3] = 0
      } else {
        tmp[0] = finePixels[index]
        tmp[1] = finePixels[index + 1]
        tmp[2] = finePixels[index + 2]
        tmp[3] = finePixels[index + 3]
      }
      dstPixels[index] = tmp[0]
      dstPixels[index + 1] = tmp[1]
      dstPixels[index + 2] = tmp[2]
      dstPixels[index + 3] = tmp[3]
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

_gpu_cef_jacobi_step (src) {
  var dst = this._renderer.createCanvas()
  dst.width = src.width
  dst.height = src.height
  var dstContext = dst.getContext('2d')
  var srcContext = src.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, dst.width, dst.height)
  var srcData = srcContext.getImageData(0, 0, src.width, src.width)
  var dstPixels = dstData.data
  var srcPixels = srcData.data

  var tmp = [0, 0, 0, 0]
  var index = 0
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      index = (y * src.width + x) * 4
      if (srcPixels[index + 3] < 1) {
        var tmpIndex = (y * src.width + (x + 1) * 4)
        tmp[0] = srcPixels[tmpIndex]
        tmp[1] = srcPixels[tmpIndex + 1]
        tmp[2] = srcPixels[tmpIndex + 2]

        tmpIndex = (y * src.width + (x - 1) * 4)
        tmp[0] += srcPixels[tmpIndex]
        tmp[1] += srcPixels[tmpIndex + 1]
        tmp[2] += srcPixels[tmpIndex + 2]

        tmpIndex = ((y + 1) * src.width + x * 4)
        tmp[0] += srcPixels[tmpIndex]
        tmp[1] += srcPixels[tmpIndex + 1]
        tmp[2] += srcPixels[tmpIndex + 2]

        tmpIndex = ((y - 1) * src.width + x * 4)
        tmp[0] += srcPixels[tmpIndex]
        tmp[1] += srcPixels[tmpIndex + 1]
        tmp[2] += srcPixels[tmpIndex + 2]

        tmp[0] /= 4
        tmp[1] /= 4
        tmp[2] /= 4
        tmp[3] = 0
      } else {
        tmp[0] = srcPixels[index]
        tmp[1] = srcPixels[index + 1]
        tmp[2] = srcPixels[index + 2]
        tmp[3] = srcPixels[index + 3]
      }

      dstPixels[index] = tmp[0]
      dstPixels[index + 1] = tmp[1]
      dstPixels[index + 2] = tmp[2]
      dstPixels[index + 3] = tmp[3]
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

_filterLinear (src) {
  var dst = this._renderer.createCanvas()
  dst.width = src.width
  dst.height = src.height
  var dstContext = dst.getContext('2d')
  var srcContext = src.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, dst.width, dst.height)
  var srcData = srcContext.getImageData(0, 0, src.width, dst.height)
  var dstPixels = dstData.data
  var srcPixels = srcData.data

  var sum = [0, 0, 0, 0]
  var index = 0
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      sum = [0, 0, 0, 0]
      for (let u = -1; u <= 1; u++) {
        for (let v = -1; v <= 1; v++) {
          index = ((y + v) * src.width + (x + u)) * 4
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

      index = (y * src.width + x) * 4

      dstPixels[index] = sum[0]
      dstPixels[index + 1] = sum[1]
      dstPixels[index + 2] = sum[2]
      dstPixels[index + 3] = sum[3]
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

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
  dst.width = src.width
  dst.height = src.height
  var dstContext = dst.getContext('2d')
  var srcContext = src.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, src.width, src.height)
  var srcData = srcContext.getImageData(0, 0, src.width, src.height)
  var dstPixels = dstData.data
  var original = srcData.data

  var index = 0
  var u = [0, 0, 0]
  var v = [0, 0, 0]
  for (var y = 0; y < src.height; y++) {
    for (var x = 0; x < src.width; x++) {
      var ix = x
      var iy = y
      for (var c = 0; c < 3; c++) {
        // calculate u
        u[c] = 0
        ix = x - 1
        iy = y - 1
        index = (iy * src.width + ix) * 4 + c
        u[c] += -0.183 * original[index]

        iy = y
        index = (iy * src.width + ix) * 4 + c
        u[c] += -0.183 * original[index]

        iy = y + 1
        index = (iy * src.width + ix) * 4 + c
        u[c] += -0.183 * original[index]

        ix = x + 1
        iy = y - 1
        index = (iy * src.width + ix) * 4 + c
        u[c] += 0.183 * original[index]

        iy = y
        index = (iy * src.width + ix) * 4 + c
        u[c] += 0.183 * original[index]

        iy = y + 1
        index = (iy * src.width + ix) * 4 + c
        u[c] += 0.183 * original[index]
        u[c] *= 0.5
        // calculate v
        v[c] = 0
        iy = y - 1
        ix = x - 1
        index = (iy * src.width + ix) * 4 + c
        v[c] += -0.183 * original[index]

        ix = x
        index = (iy * src.width + ix) * 4 + c
        v[c] += -0.183 * original[index]

        ix = x + 1
        index = (iy * src.width + ix) * 4 + c
        v[c] += -0.183 * original[index]

        iy = y + 1
        ix = x - 1
        index = (iy * src.width + ix) * 4 + c
        v[c] += 0.183 * original[index]

        ix = x
        index = (iy * src.width + ix) * 4 + c
        v[c] += 0.183 * original[index]

        ix = x + 1
        index = (iy * src.width + ix) * 4 + c
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

      index = (y * src.width + x) * 4
      dstPixels[index] = g[0] * 255
      dstPixels[index + 1] = g[1] * 255
      dstPixels[index + 2] = g[2] * 255
      dstPixels[index + 3] = 1
    }
  }
  dstContext.putImageData(dstData, 0, 0)
  return dst
}

// __device__ void operator()(float u, float2 p)
_stgauss3_filter_f (src_pixel, u, x, y) {
  var k = Math.exp(-u * u / this._stgauss3_filter_twoSigma2)

  this._stgauss3_filter_c[0] += k * src_pixel[0]
  this._stgauss3_filter_c[1] += k * src_pixel[1]
  this._stgauss3_filter_c[2] += k * src_pixel[2]

  this._stgauss3_filter_w += k
}

_st_integrate_rk2 (src, st, x, y) {
  var stContext = st.getContext('2d')
  var stData = stContext.getImageData(0, 0, st.width, st.height)
  var stPixels = stData.data
  var srcContext = src.getContext('2d')
  var srcData = srcContext.getImageData(0, 0, src.width, src.height)
  var srcPixels = srcData.data

  var index = (y * src.width + x) * 4
  var src_pixel = [srcPixels[index], srcPixels[index + 1], srcPixels[index + 2]]
  var st_pixel = [stPixels[index], stPixels[index + 1], stPixels[index + 2]]

  this._stgauss3_filter_f(src_pixel, 0, x, y)
  var v0 = this._st_minor_ev(st_pixel)
  var sign = -1
//  var dr = this._stgauss3_filter_radius / Math.PI
  do {
    var v = [v0[0] * sign, v0[1] * sign]
    var px = x
    var py = y
    var u = 0

    for (var kk = 0; kk < 100; ++kk) {
      index = (py * src.width + px) * 4
      st_pixel = [stPixels[index], stPixels[index + 1], stPixels[index + 2]]
      var t = this._st_minor_ev(st_pixel)
      if (this._dot(v, t) < 0) {
        t[0] = -t[0]
        t[1] = -t[1]
      }

      var phx = px + 0.5 * this._step_size * t[0]
      var phy = py + 0.5 * this._step_size * t[1]

      index = (phy * src.width + phx) * 4
      st_pixel = [stPixels[index], stPixels[index + 1], stPixels[index + 2]]
      t = this._st_minor_ev(st_pixel)
      var vt = this._dot(v, t)
      if (vt < 0) {
        t[0] = -t[0]
        t[1] = -t[1]
        vt = -vt
      }

      v = t
      px += this._step_size * t[0]
      py += this._step_size * t[1]

/*      if (adaptive) {
          var Lk = dr * acosf(fminf(vt,1));
          u += fmaxf(step_size, Lk);
      } else {*/
      u += this._step_size
      // }

      if ((u >= this._stgauss3_filter_radius) || (px < 0) || (px >= src.width) ||
          (py < 0) || (py >= src.height)) {
        break
      }
      if (sign > 0) {
        if (u < 0) {
          u *= -1
        }
      } else {
        if (u > 0) {
          u *= -1
        }
      }
      index = (py * src.width + px) * 4
      src_pixel = [srcPixels[index], srcPixels[index + 1], srcPixels[index + 2]]
      this._stgauss3_filter_f(src_pixel, u, px, py)
    }
    sign *= -1
  } while (sign > 0)
}

_dot (v, t) {
  return v[0] * t[0] + v[1] * t[1]
}

_st_minor_ev (g) {
  var ev = this._solve_eig_psd_ev(g[0], g[1], g[2])
  return [ev[1], -ev[0]]
}

_solve_eig_psd_ev (E, F, G) {
  var B = (E + G) / 2
  if (B > 0) {
    var D = (E - G) / 2
    var FF = F * F
    var R = Math.sqrt(D * D + FF)
    if (R > 0) {
      if (D >= 0) {
        var nx = D + R
        let temp = Math.sqrt(nx * nx + FF)
        return [nx * temp, F * temp]
      } else {
        var ny = -D + R
        let temp = Math.sqrt(ny * ny + FF)
        return [F * temp, ny * temp]
      }
    }
  }
  return [1, 0]
}

_gpu_stgauss3_filter (src, st) {
  var dst = this._renderer.createCanvas() // TODO move canvas create, so we don't create it everytime
  dst.width = src.width
  dst.height = src.height
  var dstContext = dst.getContext('2d')
  var dstData = dstContext.getImageData(0, 0, src.width, src.height)
  var dstPixels = dstData.data
  this._init_stgauss_f()

  var index = 0
  for (var y = 0; y < src.height; y++) {
    for (var x = 0; x < src.width; x++) {
      this._stgauss3_filter_c = [0, 0, 0]
      this._stgauss3_filter_w = 0
      this._st_integrate_rk2(src, st, x, y)
      dstPixels[index] = this._stgauss3_filter_c[0] / this._stgauss3_filter_w
      dstPixels[index + 1] = this._stgauss3_filter_c[1] / this._stgauss3_filter_w
      dstPixels[index + 2] = this._stgauss3_filter_c[2] / this._stgauss3_filter_w
      dstPixels[index + 3] = 1
    }
  }
}

_init_stgauss_f () {
  this._stgauss3_filter_radius = 2 * this._sigma_t
  this._stgauss3_filter_twoSigma2 = 2 * this._sigma_t * this._sigma_t
  this._stgauss3_filter_c = [0, 0, 0]
  this._stgauss3_filter_w = 0
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
