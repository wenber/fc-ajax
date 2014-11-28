void function (define, global) {
    define('promise/enchance', [
        'require',
        './util'
    ], function (require) {
        var u = require('./util');
        function isPromise(obj) {
            return typeof u.getThen(obj) === 'function';
        }
        function promiseRequire(modules) {
            var promise = new this(function (resolve, reject) {
                    global.require(modules, resolve);
                    promise.abort = reject;
                });
            return promise;
        }
        function ensure(callback) {
            return this.then(callback, callback);
        }
        return function (Promise) {
            Promise.isPromise = isPromise;
            Promise.require = promiseRequire;
            Promise.prototype.ensure = ensure;
            return Promise;
        };
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
}, this);