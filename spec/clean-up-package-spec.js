/*global describe, it, beforeEach, afterEach, require, it, expect */
var underTest = require('../src/tasks/clean-up-package'),
	shell = require('shelljs'),
	fs = require('fs'),
	ArrayLogger = require('../src/util/array-logger'),
	tmppath = require('../src/util/tmppath'),
	runNpm = require('../src/util/run-npm'),
	path = require('path');
describe('cleanUpPackage', function () {
	'use strict';
	var sourcedir, pwd,
		logger,
		configurePackage = function (packageConf) {
			fs.writeFileSync(path.join(sourcedir, 'package.json'), JSON.stringify(packageConf), 'utf8');
		};
	beforeEach(function (done) {
		sourcedir = tmppath();
		shell.mkdir(sourcedir);
		logger = new ArrayLogger();
		pwd = shell.pwd();
		configurePackage({
			dependencies: {
				'uuid': '^2.0.0'
			},
			optionalDependencies: {
				'minimist': '^1.2.0'
			}
		});
		runNpm(sourcedir, 'install', logger).then(done, done.fail);
	});
	afterEach(function () {
		shell.cd(pwd);
		if (sourcedir) {
			shell.rm('-rf', sourcedir);
		}
	});
	it('returns the directory path', function (done) {
		underTest(sourcedir, {}, logger).then(function (result) {
			expect(result).toEqual(sourcedir);
		}).then(done, done.fail);
	});
	it('does not clean up optional dependencies if not requested', function (done) {
		underTest(sourcedir, {}, logger).then(function (result) {
			expect(result).toEqual(sourcedir);
			expect(shell.test('-e', path.join(sourcedir, 'node_modules', 'uuid'))).toBeTruthy();
			expect(shell.test('-e', path.join(sourcedir, 'node_modules', 'minimist'))).toBeTruthy();
		}).then(done, done.fail);
	});
	it('cleans up optional dependencies if requested', function (done) {
		underTest(sourcedir, {'optional-dependencies': false}, logger).then(function (result) {
			expect(result).toEqual(sourcedir);
			expect(shell.test('-e', path.join(sourcedir, 'node_modules', 'uuid'))).toBeTruthy();
			expect(shell.test('-e', path.join(sourcedir, 'node_modules', 'minimist'))).toBeFalsy();
		}).then(done, done.fail);
	});
	it('removes .npmrc if exists', function (done) {
		fs.writeFileSync(path.join(sourcedir, '.npmrc'), 'optional = false', 'utf8');
		underTest(sourcedir, {}, logger).then(function (result) {
			expect(result).toEqual(sourcedir);
			expect(shell.test('-e', path.join(sourcedir, '.npmrc'))).toBeFalsy();
		}).then(done, done.fail);

	});
	it('fails if npm install fails', function (done) {
		configurePackage({
			files: ['root.txt'],
			dependencies: {
				'non-existing-package': '2.0.0'
			}
		});
		underTest(sourcedir, {'optional-dependencies': false}, logger).then(done.fail, function (reason) {
			expect(reason).toMatch(/npm install --production --no-optional failed/);
			done();
		});
	});
});
