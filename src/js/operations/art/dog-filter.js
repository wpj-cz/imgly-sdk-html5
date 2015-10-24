/**
 *
 * @class
 * @alias ImglyKit.Filter
 */

import Filter from '../filters/filter'

class DogFilter extends Filter {
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

      uniform highp vec2 src_size;

      precision highp float;

      void main (void)
      {
        vec2 uv = v_texCoord;
        vec3 gray = vec3(0.299, 0.587, 0.114);
        vec3 colorMid = texture2D(inputImageTexture, uv).rgb;
        float grayMid = dot(colorMid, gray);
        vec3 colorUp = texture2D(inputImageTexture, uv + vec2(0.0, -1.0) * src_size).rgb;
        float grayUp = dot(colorUp, gray);
        vec3 colorDown = texture2D(inputImageTexture, uv + vec2(0.0, 1.0) * src_size).rgb;
        float grayDown = dot(colorDown, gray);
        vec3 colorLeft = texture2D(inputImageTexture, uv + vec2(-1.0, 0.0) * src_size).rgb;
        float grayLeft = dot(colorLeft, gray);
        vec3 colorRight = texture2D(inputImageTexture, uv + vec2(1.0, 0.0) * src_size).rgb;
        float grayRight = dot(colorRight, gray);

        float u = ( -grayLeft + grayRight) / 2.0;
        float v = ( -grayDown + grayUp) / 2.0;
        vec3 g = vec3(u * u, v * v, u * v);
        gl_FragColor = vec4(g.r, g.g, g.b, 1.0);
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
        src_size: { type: '2f', value: [ 1.0 / canvas.width, 1.0 / canvas.height ] }
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
    var canvas = renderer.getCanvas()
    var context = renderer.getContext()
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    this._setStaticParameters()

    st = this._gpu_cef_st(img, st, this._sigma_d, this._tau_r, this._jacobi_steps);

    context.putImageData(imageData, 0, 0)
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

  _gpu_cef_st(src, st_prev, sigma_d, tau_r, jacobi_steps) {
    dst = src.slice(0)
    st = this._gpu_cef_scharr(src)
    st = this._gpu_cef_merge(st, st_prev, tau_r, jacobi_steps)
    st = this._gpu_gauss_filter_xy(st, sigma_d)
    return st
  }
  /**
   * A unique string that identifies this operation. Can be used to select
   * the active filter.
   * @type {String}
   */
  static get identifier () { return 'dogFilter' }

  /**
   * The name that is displayed in the UI
   * @type {String}
   */
  get name () { return 'DogFilter' }
}

export default DogFilter
