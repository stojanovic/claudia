/*global require, describe, it, expect, beforeEach, Promise, jasmine */
var updateEnvVars = require('../src/tasks/update-env-vars'),
	fs = require('fs'),
	tmppath = require('../src/util/tmppath');

describe('updateEnvVars', function () {
	'use strict';
	var fakeLambdaAPI;

	beforeEach(function () {
		fakeLambdaAPI = jasmine.createSpyObj('lambda', ['updateFunctionConfiguration']);
		fakeLambdaAPI.updateFunctionConfiguration.and.returnValue(
			{
				promise: function () {
					return Promise.resolve();
				}
			}
		);
	});
	it('does not invoke the lambda method if no env options are provided', function (done) {
		updateEnvVars({a: 'b'}, fakeLambdaAPI, 'MyFunc').then(function () {
			expect(fakeLambdaAPI.updateFunctionConfiguration).not.toHaveBeenCalled();
		}).then(done, done.fail);
	});
	it('sets only the KMS key if it is the only option', function (done) {
		updateEnvVars({a: 'b', 'env-kms-key-arn': 'A:B:C'}, fakeLambdaAPI, 'MyFunc').then(function () {
			expect(fakeLambdaAPI.updateFunctionConfiguration).toHaveBeenCalledWith({
				FunctionName: 'MyFunc',
				KMSKeyArn: 'A:B:C'
			});
		}).then(done, done.fail);
	});
	it('sets only the variables if set-env is the only option', function (done) {
		updateEnvVars({a: 'b', 'set-env': 'A=B,C=D'}, fakeLambdaAPI, 'MyFunc').then(function () {
			expect(fakeLambdaAPI.updateFunctionConfiguration).toHaveBeenCalledWith({
				FunctionName: 'MyFunc',
				Environment: {
					Variables: {
						A: 'B',
						C: 'D'
					}
				}
			});
		}).then(done, done.fail);
	});
	it('sets only the variables if set-env-from-json is the only option', function (done) {
		var envpath = tmppath();
		fs.writeFileSync(envpath, JSON.stringify({'XPATH': '/opt', 'ZPATH': '/usr'}), 'utf8');
		updateEnvVars({a: 'b', 'set-env-from-json': envpath}, fakeLambdaAPI, 'MyFunc').then(function () {
			expect(fakeLambdaAPI.updateFunctionConfiguration).toHaveBeenCalledWith({
				FunctionName: 'MyFunc',
				Environment: {
					Variables: {
						XPATH: '/opt',
						ZPATH: '/usr'
					}
				}
			});
		}).then(done, done.fail);
	});
	it('sets both KMS key and environment variables if provided together', function (done) {
		updateEnvVars({a: 'b', 'env-kms-key-arn': 'A:B:C',  'set-env': 'A=B,C=D'}, fakeLambdaAPI, 'MyFunc').then(function () {
			expect(fakeLambdaAPI.updateFunctionConfiguration).toHaveBeenCalledWith({
				FunctionName: 'MyFunc',
				KMSKeyArn: 'A:B:C',
				Environment: {
					Variables: {
						A: 'B',
						C: 'D'
					}
				}
			});
		}).then(done, done.fail);
	});
});
