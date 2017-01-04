/*global describe, require, it, expect, beforeEach, afterEach, console, setTimeout, Promise */
var underTest = require('../src/commands/add-s3-event-source'),
	create = require('../src/commands/create'),
	update = require('../src/commands/update'),
	shell = require('shelljs'),
	tmppath = require('../src/util/tmppath'),
	fs = require('fs'),
	path = require('path'),
	aws = require('aws-sdk'),
	awsRegion = require('./helpers/test-aws-region');
describe('addS3EventSource', function () {
	'use strict';
	var workingdir, testRunName, newObjects, s3,
		promiseDelay = function (delay) {
			return new Promise(function (resolve) {
				setTimeout(function () {
					resolve();
				}, delay);
			});
		};

	beforeEach(function () {
		workingdir = tmppath();
		s3 = new aws.S3();
		testRunName = 'test' + Date.now();
		newObjects = {workingdir: workingdir};
		shell.mkdir(workingdir);
	});
	afterEach(function (done) {
		this.destroyObjects(newObjects).then(done);
	});
	it('fails when the bucket is not defined in options', function (done) {
		underTest({source: workingdir}).then(done.fail, function (reason) {
			expect(reason).toEqual('bucket name not specified. please provide it with --bucket');
			done();
		});
	});
	it('fails when the source dir does not contain the project config file', function (done) {
		underTest({bucket: 'b', source: workingdir}).then(done.fail, function (reason) {
			expect(reason).toEqual('claudia.json does not exist in the source folder');
			done();
		});
	});
	it('fails when the project config file does not contain the lambda name', function (done) {
		fs.writeFileSync(path.join(workingdir, 'claudia.json'), '{}', 'utf8');
		underTest({bucket: 'b', source: workingdir}).then(done.fail, function (reason) {
			expect(reason).toEqual('invalid configuration -- lambda.name missing from claudia.json');
			done();
		});
	});
	it('fails when the project config file does not contain the lambda region', function (done) {
		fs.writeFileSync(path.join(workingdir, 'claudia.json'), JSON.stringify({lambda: {name: 'xxx'}}), 'utf8');
		underTest({bucket: 'b', source: workingdir}).then(done.fail, function (reason) {
			expect(reason).toEqual('invalid configuration -- lambda.region missing from claudia.json');
			done();
		});
	});
	it('fails when the project config file does not contain the lambda role', function (done) {
		fs.writeFileSync(path.join(workingdir, 'claudia.json'), JSON.stringify({lambda: {name: 'xxx', region: 'abc'}}), 'utf8');
		underTest({bucket: 'b', source: workingdir}).then(done.fail, function (reason) {
			expect(reason).toEqual('invalid configuration -- lambda.role missing from claudia.json');
			done();
		});
	});


	describe('when params are valid', function () {
		var bucketSuffix = '.bucket';
		beforeEach(function (done) {
			shell.cp('-r', 'spec/test-projects/s3-remover/*', workingdir);
			s3.createBucket({
				Bucket: testRunName + bucketSuffix,
				ACL: 'private'
			}).promise().then(function () {
				newObjects.s3Bucket = testRunName + bucketSuffix;
			}).then(done);
		});
		it('sets up privileges and s3 notifications for any created files in the s3 bucket', function (done) {
			create({name: testRunName, region: awsRegion, source: workingdir, handler: 'main.handler'}).then(function (result) {
				newObjects.lambdaRole = result.lambda && result.lambda.role;
				newObjects.lambdaFunction = result.lambda && result.lambda.name;
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix});
			}).then(function () {
				// needs better...
				console.log('waiting for IAM propagation');
				return promiseDelay(5000);
			}).then(function () {
				return s3.putObject({
					Bucket: testRunName + bucketSuffix,
					Key: testRunName  + '.txt',
					Body: 'file contents',
					ACL: 'private'
				}).promise();
			}).then(function () {
				return s3.waitFor('objectNotExists', {
					Bucket: testRunName + bucketSuffix,
					Key: testRunName  + '.txt'
				}).promise();
			}).then(done, done.fail);
		});
		it('adds a prefix if requested', function (done) {
			create({name: testRunName, region: awsRegion, source: workingdir, handler: 'main.handler'}).then(function (result) {
				newObjects.lambdaRole = result.lambda && result.lambda.role;
				newObjects.lambdaFunction = result.lambda && result.lambda.name;
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix, prefix: 'in/'});
			}).then(function () {
				return s3.getBucketNotificationConfiguration({
					Bucket: testRunName + bucketSuffix
				}).promise();
			}).then(function (config) {
				expect(config.LambdaFunctionConfigurations[0].Filter.Key.FilterRules[0]).toEqual({
					Name: 'Prefix',
					Value: 'in/'
				});
			}).then(done, done.fail);
		});
		it('adds default event if no events requested', function (done) {
			create({name: testRunName, region: awsRegion, source: workingdir, handler: 'main.handler'}).then(function (result) {
				newObjects.lambdaRole = result.lambda && result.lambda.role;
				newObjects.lambdaFunction = result.lambda && result.lambda.name;
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix});
			}).then(function () {
				return s3.getBucketNotificationConfiguration({
					Bucket: testRunName + bucketSuffix
				}).promise();
			}).then(function (config) {
				expect(config.LambdaFunctionConfigurations[0].Events).toEqual(['s3:ObjectCreated:*']);
			}).then(done, done.fail);
		});
		it('adds events if requested', function (done) {
			create({name: testRunName, region: awsRegion, source: workingdir, handler: 'main.handler'}).then(function (result) {
				newObjects.lambdaRole = result.lambda && result.lambda.role;
				newObjects.lambdaFunction = result.lambda && result.lambda.name;
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix, events: 's3:ObjectCreated:*,s3:ObjectRemoved:*'});
			}).then(function () {
				return s3.getBucketNotificationConfiguration({
					Bucket: testRunName + bucketSuffix
				}).promise();
			}).then(function (config) {
				expect(config.LambdaFunctionConfigurations[0].Events.sort()).toEqual(['s3:ObjectCreated:*', 's3:ObjectRemoved:*']);
			}).then(done, done.fail);
		});
		it('binds to an alias, if the version is provided', function (done) {
			create({name: testRunName, region: awsRegion, source: workingdir, handler: 'main.handler', version: 'special'}).then(function (result) {
				newObjects.lambdaRole = result.lambda && result.lambda.role;
				newObjects.lambdaFunction = result.lambda && result.lambda.name;
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix, version: 'special'});
			}).then(function () {
				return s3.getBucketNotificationConfiguration({
					Bucket: testRunName + bucketSuffix
				}).promise();
			}).then(function (config) {
				expect(/:special$/.test(config.LambdaFunctionConfigurations[0].LambdaFunctionArn)).toBeTruthy();
			}).then(done, done.fail);
		});
		it('can execute aliased functions', function (done) {
			create({name: testRunName, region: awsRegion, source: workingdir, handler: 'main.handler', version: 'special'}).then(function (result) {
				newObjects.lambdaRole = result.lambda && result.lambda.role;
				newObjects.lambdaFunction = result.lambda && result.lambda.name;
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix, version: 'special'});
			}).then(function () {
				// needs better...
				console.log('waiting for IAM propagation');
				return promiseDelay(5000);
			}).then(function () {
				return s3.putObject({
					Bucket: testRunName + bucketSuffix,
					Key: testRunName  + '.txt',
					Body: 'file contents',
					ACL: 'private'
				}).promise();
			}).then(function () {
				return s3.waitFor('objectNotExists', {
					Bucket: testRunName + bucketSuffix,
					Key: testRunName  + '.txt'
				}).promise();
			}).then(done, done.fail);
		});
		it('does not change any existing notification configurations', function (done) {
			create({name: testRunName, region: awsRegion, source: workingdir, handler: 'main.handler', version: 'special'}).then(function (result) {
				newObjects.lambdaRole = result.lambda && result.lambda.role;
				newObjects.lambdaFunction = result.lambda && result.lambda.name;
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix, version: 'special',  prefix: '/special/'});
			}).then(function () {
				shell.cp('-rf', 'spec/test-projects/echo/*', workingdir);
				return update({source: workingdir, version: 'crazy'});
			}).then(function () {
				return underTest({source: workingdir, bucket: testRunName + bucketSuffix, version: 'crazy',  prefix: '/crazy/'});
			}).then(function () {
				return s3.getBucketNotificationConfiguration({
					Bucket: testRunName + bucketSuffix
				}).promise();
			}).then(function (config) {
				expect(config.LambdaFunctionConfigurations.length).toEqual(2);
				expect(/:special$/.test(config.LambdaFunctionConfigurations[0].LambdaFunctionArn)).toBeTruthy();
				expect(/:crazy$/.test(config.LambdaFunctionConfigurations[1].LambdaFunctionArn)).toBeTruthy();
			}).then(done, done.fail);
		});
	});

});
