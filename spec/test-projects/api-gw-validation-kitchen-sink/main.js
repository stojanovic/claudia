/*global exports*/
exports.apiConfig = function () {
	'use strict';
	return {
		version: 3,
		authorizers: {
			first: { lambdaName: 'nameOnly' },
			second: { lambdaName: 'name', lambdaVersion: 'version' },
			third: { lambdaArn: 'arn' }
		},
		routes: {
			authorizers: { 'GET': { customAuthorizer: 'first', success: { contentType: 'text/html' }, error: { headers: {'Content-Type': 'xxx'}}}},
			successCode: { 'GET': { success: 302 } },
			enumeratedSuccessHeaders: { 'GET': { success: { headers: ['Mix', 'Max'] } } },
			defaultedSuccessHeaders: { 'GET': { success: { headers: {'Mix': 'Max'} } } },
			twoMethods: { 'GET': { success: 302 }, 'POST': { error: { code: 404 } } },
			withIam: { 'GET': { authorizationType: 'AWS_IAM' } },
			withCredentials: { 'GET': {authorizationType: 'AWS_IAM', invokeWithCredentials: 'arn:aws:iam::123456789012:user/division_abc/subdivision_xyz/Bob' }},
			passingCredentials: { 'GET': {authorizationType: 'AWS_IAM', invokeWithCredentials: true }},
			withOnlyCredentials: { 'GET': {invokeWithCredentials: 'arn:aws:iam::123456789012:user/division_abc/subdivision_xyz/Bob' }},
			passingOnlyCredentials: { 'GET': {invokeWithCredentials: true }},
			withAuthorizer: { customAuthorizer: 'first' },
			withAuthorizerAndAuthType: {  customAuthorizer: 'first', authorizationType: 'CUSTOM' }
		}
	};
};
exports.proxyRouter = function (event, context) {
	'use strict';
	context.succeed(event);
};
