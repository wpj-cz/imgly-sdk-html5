/*
* Photo Editor SDK - photoeditorsdk.com
* Copyright (c) 2013-2015 9elements GmbH
*
* Released under Attribution-NonCommercial 3.0 Unported
* http://creativecommons.org/licenses/by-nc/3.0/
*
* For commercial use, please contact us at contact@9elements.com
*
* Sourced from Kyprianidis, J. E., Kang, H., and Doellner, J. "
* Anisotropic Kuwahara Filtering on the GPU," GPU Pro p.247 (2010).
*/

import Operation from './operation'
import Color from '../lib/color'
import Vector2 from '../lib/math/vector2'

/**
* An operation that turns an image into some piece of art
*
* @class
* @alias ImglyKit.Operations.BilateralOperation
* @extends ImglyKit.Operation
*/
class BilateralOperation extends Operation {
  constructor (...args) {
    super(...args)

    this._textureIndex = 1
    /**
    * The vertex shader used for this operation
    */
    this._vertexShader = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    const int GAUSSIAN_SAMPLES = 9;

    uniform float texelWidthOffset;
    uniform float texelHeightOffset;

    varying vec2 v_texCoord;
    varying vec2 blurCoordinates[GAUSSIAN_SAMPLES];

    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_texCoord = a_texCoord;

      int multiplier = 0;
      vec2 blurStep;
      vec2 singleStepOffset = vec2(texelWidthOffset, texelHeightOffset);

      for (int i = 0; i < GAUSSIAN_SAMPLES; i++)
      {
          multiplier = (i - ((GAUSSIAN_SAMPLES - 1) / 2));
          // Blur in x (horizontal)
          blurStep = float(multiplier) * singleStepOffset;
          blurCoordinates[i] = a_texCoord.xy + blurStep;
      }
    }
    `

    /**
    * The fragment shader used for this operation
    */
    this._fragmentShader = `
    uniform sampler2D inputImageTexture;

    const lowp int GAUSSIAN_SAMPLES = 9;

    varying highp vec2 textureCoordinate;
    varying highp vec2 blurCoordinates[GAUSSIAN_SAMPLES];

    uniform mediump float distanceNormalizationFactor;

