/*global exports, require*/
var fs = require('fs');
exports.handler = function (event, context) {
	'use strict';
	context.succeed({
		files: fs.readdirSync('.')
	});
};
