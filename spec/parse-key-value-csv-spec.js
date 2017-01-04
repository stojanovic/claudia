/*global describe, it, expect, require */
var parseKeyValueCSV = require('../src/util/parse-key-value-csv');
describe('parseKeyValueCSV', function () {
	'use strict';
	[undefined, false, '', ' ', ',', 'XPATH=YYY,,ZPATH=ZZZ', 'PPATH=XXX,XPATH,ZPATH=ZZZ', 'XPATH', '\n,\t'].forEach(function (invalidValue) {
		it('throws error for invalid [' + invalidValue + ']', function () {
			expect(function () {
				parseKeyValueCSV();
			}).toThrow();
		});
	});
	it('parses a single key-value pair', function () {
		expect(parseKeyValueCSV('XPATH=/var/www')).toEqual({'XPATH': '/var/www'});
		expect(parseKeyValueCSV('XPATH=')).toEqual({'XPATH': ''});
	});
	it('parses multiple comma separated key-value pair', function () {
		expect(parseKeyValueCSV('XPATH=/var/www,YPATH=/var/lib')).toEqual({'XPATH': '/var/www', 'YPATH': '/var/lib'});
		expect(parseKeyValueCSV('XPATH=,YPATH=/var/lib')).toEqual({'XPATH': '', 'YPATH': '/var/lib'});
		expect(parseKeyValueCSV('XPATH=abc,YPATH=/var/lib,ZPATH=')).toEqual({'XPATH': 'abc', 'YPATH': '/var/lib', ZPATH: ''});
		expect(parseKeyValueCSV('XPATH=abc,YPATH=,ZPATH=def')).toEqual({'XPATH': 'abc', 'YPATH': '', 'ZPATH': 'def'});
		expect(parseKeyValueCSV(' XPATH=abc,YPATH=,ZPATH=def ')).toEqual({'XPATH': 'abc', 'YPATH': '', 'ZPATH': 'def'});
	});
	it('supports = in the value', function () {
		expect(parseKeyValueCSV('XPATH=ab=c,YPATH=cd=e=f')).toEqual({'XPATH': 'ab=c', 'YPATH': 'cd=e=f'});
	});
});
