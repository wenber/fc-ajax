define('promise/main', [
    'require',
    './Promise',
    './enchance'
], function (require) {
    var Promise = require('./Promise');
    var enchance = require('./enchance');
    return enchance(Promise);
});

define('promise', ['promise/main'], function ( main ) { return main; });