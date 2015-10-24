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

  /*
  gpu_image<float4> img = gpu_image_from_qimage<float4>(src);
      gpu_image<float4> st;

      for (int k = 0; k < m_N; ++k) {
          st = gpu_cef_st(img, st, m_sigma_d, m_tau_r, m_jacobi_steps);
          if (k == m_N-1) m_st = st.cpu();
          img = gpu_stgauss3_filter(
              img,
              st,
              m_sigma_t,
              m_color_sampling == "linear",
              m_st_sampling == "linear",
              (m_order == "rk2")? 2 : 1,
              m_step_size,
              m_adaptive);

          if (m_shock_filtering) {
              st = gpu_cef_st(img, st, m_sigma_d, m_tau_r, m_jacobi_steps);
              gpu_image<float> L = gpu_rgb2gray(img);
              L =  gpu_gauss_filter_xy(L, m_sigma_i);
              gpu_image<float> sign = gpu_cef_flog(L, st, m_sigma_g);
              img = gpu_cef_shock(L, st, sign, img, m_radius, m_tau_s);
          }
      }

      if (m_edge_smooting) {
          img = gpu_stgauss3_filter(img, st, m_sigma_a, true, true, 2, 1, false);
      }
  */

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
    st = this._gpu_cef_merge(st, st_prev, tau_r, jacobi_steps)
    st = this._gpu_gauss_filter_xy(st, sigma_d)
    return st
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
