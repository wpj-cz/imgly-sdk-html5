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

/**
 * An operation that can apply a selected filter
 *
 * @class
 * @alias ImglyKit.Operations.CropOperation
 * @extends ImglyKit.Operation
 */
var CropOperation = Operation.extend({

}, {
  identifier: "crop"
});

module.exports = CropOperation;