    void main (void)
    {
      lowp vec4 centralColor;
       lowp float gaussianWeightTotal;
       lowp vec4 sum;
       lowp vec4 sampleColor;
       lowp float distanceFromCentralColor;
       lowp float gaussianWeight;

       centralColor = texture2D(inputImageTexture, blurCoordinates[4]);
       gaussianWeightTotal = 0.18;
       sum = centralColor * 0.18;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[0]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.05 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[1]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.09 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[2]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.12 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[3]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.15 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[5]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.15 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[6]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.12 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[7]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.09 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       sampleColor = texture2D(inputImageTexture, blurCoordinates[8]);
       distanceFromCentralColor = min(distance(centralColor, sampleColor) * distanceNormalizationFactor, 1.0);
       gaussianWeight = 0.05 * (1.0 - distanceFromCentralColor);
       gaussianWeightTotal += gaussianWeight;
       sum += sampleColor * gaussianWeight;

       gl_FragColor = sum / gaussianWeightTotal;
    }
    `
  }

  /**
  * Crops this image using WebGL
  * @param  {WebGLRenderer} renderer
  * @private
  */
  _renderWebGL (renderer) {
    this._setupProgram(renderer)
    var canvas = renderer.getCanvas()
    console.log(canvas.width, canvas.height)
    var texelSpacing = new Vector2(1.0, 1.0)
    renderer.runShader(null, this._fragmentShader, {
      uniforms: {
        distanceNormalizationFactor: { type: 'f', value: 8.0 },
        texelWidthOffset: { type: 'f', value: texelSpacing.x / canvas.width },
        texelHeightOffset: { type: 'f', value: texelSpacing.y / canvas.height }
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
  * Renders the bilateral operation to a canvas
  * @param  {CanvasRenderer} renderer
  * @private
  */
  _renderCanvas (renderer) {
    var canvas = renderer.getCanvas()
    var context = renderer.getContext()
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    var pixels = imageData.data
    var index
    var radius = 3
    var n = (radius + 1) * (radius + 1)
    var k = 0
    var l = 0
    var i = 0
    var j = 0
    for (var y = 0; y < canvas.height; y++) {
      for (var x = 0; x < canvas.width; x++) {
        var m0 = new Color(0.0, 0.0, 0.0, 1)
        var m1 = new Color(0.0, 0.0, 0.0, 1)
        var m2 = new Color(0.0, 0.0, 0.0, 1)
        var m3 = new Color(0.0, 0.0, 0.0, 1)
        var s0 = new Color(0.0, 0.0, 0.0, 1)
        var s1 = new Color(0.0, 0.0, 0.0, 1)
        var s2 = new Color(0.0, 0.0, 0.0, 1)
        var s3 = new Color(0.0, 0.0, 0.0, 1)
        var c = new Color(0.0, 0.0, 0.0, 1)
        for (j = -radius; j <= 0; ++j) {
          for (i = -radius; i <= 0; ++i) {
            k = x + i
            l = y + j
            if ((k >= 0 && k < canvas.width) && (l >= 0 && l < canvas.height)) {
              index = (l * canvas.width + k) * 4
              c.r = pixels[index] / 255.0
              c.g = pixels[index + 1] / 255.0
              c.b = pixels[index + 2] / 255.0
              m0.add(c)
              s0.add(c.multiply(c))
            }
          }
        }
        for (j = -radius; j <= 0; ++j) {
          for (i = 0; i <= radius; ++i) {
            k = x + i
            l = y + j
            if ((k >= 0 && k < canvas.width) && (l >= 0 && l < canvas.height)) {
              index = (l * canvas.width + k) * 4
              c.r = pixels[index] / 255.0
              c.g = pixels[index + 1] / 255.0
              c.b = pixels[index + 2] / 255.0
              m1.add(c)
              s1.add(c.multiply(c))
            }
          }
        }
        for (j = 0; j <= radius; ++j) {
          for (i = 0; i <= radius; ++i) {
            k = x + i
            l = y + j
            if ((k >= 0 && k < canvas.width) && (l >= 0 && l < canvas.height)) {
              index = (l * canvas.width + k) * 4
              c.r = pixels[index] / 255.0
              c.g = pixels[index + 1] / 255.0
              c.b = pixels[index + 2] / 255.0
              m2.add(c)
              s2.add(c.multiply(c))
            }
          }
        }
        for (j = 0; j <= radius; ++j) {
          for (i = -radius; i <= 0; ++i) {
            k = x + i
            l = y + j
            if ((k >= 0 && k < canvas.width) && (l >= 0 && l < canvas.height)) {
              index = (l * canvas.width + k) * 4
              c.r = pixels[index] / 255.0
              c.g = pixels[index + 1] / 255.0
              c.b = pixels[index + 2] / 255.0
              m3.add(c)
              s3.add(c.multiply(c))
            }
          }
        }
        index = (y * canvas.width + x) * 4
        var min_sigma2 = 25500
        m0.divide(n)
        s0.r = Math.abs(s0.r / n - m0.r * m0.r)
        s0.g = Math.abs(s0.g / n - m0.g * m0.g)
        s0.b = Math.abs(s0.b / n - m0.b * m0.b)
        var sigma2 = s0.r + s0.g + s0.b
        if (sigma2 < min_sigma2) {
          min_sigma2 = sigma2
          pixels[index] = m0.r * 255.0
          pixels[index + 1] = m0.g * 255.0
          pixels[index + 2] = m0.b * 255.0
        }
        m1.divide(n)
        s1.r = Math.abs(s1.r / n - m1.r * m1.r)
        s1.g = Math.abs(s1.g / n - m1.g * m1.g)
        s1.b = Math.abs(s1.b / n - m1.b * m1.b)
        sigma2 = s1.r + s1.g + s1.b
        if (sigma2 < min_sigma2) {
          min_sigma2 = sigma2
          pixels[index] = m1.r * 255.0
          pixels[index + 1] = m1.g * 255.0
          pixels[index + 2] = m1.b * 255.0
        }
        m2.divide(n)
        s2.r = Math.abs(s2.r / n - m2.r * m2.r)
        s2.g = Math.abs(s2.g / n - m2.g * m2.g)
        s2.b = Math.abs(s2.b / n - m2.b * m2.b)
        sigma2 = s2.r + s2.g + s2.b
        if (sigma2 < min_sigma2) {
          min_sigma2 = sigma2
          pixels[index] = m2.r * 255.0
          pixels[index + 1] = m2.g * 255.0
          pixels[index + 2] = m2.b * 255.0
        }
        m3.divide(n)
        s3.r = Math.abs(s3.r / n - m3.r * m3.r)
        s3.g = Math.abs(s3.g / n - m3.g * m3.g)
        s3.b = Math.abs(s3.b / n - m3.b * m3.b)
        sigma2 = s3.r + s3.g + s2.b
        if (sigma2 < min_sigma2) {
          min_sigma2 = sigma2
          pixels[index] = m3.r * 255.0
          pixels[index + 1] = m3.g * 255.0
          pixels[index + 2] = m3.b * 255.0
        }
      }
    }
    context.putImageData(imageData, 0, 0)
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
BilateralOperation.prototype.identifier = 'bilateral'

/**
* Specifies the available options for this operation
* @type {Object}
*/
BilateralOperation.prototype.availableOptions = {}

export default BilateralOperation
