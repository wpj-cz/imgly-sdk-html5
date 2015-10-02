/* global __DOTJS_TEMPLATE */
/*
 * Photo Editor SDK - photoeditorsdk.com
 * Copyright (c) 2013-2015 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

import Control from './control'
// import Vector2 from '../../../lib/math/vector2'
// import Utils from '../../../lib/utils'
import SimpleSlider from '../lib/simple-slider'
import ColorPicker from '../lib/color-picker'

class OilControl extends Control {
  /**
   * Entry point for this control
   */
  init () {
    let controlsTemplate = __DOTJS_TEMPLATE('../../../templates/night/operations/oil_controls.jst')
    this._controlsTemplate = controlsTemplate

    let canvasControlsTemplate = __DOTJS_TEMPLATE('../../../templates/night/operations/oil_canvas.jst')
    this._canvasControlsTemplate = canvasControlsTemplate

    this._partialTemplates.slider = SimpleSlider.template
    this._partialTemplates.colorPicker = ColorPicker.template
  }

  /**
   * Renders the controls
   */
  _renderControls () {
    this._partialTemplates.colorPicker.additionalContext = { label: this._ui.translate('controls.oil.color') }
    super._renderControls()
  }

  /**
   * Gets called when this control is activated
   * @override
   */
  _onEnter () {
    super._onEnter()
    this._setupCanvas()
    this._setupOperation()
    this._setupOptions()

    this._initialZoomLevel = this._ui.canvas.zoomLevel
    this._ui.canvas.zoomToFit()
  }

  /**
   * Sets the initital options up
   */
  _setupOptions () {
    this._initialOptions = {
    }
  }

  /**
   * Sets up the canvas
   * @private
   */
  _setupCanvas () {
    const { canvas } = this._ui
    this._canvas = this._canvasControls.querySelector('canvas')
    this._canvas.width = canvas.size.x
    this._canvas.height = canvas.size.y
  }

  /**
   * Sets up the operation
   */
  _setupOperation () {
    this._operationExistedBefore = !!this._ui.operations.oil
    this._operation = this._ui.getOrCreateOperation('oil')
  }

  /**
   * Gets called when the back button has been clicked
   * @private
   */
  _onBackButtonClick () {

    super._onBackButtonClick()
  }

  /**
   * Gets called when the back button has been clicked
   * @override
   */
  _onBack () {
    if (!this._operationExistedBefore && !this._operation.getPaths().length) {
      this._ui.removeOperation('oil')
    } else {
      this._operation.dirty = true
    }
    this._ui.canvas.setZoomLevel(this._initialZoomLevel)
  }

  /**
   * Resets the operation options to the initial options
   */
  _resetOperationSettings () {
    this._operation.setPaths(this._initialOptions.paths)
  }

  /**
   * The data that is available to the template
   * @abstract
   */
  get context () {
    return {
    }
  }
}

/**
 * A unique string that identifies this control.
 * @type {String}
 */
OilControl.prototype.identifier = 'oil'

export default OilControl
