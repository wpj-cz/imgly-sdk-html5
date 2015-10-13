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
import OilFilter from './art/oil-filter'
import Rgb2LabFilter from './art/rgb2lab-filter'
import Lab2RgbFilter from './art/lab2rgb-filter'
import DogFilter from './art/dog-filter'
import SobelFilter from './art/sobel-filter'

/**
* An operation that turns an image into some piece of art
*
* @class
* @alias ImglyKit.Operations.ArtOperation
* @extends ImglyKit.Operation
*/
class ArtOperation extends Operation {
  constructor (...args) {
    super(...args)
    this._oilFilter = new OilFilter()
    this._rgb2labFilter = new Rgb2LabFilter()
    this._lab2rgbFilter = new Lab2RgbFilter()
    this._dogFilter = new DogFilter()
    this._sobelFilter = new SobelFilter()
  }

  /**
  * Crops this image using WebGL
  * @param  {WebGLRenderer} renderer
  * @private
  */
  _renderWebGL (renderer) {
    this._sobelFilter.renderWebGL(renderer)
  }

  /**
  * Renders the art operation to a canvas
  * @param  {CanvasRenderer} renderer
  * @private
  */
  _renderCanvas (renderer) {
    this._sobelFilter.renderCanvas(renderer)
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
ArtOperation.prototype.identifier = 'art'

/**
* Specifies the available options for this operation
* @type {Object}
*/
ArtOperation.prototype.availableOptions = {}

export default ArtOperation
