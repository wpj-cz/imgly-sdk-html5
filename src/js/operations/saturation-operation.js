"use strict";
/*!
 * Copyright (c) 2013-2014 9elements GmbH
 *
 * Released under Attribution-NonCommercial 3.0 Unported
 * http://creativecommons.org/licenses/by-nc/3.0/
 *
 * For commercial use, please contact us at contact@9elements.com
 */

var Operation = require("./operation");
var PrimitivesStack = require("./filters/primitives-stack");
var SaturationPrimitive = require("./filters/primitives/saturation");

/**
 * @class
 * @alias ImglyKit.Operations.SaturationOperation
 * @extends ImglyKit.Operation
 */
var SaturationOperation = Operation.extend({
  availableOptions: {
    saturation: { type: "number", default: 1.0 }
  }
});

/**
 * A unique string that identifies this operation. Can be used to select
 * operations.
 * @type {String}
 */
SaturationOperation.identifier = "saturation";

/**
 * Renders the filter
 * @param  {Renderer} renderer
 * @return {Promise}
 */
SaturationOperation.prototype.render = function(renderer) {
  var stack = new PrimitivesStack();

  stack.add(new SaturationPrimitive({
    saturation: this._options.saturation
  }));

  stack.render(renderer);
};

module.exports = SaturationOperation;