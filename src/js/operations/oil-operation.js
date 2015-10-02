/*
 * Photo Editor SDK - photoeditorsdk.com
 * Copyright (c) 2013-2015 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

import Operation from './operation'
import Vector2 from '../lib/math/vector2'

/**
 * An operation that can draw oiles on the canvas
 *
 * @class
 * @alias ImglyKit.Operations.OilOperation
 * @extends ImglyKit.Operation
 */
class OilOperation extends Operation {
  constructor (...args) {
    super(...args)

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
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;

      void main() {
        vec4 color0 = vec4(1.0,1,0,0.5);
        gl_FragColor = color0;
      }
    `
  }

  /**
   * Crops this image using WebGL
   * @param  {WebGLRenderer} renderer
   * @private
   */
  /* istanbul ignore next */
  _renderWebGL (renderer) {
    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    this._setupProgram(renderer)
    // Execute the shader
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
  _renderCanvas (renderer) {
  }

  /**
   * returns the longer size of the canvas
   * @param {Canvas}
   * @return {Number}
   */
  _getLongerSideSize (canvas) {
    return Math.max(canvas.width, canvas.height)
  }

  /**
   * Gets called when this operation has been set to dirty
   * @private
   */
  _onDirty () {
  }
}

/**
 * A unique string that identifies this operation. Can be used to select
 * operations.
 * @type {String}
 */
OilOperation.prototype.identifier = 'oil'

/**
 * Specifies the available options for this operation
 * @type {Object}
 */
OilOperation.prototype.availableOptions = {}

export default OilOperation
