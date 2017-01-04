/*global describe, it, expect, require */
var iamNameSanitize = require('../src/util/iam-name-sanitize');
describe('iamNameSanitize', function () {
	'use strict';
	it('keeps alphanumeric characters, dash and underscore', function () {
		expect(iamNameSanitize('agaA293B-C_d123')).toEqual('agaA293B-C_d123');
	});
	it('replaces other characters with underscore', function () {
		expect(iamNameSanitize('ag.aA$29')).toEqual('ag_aA_29');
	});
});
