void function (define) {
    define('promise/setImmediate', ['require'], function (require) {
        var global = function () {
                return this;
            }();
        var callbackPool = {};
        var cursor = 1;
        function registerCallback(callback) {
            callbackPool[cursor] = callback;
            return cursor++;
        }
        function runCallback(tick) {
            var callback = callbackPool[tick];
            if (callback) {
                delete callbackPool[tick];
                callback();
            }
        }
        if (typeof global.setImmediate === 'function') {
            return global.setImmediate;
        }
        if (typeof global.nextTick === 'function') {
            return global.nextTick;
        }
        if (global.MutationObserver || global.webKitMutationObserver) {
            var ATTRIBUTE_NAME = 'data-promise-tick';
            var MutationObserver = global.MutationObserver || global.webKitMutationObserver;
            var ensureElementMutation = function (mutations, observer) {
                var item = mutations[0];
                if (item.attributeName === ATTRIBUTE_NAME) {
                    var tick = item.target.getAttribute(ATTRIBUTE_NAME);
                    runCallback(tick);
                    observer.disconnect(item.target);
                }
            };
            return function (callback) {
                var element = document.createElement('div');
                var observer = new MutationObserver(ensureElementMutation);
                observer.observe(element, { attributes: true });
                var tick = registerCallback(callback);
                element.setAttribute(ATTRIBUTE_NAME, tick);
            };
        }
        if (typeof postMessage === 'function' && typeof global.importScript !== 'function') {
            var isPostMessageAsync = true;
            var oldListener = global.onmessage;
            global.onmessage = function () {
                isPostMessageAsync = false;
            };
            global.postMessage('', '*');
            global.onmessage = oldListener;
            if (isPostMessageAsync) {
                var MESSAGE_PREFIX = 'promise-tick-';
                var ensureMessage = function (e) {
                    if (e.source === global && typeof e.data === 'string' && e.data.indexOf(MESSAGE_PREFIX) === 0) {
                        var tick = e.data.substring(MESSAGE_PREFIX.length);
                        runCallback(tick);
                    }
                };
                if (global.addEventListener) {
                    global.addEventListener('message', ensureMessage, false);
                } else {
                    global.attachEvent('onmessage', ensureMessage);
                }
                return function (callback) {
                    var tick = registerCallback(callback);
                    global.postMessage(MESSAGE_PREFIX + tick, '*');
                };
            }
        }
        if (global.MessageChannel) {
            var channel = new MessageChannel();
            channel.port1.onmessage = function (e) {
                var tick = e.data;
                runCallback(tick);
            };
            return function (callback) {
                var tick = registerCallback(callback);
                channel.port2.postMessage(tick);
            };
        }
        if ('onreadystatechange' in document.createElement('script')) {
            var documentElement = document.documentElement;
            return function (callback) {
                var script = document.createElement('script');
                script.onreadystatechange = function () {
                    callback();
                    script.onreadystatechange = null;
                    documentElement.removeChild(script);
                    script = null;
                };
                documentElement.appendChild(script);
            };
        }
        return function (callback) {
            setTimeout(callback, 0);
        };
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
}, this);

define('fc-core/aop', ['require'], function (require) {
    'use strict';
    var aop = {};
    aop.before = function (context, methodName, aspectMethod) {
        if (!aspectMethod) {
            return;
        }
        var original = context[methodName];
        context[methodName] = function () {
            try {
                aspectMethod.apply(this, arguments);
            } finally {
                return original.apply(this, arguments);
            }
        };
    };
    aop.beforeReject = function (context, methodName, aspectMethod) {
        if (!aspectMethod) {
            return;
        }
        var original = context[methodName];
        context[methodName] = function () {
            if (aspectMethod.apply(this, arguments)) {
                return original.apply(this, arguments);
            }
        };
    };
    aop.after = function (context, methodName, aspectMethod) {
        if (!aspectMethod) {
            return;
        }
        var original = context[methodName];
        context[methodName] = function () {
            var result = original.apply(this, arguments);
            try {
                aspectMethod.apply(this, arguments);
            } finally {
                return result;
            }
        };
    };
    aop.around = function (context, methodName, beforeMethod, afterMethod) {
        aop.before(context, methodName, beforeMethod);
        aop.after(context, methodName, afterMethod);
    };
    return aop;
});

define('er/assert', [], function () {
    if (window.DEBUG) {
        var assert = function (condition, message) {
            if (!condition) {
                throw new Error(message);
            }
        };
        assert.has = function (obj, message) {
            assert(obj != null, message);
        };
        assert.equals = function (x, y, message) {
            assert(x === y, message);
        };
        assert.hasProperty = function (obj, propertyName, message) {
            assert(obj[propertyName] != null, message);
        };
        assert.lessThan = function (value, max, message) {
            assert(value < max, message);
        };
        assert.greaterThan = function (value, min, message) {
            assert(value > min, message);
        };
        assert.lessThanOrEquals = function (value, max, message) {
            assert(value <= max, message);
        };
        assert.greaterThanOrEquals = function (value, min, message) {
            assert(value >= min, message);
        };
        return assert;
    } else {
        var assert = function () {
        };
        assert.has = assert;
        assert.equals = assert;
        assert.hasProperty = assert;
        assert.lessThan = assert;
        assert.greaterThan = assert;
        assert.lessThanOrEquals = assert;
        assert.greaterThanOrEquals = assert;
        return assert;
    }
});

define('fc-core/assert', [
    'require',
    'er/assert'
], function (require) {
    'use strict';
    return require('er/assert');
});

define('underscore/underscore', [
    'require',
    'exports',
    'module'
], function (require, exports, module) {
    (function () {
        var root = this;
        var previousUnderscore = root._;
        var breaker = {};
        var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
        var push = ArrayProto.push, slice = ArrayProto.slice, concat = ArrayProto.concat, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty;
        var nativeIsArray = Array.isArray, nativeKeys = Object.keys, nativeBind = FuncProto.bind;
        var _ = function (obj) {
            if (obj instanceof _)
                return obj;
            if (!(this instanceof _))
                return new _(obj);
            this._wrapped = obj;
        };
        if (typeof exports !== 'undefined') {
            if (typeof module !== 'undefined' && module.exports) {
                exports = module.exports = _;
            }
            exports._ = _;
        } else {
            root._ = _;
        }
        _.VERSION = '1.6.0';
        var createCallback = function (func, context, argCount) {
            if (context === void 0)
                return func;
            switch (argCount == null ? 3 : argCount) {
            case 1:
                return function (value) {
                    return func.call(context, value);
                };
            case 2:
                return function (value, other) {
                    return func.call(context, value, other);
                };
            case 3:
                return function (value, index, collection) {
                    return func.call(context, value, index, collection);
                };
            case 4:
                return function (accumulator, value, index, collection) {
                    return func.call(context, accumulator, value, index, collection);
                };
            }
            return function () {
                return func.apply(context, arguments);
            };
        };
        var lookupIterator = function (value, context, argCount) {
            if (value == null)
                return _.identity;
            if (_.isFunction(value))
                return createCallback(value, context, argCount);
            if (_.isObject(value))
                return _.matches(value);
            return _.property(value);
        };
        _.each = _.forEach = function (obj, iterator, context) {
            var i, length;
            if (obj == null)
                return obj;
            iterator = createCallback(iterator, context);
            if (obj.length === +obj.length) {
                for (i = 0, length = obj.length; i < length; i++) {
                    if (iterator(obj[i], i, obj) === breaker)
                        break;
                }
            } else {
                var keys = _.keys(obj);
                for (i = 0, length = keys.length; i < length; i++) {
                    if (iterator(obj[keys[i]], keys[i], obj) === breaker)
                        break;
                }
            }
            return obj;
        };
        _.map = _.collect = function (obj, iterator, context) {
            var results = [];
            if (obj == null)
                return results;
            iterator = lookupIterator(iterator, context);
            _.each(obj, function (value, index, list) {
                results.push(iterator(value, index, list));
            });
            return results;
        };
        var reduceError = 'Reduce of empty array with no initial value';
        _.reduce = _.foldl = _.inject = function (obj, iterator, memo, context) {
            var initial = arguments.length > 2;
            if (obj == null)
                obj = [];
            iterator = createCallback(iterator, context, 4);
            _.each(obj, function (value, index, list) {
                if (!initial) {
                    memo = value;
                    initial = true;
                } else {
                    memo = iterator(memo, value, index, list);
                }
            });
            if (!initial)
                throw TypeError(reduceError);
            return memo;
        };
        _.reduceRight = _.foldr = function (obj, iterator, memo, context) {
            var initial = arguments.length > 2;
            if (obj == null)
                obj = [];
            var length = obj.length;
            iterator = createCallback(iterator, context, 4);
            if (length !== +length) {
                var keys = _.keys(obj);
                length = keys.length;
            }
            _.each(obj, function (value, index, list) {
                index = keys ? keys[--length] : --length;
                if (!initial) {
                    memo = obj[index];
                    initial = true;
                } else {
                    memo = iterator(memo, obj[index], index, list);
                }
            });
            if (!initial)
                throw TypeError(reduceError);
            return memo;
        };
        _.find = _.detect = function (obj, predicate, context) {
            var result;
            predicate = lookupIterator(predicate, context);
            _.some(obj, function (value, index, list) {
                if (predicate(value, index, list)) {
                    result = value;
                    return true;
                }
            });
            return result;
        };
        _.filter = _.select = function (obj, predicate, context) {
            var results = [];
            if (obj == null)
                return results;
            predicate = lookupIterator(predicate, context);
            _.each(obj, function (value, index, list) {
                if (predicate(value, index, list))
                    results.push(value);
            });
            return results;
        };
        _.reject = function (obj, predicate, context) {
            return _.filter(obj, _.negate(lookupIterator(predicate)), context);
        };
        _.every = _.all = function (obj, predicate, context) {
            var result = true;
            if (obj == null)
                return result;
            predicate = lookupIterator(predicate, context);
            _.each(obj, function (value, index, list) {
                result = predicate(value, index, list);
                if (!result)
                    return breaker;
            });
            return !!result;
        };
        _.some = _.any = function (obj, predicate, context) {
            var result = false;
            if (obj == null)
                return result;
            predicate = lookupIterator(predicate, context);
            _.each(obj, function (value, index, list) {
                result = predicate(value, index, list);
                if (result)
                    return breaker;
            });
            return !!result;
        };
        _.contains = _.include = function (obj, target) {
            if (obj == null)
                return false;
            if (obj.length === +obj.length)
                return _.indexOf(obj, target) >= 0;
            return _.some(obj, function (value) {
                return value === target;
            });
        };
        _.invoke = function (obj, method) {
            var args = slice.call(arguments, 2);
            var isFunc = _.isFunction(method);
            return _.map(obj, function (value) {
                return (isFunc ? method : value[method]).apply(value, args);
            });
        };
        _.pluck = function (obj, key) {
            return _.map(obj, _.property(key));
        };
        _.where = function (obj, attrs) {
            return _.filter(obj, _.matches(attrs));
        };
        _.findWhere = function (obj, attrs) {
            return _.find(obj, _.matches(attrs));
        };
        _.max = function (obj, iterator, context) {
            var result = -Infinity, lastComputed = -Infinity, value, computed;
            if (!iterator && _.isArray(obj)) {
                for (var i = 0, length = obj.length; i < length; i++) {
                    value = obj[i];
                    if (value > result) {
                        result = value;
                    }
                }
            } else {
                iterator = lookupIterator(iterator, context);
                _.each(obj, function (value, index, list) {
                    computed = iterator(value, index, list);
                    if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
                        result = value;
                        lastComputed = computed;
                    }
                });
            }
            return result;
        };
        _.min = function (obj, iterator, context) {
            var result = Infinity, lastComputed = Infinity, value, computed;
            if (!iterator && _.isArray(obj)) {
                for (var i = 0, length = obj.length; i < length; i++) {
                    value = obj[i];
                    if (value < result) {
                        result = value;
                    }
                }
            } else {
                iterator = lookupIterator(iterator, context);
                _.each(obj, function (value, index, list) {
                    computed = iterator(value, index, list);
                    if (computed < lastComputed || computed === Infinity && result === Infinity) {
                        result = value;
                        lastComputed = computed;
                    }
                });
            }
            return result;
        };
        _.shuffle = function (obj) {
            var rand;
            var index = 0;
            var shuffled = [];
            _.each(obj, function (value) {
                rand = _.random(index++);
                shuffled[index - 1] = shuffled[rand];
                shuffled[rand] = value;
            });
            return shuffled;
        };
        _.sample = function (obj, n, guard) {
            if (n == null || guard) {
                if (obj.length !== +obj.length)
                    obj = _.values(obj);
                return obj[_.random(obj.length - 1)];
            }
            return _.shuffle(obj).slice(0, Math.max(0, n));
        };
        _.sortBy = function (obj, iterator, context) {
            iterator = lookupIterator(iterator, context);
            return _.pluck(_.map(obj, function (value, index, list) {
                return {
                    value: value,
                    index: index,
                    criteria: iterator(value, index, list)
                };
            }).sort(function (left, right) {
                var a = left.criteria;
                var b = right.criteria;
                if (a !== b) {
                    if (a > b || a === void 0)
                        return 1;
                    if (a < b || b === void 0)
                        return -1;
                }
                return left.index - right.index;
            }), 'value');
        };
        var group = function (behavior) {
            return function (obj, iterator, context) {
                var result = {};
                iterator = lookupIterator(iterator, context);
                _.each(obj, function (value, index) {
                    var key = iterator(value, index, obj);
                    behavior(result, value, key);
                });
                return result;
            };
        };
        _.groupBy = group(function (result, value, key) {
            if (_.has(result, key))
                result[key].push(value);
            else
                result[key] = [value];
        });
        _.indexBy = group(function (result, value, key) {
            result[key] = value;
        });
        _.countBy = group(function (result, value, key) {
            if (_.has(result, key))
                result[key]++;
            else
                result[key] = 1;
        });
        _.sortedIndex = function (array, obj, iterator, context) {
            iterator = lookupIterator(iterator, context, 1);
            var value = iterator(obj);
            var low = 0, high = array.length;
            while (low < high) {
                var mid = low + high >>> 1;
                if (iterator(array[mid]) < value)
                    low = mid + 1;
                else
                    high = mid;
            }
            return low;
        };
        _.toArray = function (obj) {
            if (!obj)
                return [];
            if (_.isArray(obj))
                return slice.call(obj);
            if (obj.length === +obj.length)
                return _.map(obj, _.identity);
            return _.values(obj);
        };
        _.size = function (obj) {
            if (obj == null)
                return 0;
            return obj.length === +obj.length ? obj.length : _.keys(obj).length;
        };
        _.partition = function (obj, predicate, context) {
            predicate = lookupIterator(predicate, context);
            var pass = [], fail = [];
            _.each(obj, function (value, key, obj) {
                (predicate(value, key, obj) ? pass : fail).push(value);
            });
            return [
                pass,
                fail
            ];
        };
        _.first = _.head = _.take = function (array, n, guard) {
            if (array == null)
                return void 0;
            if (n == null || guard)
                return array[0];
            if (n < 0)
                return [];
            return slice.call(array, 0, n);
        };
        _.initial = function (array, n, guard) {
            return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
        };
        _.last = function (array, n, guard) {
            if (array == null)
                return void 0;
            if (n == null || guard)
                return array[array.length - 1];
            return slice.call(array, Math.max(array.length - n, 0));
        };
        _.rest = _.tail = _.drop = function (array, n, guard) {
            return slice.call(array, n == null || guard ? 1 : n);
        };
        _.compact = function (array) {
            return _.filter(array, _.identity);
        };
        var flatten = function (input, shallow, strict, output) {
            if (shallow && _.every(input, _.isArray)) {
                return concat.apply(output, input);
            }
            for (var i = 0, length = input.length; i < length; i++) {
                var value = input[i];
                if (!_.isArray(value) && !_.isArguments(value)) {
                    if (!strict)
                        output.push(value);
                } else if (shallow) {
                    push.apply(output, value);
                } else {
                    flatten(value, shallow, strict, output);
                }
            }
            return output;
        };
        _.flatten = function (array, shallow) {
            return flatten(array, shallow, false, []);
        };
        _.without = function (array) {
            return _.difference(array, slice.call(arguments, 1));
        };
        _.uniq = _.unique = function (array, isSorted, iterator, context) {
            if (array == null)
                return [];
            if (_.isFunction(isSorted)) {
                context = iterator;
                iterator = isSorted;
                isSorted = false;
            }
            if (iterator)
                iterator = lookupIterator(iterator, context);
            var result = [];
            var seen = [];
            for (var i = 0, length = array.length; i < length; i++) {
                var value = array[i];
                if (iterator)
                    value = iterator(value, i, array);
                if (isSorted ? !i || seen !== value : !_.contains(seen, value)) {
                    if (isSorted)
                        seen = value;
                    else
                        seen.push(value);
                    result.push(array[i]);
                }
            }
            return result;
        };
        _.union = function () {
            return _.uniq(flatten(arguments, true, true, []));
        };
        _.intersection = function (array) {
            if (array == null)
                return [];
            var result = [];
            var argsLength = arguments.length;
            for (var i = 0, length = array.length; i < length; i++) {
                var item = array[i];
                if (_.contains(result, item))
                    continue;
                for (var j = 1; j < argsLength; j++) {
                    if (!_.contains(arguments[j], item))
                        break;
                }
                if (j === argsLength)
                    result.push(item);
            }
            return result;
        };
        _.difference = function (array) {
            var rest = flatten(slice.call(arguments, 1), true, true, []);
            return _.filter(array, function (value) {
                return !_.contains(rest, value);
            });
        };
        _.zip = function (array) {
            if (array == null)
                return [];
            var length = _.max(arguments, 'length').length;
            var results = Array(length);
            for (var i = 0; i < length; i++) {
                results[i] = _.pluck(arguments, i);
            }
            return results;
        };
        _.object = function (list, values) {
            if (list == null)
                return {};
            var result = {};
            for (var i = 0, length = list.length; i < length; i++) {
                if (values) {
                    result[list[i]] = values[i];
                } else {
                    result[list[i][0]] = list[i][1];
                }
            }
            return result;
        };
        _.indexOf = function (array, item, isSorted) {
            if (array == null)
                return -1;
            var i = 0, length = array.length;
            if (isSorted) {
                if (typeof isSorted == 'number') {
                    i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
                } else {
                    i = _.sortedIndex(array, item);
                    return array[i] === item ? i : -1;
                }
            }
            for (; i < length; i++)
                if (array[i] === item)
                    return i;
            return -1;
        };
        _.lastIndexOf = function (array, item, from) {
            if (array == null)
                return -1;
            var i = from == null ? array.length : from;
            while (i--)
                if (array[i] === item)
                    return i;
            return -1;
        };
        _.range = function (start, stop, step) {
            if (arguments.length <= 1) {
                stop = start || 0;
                start = 0;
            }
            step = arguments[2] || 1;
            var length = Math.max(Math.ceil((stop - start) / step), 0);
            var idx = 0;
            var range = Array(length);
            while (idx < length) {
                range[idx++] = start;
                start += step;
            }
            return range;
        };
        var Ctor = function () {
        };
        _.bind = function (func, context) {
            var args, bound;
            if (nativeBind && func.bind === nativeBind)
                return nativeBind.apply(func, slice.call(arguments, 1));
            if (!_.isFunction(func))
                throw TypeError('Bind must be called on a function');
            args = slice.call(arguments, 2);
            bound = function () {
                if (!(this instanceof bound))
                    return func.apply(context, args.concat(slice.call(arguments)));
                Ctor.prototype = func.prototype;
                var self = new Ctor();
                Ctor.prototype = null;
                var result = func.apply(self, args.concat(slice.call(arguments)));
                if (Object(result) === result)
                    return result;
                return self;
            };
            return bound;
        };
        _.partial = function (func) {
            var boundArgs = slice.call(arguments, 1);
            return function () {
                var position = 0;
                var args = boundArgs.slice();
                for (var i = 0, length = args.length; i < length; i++) {
                    if (args[i] === _)
                        args[i] = arguments[position++];
                }
                while (position < arguments.length)
                    args.push(arguments[position++]);
                return func.apply(this, args);
            };
        };
        _.bindAll = function (obj) {
            var i = 1, length = arguments.length, key;
            if (length <= 1)
                throw Error('bindAll must be passed function names');
            for (; i < length; i++) {
                key = arguments[i];
                obj[key] = createCallback(obj[key], obj, Infinity);
            }
            return obj;
        };
        _.memoize = function (func, hasher) {
            var memoize = function (key) {
                var cache = memoize.cache;
                var address = hasher ? hasher.apply(this, arguments) : key;
                if (!_.has(cache, address))
                    cache[address] = func.apply(this, arguments);
                return cache[key];
            };
            memoize.cache = {};
            return memoize;
        };
        _.delay = function (func, wait) {
            var args = slice.call(arguments, 2);
            return setTimeout(function () {
                return func.apply(null, args);
            }, wait);
        };
        _.defer = function (func) {
            return _.delay.apply(_, [
                func,
                1
            ].concat(slice.call(arguments, 1)));
        };
        _.throttle = function (func, wait, options) {
            var context, args, result;
            var timeout = null;
            var previous = 0;
            if (!options)
                options = {};
            var later = function () {
                previous = options.leading === false ? 0 : _.now();
                timeout = null;
                result = func.apply(context, args);
                if (!timeout)
                    context = args = null;
            };
            return function () {
                var now = _.now();
                if (!previous && options.leading === false)
                    previous = now;
                var remaining = wait - (now - previous);
                context = this;
                args = arguments;
                if (remaining <= 0 || remaining > wait) {
                    clearTimeout(timeout);
                    timeout = null;
                    previous = now;
                    result = func.apply(context, args);
                    if (!timeout)
                        context = args = null;
                } else if (!timeout && options.trailing !== false) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            };
        };
        _.debounce = function (func, wait, immediate) {
            var timeout, args, context, timestamp, result;
            var later = function () {
                var last = _.now() - timestamp;
                if (last < wait && last > 0) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                        if (!timeout)
                            context = args = null;
                    }
                }
            };
            return function () {
                context = this;
                args = arguments;
                timestamp = _.now();
                var callNow = immediate && !timeout;
                if (!timeout)
                    timeout = setTimeout(later, wait);
                if (callNow) {
                    result = func.apply(context, args);
                    context = args = null;
                }
                return result;
            };
        };
        _.once = function (func) {
            var ran = false, memo;
            return function () {
                if (ran)
                    return memo;
                ran = true;
                memo = func.apply(this, arguments);
                func = null;
                return memo;
            };
        };
        _.wrap = function (func, wrapper) {
            return _.partial(wrapper, func);
        };
        _.negate = function (predicate) {
            return function () {
                return !predicate.apply(this, arguments);
            };
        };
        _.compose = function () {
            var funcs = arguments;
            return function () {
                var args = arguments;
                for (var i = funcs.length - 1; i >= 0; i--) {
                    args = [funcs[i].apply(this, args)];
                }
                return args[0];
            };
        };
        _.after = function (times, func) {
            return function () {
                if (--times < 1) {
                    return func.apply(this, arguments);
                }
            };
        };
        _.keys = function (obj) {
            if (!_.isObject(obj))
                return [];
            if (nativeKeys)
                return nativeKeys(obj);
            var keys = [];
            for (var key in obj)
                if (_.has(obj, key))
                    keys.push(key);
            return keys;
        };
        _.values = function (obj) {
            var keys = _.keys(obj);
            var length = keys.length;
            var values = Array(length);
            for (var i = 0; i < length; i++) {
                values[i] = obj[keys[i]];
            }
            return values;
        };
        _.pairs = function (obj) {
            var keys = _.keys(obj);
            var length = keys.length;
            var pairs = Array(length);
            for (var i = 0; i < length; i++) {
                pairs[i] = [
                    keys[i],
                    obj[keys[i]]
                ];
            }
            return pairs;
        };
        _.invert = function (obj) {
            var result = {};
            var keys = _.keys(obj);
            for (var i = 0, length = keys.length; i < length; i++) {
                result[obj[keys[i]]] = keys[i];
            }
            return result;
        };
        _.functions = _.methods = function (obj) {
            var names = [];
            for (var key in obj) {
                if (_.isFunction(obj[key]))
                    names.push(key);
            }
            return names.sort();
        };
        _.extend = function (obj) {
            if (!_.isObject(obj))
                return obj;
            var source, prop;
            for (var i = 1, length = arguments.length; i < length; i++) {
                source = arguments[i];
                for (prop in source) {
                    obj[prop] = source[prop];
                }
            }
            return obj;
        };
        _.pick = function (obj, iterator, context) {
            var result = {}, key;
            if (_.isFunction(iterator)) {
                for (key in obj) {
                    var value = obj[key];
                    if (iterator.call(context, value, key, obj))
                        result[key] = value;
                }
            } else {
                var keys = concat.apply([], slice.call(arguments, 1));
                for (var i = 0, length = keys.length; i < length; i++) {
                    key = keys[i];
                    if (key in obj)
                        result[key] = obj[key];
                }
            }
            return result;
        };
        _.omit = function (obj, iterator, context) {
            if (_.isFunction(iterator)) {
                iterator = _.negate(iterator);
            } else {
                var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
                iterator = function (value, key) {
                    return !_.contains(keys, key);
                };
            }
            return _.pick(obj, iterator, context);
        };
        _.defaults = function (obj) {
            if (!_.isObject(obj))
                return obj;
            for (var i = 1, length = arguments.length; i < length; i++) {
                var source = arguments[i];
                for (var prop in source) {
                    if (obj[prop] === void 0)
                        obj[prop] = source[prop];
                }
            }
            return obj;
        };
        _.clone = function (obj) {
            if (!_.isObject(obj))
                return obj;
            return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
        };
        _.tap = function (obj, interceptor) {
            interceptor(obj);
            return obj;
        };
        var eq = function (a, b, aStack, bStack) {
            if (a === b)
                return a !== 0 || 1 / a === 1 / b;
            if (a == null || b == null)
                return a === b;
            if (a instanceof _)
                a = a._wrapped;
            if (b instanceof _)
                b = b._wrapped;
            var className = toString.call(a);
            if (className !== toString.call(b))
                return false;
            switch (className) {
            case '[object RegExp]':
            case '[object String]':
                return '' + a === '' + b;
            case '[object Number]':
                if (a != +a)
                    return b != +b;
                return a == 0 ? 1 / a == 1 / b : a == +b;
            case '[object Date]':
            case '[object Boolean]':
                return +a === +b;
            }
            if (typeof a != 'object' || typeof b != 'object')
                return false;
            var length = aStack.length;
            while (length--) {
                if (aStack[length] === a)
                    return bStack[length] === b;
            }
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && 'constructor' in a && 'constructor' in b && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor)) {
                return false;
            }
            aStack.push(a);
            bStack.push(b);
            var size, result;
            if (className === '[object Array]') {
                size = a.length;
                result = size === b.length;
                if (result) {
                    while (size--) {
                        if (!(result = eq(a[size], b[size], aStack, bStack)))
                            break;
                    }
                }
            } else {
                var keys = _.keys(a), key;
                size = keys.length;
                result = _.keys(b).length == size;
                if (result) {
                    while (size--) {
                        key = keys[size];
                        if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack)))
                            break;
                    }
                }
            }
            aStack.pop();
            bStack.pop();
            return result;
        };
        _.isEqual = function (a, b) {
            return eq(a, b, [], []);
        };
        _.isEmpty = function (obj) {
            if (obj == null)
                return true;
            if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))
                return obj.length === 0;
            for (var key in obj)
                if (_.has(obj, key))
                    return false;
            return true;
        };
        _.isElement = function (obj) {
            return !!(obj && obj.nodeType === 1);
        };
        _.isArray = nativeIsArray || function (obj) {
            return toString.call(obj) === '[object Array]';
        };
        _.isObject = function (obj) {
            return obj === Object(obj);
        };
        _.each([
            'Arguments',
            'Function',
            'String',
            'Number',
            'Date',
            'RegExp'
        ], function (name) {
            _['is' + name] = function (obj) {
                return toString.call(obj) === '[object ' + name + ']';
            };
        });
        if (!_.isArguments(arguments)) {
            _.isArguments = function (obj) {
                return _.has(obj, 'callee');
            };
        }
        if (typeof /./ !== 'function') {
            _.isFunction = function (obj) {
                return typeof obj === 'function';
            };
        }
        _.isFinite = function (obj) {
            return isFinite(obj) && !isNaN(parseFloat(obj));
        };
        _.isNaN = function (obj) {
            return _.isNumber(obj) && obj !== +obj;
        };
        _.isBoolean = function (obj) {
            return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
        };
        _.isNull = function (obj) {
            return obj === null;
        };
        _.isUndefined = function (obj) {
            return obj === void 0;
        };
        _.has = function (obj, key) {
            return obj != null && hasOwnProperty.call(obj, key);
        };
        _.noConflict = function () {
            root._ = previousUnderscore;
            return this;
        };
        _.identity = function (value) {
            return value;
        };
        _.constant = function (value) {
            return function () {
                return value;
            };
        };
        _.noop = function () {
        };
        _.property = function (key) {
            return function (obj) {
                return obj[key];
            };
        };
        _.matches = function (attrs) {
            return function (obj) {
                if (obj == null)
                    return _.isEmpty(attrs);
                if (obj === attrs)
                    return true;
                for (var key in attrs)
                    if (attrs[key] !== obj[key])
                        return false;
                return true;
            };
        };
        _.times = function (n, iterator, context) {
            var accum = Array(Math.max(0, n));
            iterator = createCallback(iterator, context, 1);
            for (var i = 0; i < n; i++)
                accum[i] = iterator(i);
            return accum;
        };
        _.random = function (min, max) {
            if (max == null) {
                max = min;
                min = 0;
            }
            return min + Math.floor(Math.random() * (max - min + 1));
        };
        _.now = Date.now || function () {
            return new Date().getTime();
        };
        var entityMap = {
                escape: {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    '\'': '&#x27;'
                }
            };
        entityMap.unescape = _.invert(entityMap.escape);
        var entityRegexes = {
                escape: RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
                unescape: RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
            };
        _.each([
            'escape',
            'unescape'
        ], function (method) {
            _[method] = function (string) {
                if (string == null)
                    return '';
                return ('' + string).replace(entityRegexes[method], function (match) {
                    return entityMap[method][match];
                });
            };
        });
        _.result = function (object, property) {
            if (object == null)
                return void 0;
            var value = object[property];
            return _.isFunction(value) ? object[property]() : value;
        };
        var idCounter = 0;
        _.uniqueId = function (prefix) {
            var id = ++idCounter + '';
            return prefix ? prefix + id : id;
        };
        _.templateSettings = {
            evaluate: /<%([\s\S]+?)%>/g,
            interpolate: /<%=([\s\S]+?)%>/g,
            escape: /<%-([\s\S]+?)%>/g
        };
        var noMatch = /(.)^/;
        var escapes = {
                '\'': '\'',
                '\\': '\\',
                '\r': 'r',
                '\n': 'n',
                '\u2028': 'u2028',
                '\u2029': 'u2029'
            };
        var escaper = /\\|'|\r|\n|\u2028|\u2029/g;
        var escapeChar = function (match) {
            return '\\' + escapes[match];
        };
        _.template = function (text, data, settings) {
            settings = _.defaults({}, settings, _.templateSettings);
            var matcher = RegExp([
                    (settings.escape || noMatch).source,
                    (settings.interpolate || noMatch).source,
                    (settings.evaluate || noMatch).source
                ].join('|') + '|$', 'g');
            var index = 0;
            var source = '__p+=\'';
            text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
                source += text.slice(index, offset).replace(escaper, escapeChar);
                index = offset + match.length;
                if (escape) {
                    source += '\'+\n((__t=(' + escape + '))==null?\'\':_.escape(__t))+\n\'';
                } else if (interpolate) {
                    source += '\'+\n((__t=(' + interpolate + '))==null?\'\':__t)+\n\'';
                } else if (evaluate) {
                    source += '\';\n' + evaluate + '\n__p+=\'';
                }
                return match;
            });
            source += '\';\n';
            if (!settings.variable)
                source = 'with(obj||{}){\n' + source + '}\n';
            source = 'var __t,__p=\'\',__j=Array.prototype.join,' + 'print=function(){__p+=__j.call(arguments,\'\');};\n' + source + 'return __p;\n';
            try {
                var render = Function(settings.variable || 'obj', '_', source);
            } catch (e) {
                e.source = source;
                throw e;
            }
            if (data)
                return render(data, _);
            var template = function (data) {
                return render.call(this, data, _);
            };
            var argument = settings.variable || 'obj';
            template.source = 'function(' + argument + '){\n' + source + '}';
            return template;
        };
        _.chain = function (obj) {
            var instance = _(obj);
            instance._chain = true;
            return instance;
        };
        var result = function (obj) {
            return this._chain ? _(obj).chain() : obj;
        };
        _.mixin = function (obj) {
            _.each(_.functions(obj), function (name) {
                var func = _[name] = obj[name];
                _.prototype[name] = function () {
                    var args = [this._wrapped];
                    push.apply(args, arguments);
                    return result.call(this, func.apply(_, args));
                };
            });
        };
        _.mixin(_);
        _.each([
            'pop',
            'push',
            'reverse',
            'shift',
            'sort',
            'splice',
            'unshift'
        ], function (name) {
            var method = ArrayProto[name];
            _.prototype[name] = function () {
                var obj = this._wrapped;
                method.apply(obj, arguments);
                if ((name === 'shift' || name === 'splice') && obj.length === 0)
                    delete obj[0];
                return result.call(this, obj);
            };
        });
        _.each([
            'concat',
            'join',
            'slice'
        ], function (name) {
            var method = ArrayProto[name];
            _.prototype[name] = function () {
                return result.call(this, method.apply(this._wrapped, arguments));
            };
        });
        _.prototype.value = function () {
            return this._wrapped;
        };
    }.call(this));
});

define('underscore', ['underscore/underscore'], function ( main ) { return main; });

void function (define) {
    define('eoo/oo', [], function () {
        var Empty = function () {
        };
        var NAME_PROPERTY_NAME = '__eooName__';
        var OWNER_PROPERTY_NAME = '__eooOwner__';
        function Class() {
            return Class.create.apply(Class, arguments);
        }
        Class.create = function (BaseClass, overrides) {
            overrides = overrides || {};
            BaseClass = BaseClass || Class;
            if (typeof BaseClass === 'object') {
                overrides = BaseClass;
                BaseClass = Class;
            }
            var kclass = inherit(BaseClass);
            var proto = kclass.prototype;
            eachObject(overrides, function (value, key) {
                if (typeof value === 'function') {
                    value[NAME_PROPERTY_NAME] = key;
                    value[OWNER_PROPERTY_NAME] = kclass;
                }
                proto[key] = value;
            });
            kclass.toString = toString;
            return kclass;
        };
        Class.static = typeof Object.create === 'function' ? Object.create : function (o) {
            if (arguments.length > 1) {
                throw new Error('Second argument not supported');
            }
            if (typeof o != 'object') {
                throw new TypeError('Argument must be an object');
            }
            Empty.prototype = o;
            return new Empty();
        };
        Class.toString = function () {
            return 'function Class() { [native code] }';
        };
        Class.prototype = {
            constructor: function () {
            },
            $self: Class,
            $superClass: Object,
            $super: function (args) {
                var method = this.$super.caller;
                var name = method[NAME_PROPERTY_NAME];
                var superClass = method[OWNER_PROPERTY_NAME].$superClass;
                var superMethod = superClass.prototype[name];
                if (typeof superMethod !== 'function') {
                    throw new TypeError('Call the super class\'s ' + name + ', but it is not a function!');
                }
                return superMethod.apply(this, args);
            }
        };
        function inherit(BaseClass) {
            var kclass = function () {
                return kclass.prototype.constructor.apply(this, arguments);
            };
            Empty.prototype = BaseClass.prototype;
            var proto = kclass.prototype = new Empty();
            proto.$self = kclass;
            if (!('$super' in proto)) {
                proto.$super = Class.prototype.$super;
            }
            kclass.$superClass = BaseClass;
            return kclass;
        }
        var hasEnumBug = !{ toString: 1 }.propertyIsEnumerable('toString');
        var enumProperties = [
                'constructor',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'toString',
                'toLocaleString',
                'valueOf'
            ];
        function hasOwnProperty(obj, key) {
            return Object.prototype.hasOwnProperty.call(obj, key);
        }
        function eachObject(obj, fn) {
            for (var k in obj) {
                hasOwnProperty(obj, k) && fn(obj[k], k, obj);
            }
            if (hasEnumBug) {
                for (var i = enumProperties.length - 1; i > -1; --i) {
                    var key = enumProperties[i];
                    hasOwnProperty(obj, key) && fn(obj[key], key, obj);
                }
            }
        }
        function toString() {
            return this.prototype.constructor.toString();
        }
        return Class;
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
});

void function (define, undefined) {
    define('eoo/defineAccessor', ['require'], function (require) {
        var MEMBERS = '__eooPrivateMembers__';
        function simpleGetter(name) {
            var body = 'return typeof this.' + MEMBERS + ' === \'object\' ? this.' + MEMBERS + '[\'' + name + '\'] : undefined;';
            return new Function(body);
        }
        function simpleSetter(name) {
            var body = 'this.' + MEMBERS + ' = this.' + MEMBERS + ' || {};\n' + 'this.' + MEMBERS + '[\'' + name + '\'] = value;';
            return new Function('value', body);
        }
        return function (obj, name, accessor) {
            var upperName = name.charAt(0).toUpperCase() + name.slice(1);
            var getter = 'get' + upperName;
            var setter = 'set' + upperName;
            if (!accessor) {
                obj[getter] = !accessor || typeof accessor.get !== 'function' ? simpleGetter(name) : accessor.get;
                obj[setter] = !accessor || typeof accessor.set !== 'function' ? simpleSetter(name) : accessor.set;
            } else {
                typeof accessor.get === 'function' && (obj[getter] = accessor.get);
                typeof accessor.set === 'function' && (obj[setter] = accessor.set);
            }
        };
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
});

void function (define) {
    define('eoo/main', [
        'require',
        './oo',
        './defineAccessor'
    ], function (require) {
        var oo = require('./oo');
        oo.defineAccessor = require('./defineAccessor');
        return oo;
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
});

define('eoo', ['eoo/main'], function ( main ) { return main; });

define('fc-core/oo', [
    'require',
    'underscore',
    './assert',
    'eoo'
], function (require) {
    'use strict';
    var _ = require('underscore');
    var assert = require('./assert');
    var oo = require('eoo');
    var exports = {};
    exports.create = function (overrides) {
        return oo.create(overrides);
    };
    exports.derive = function (superClass, overrides) {
        assert.has(superClass, 'fc.oo.derive\u4F7F\u7528\u65F6\u5FC5\u987B\u6307\u5B9A`superClass`\u53C2\u6570\uFF01');
        assert.equals(_.isObject(overrides) || overrides === undefined, true, '\u9519\u8BEF\u7684fc.oo.derive\u53C2\u6570\uFF0C\u4F20\u5165\u7684`overrides`\u5FC5\u987B\u662F\u4E00\u4E2AObject');
        return oo.create(superClass, overrides);
    };
    return exports;
});

(function (root) {
    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    }
    function Stack() {
        this.raw = [];
        this.length = 0;
    }
    Stack.prototype = {
        push: function (elem) {
            this.raw[this.length++] = elem;
        },
        pop: function () {
            if (this.length > 0) {
                var elem = this.raw[--this.length];
                this.raw.length = this.length;
                return elem;
            }
        },
        top: function () {
            return this.raw[this.length - 1];
        },
        bottom: function () {
            return this.raw[0];
        },
        find: function (condition) {
            var index = this.length;
            while (index--) {
                var item = this.raw[index];
                if (condition(item)) {
                    return item;
                }
            }
        }
    };
    var guidIndex = 178245;
    function generateGUID() {
        return '___' + guidIndex++;
    }
    function inherits(subClass, superClass) {
        var F = new Function();
        F.prototype = superClass.prototype;
        subClass.prototype = new F();
        subClass.prototype.constructor = subClass;
    }
    var HTML_ENTITY = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#39;'
        };
    function htmlFilterReplacer(c) {
        return HTML_ENTITY[c];
    }
    var DEFAULT_FILTERS = {
            html: function (source) {
                return source.replace(/[&<>"']/g, htmlFilterReplacer);
            },
            url: encodeURIComponent,
            raw: function (source) {
                return source;
            }
        };
    function stringLiteralize(source) {
        return '"' + source.replace(/\x5C/g, '\\\\').replace(/"/g, '\\"').replace(/\x0A/g, '\\n').replace(/\x09/g, '\\t').replace(/\x0D/g, '\\r') + '"';
    }
    function regexpLiteral(source) {
        return source.replace(/[\^\[\]\$\(\)\{\}\?\*\.\+]/g, function (c) {
            return '\\' + c;
        });
    }
    function stringFormat(source) {
        var args = arguments;
        return source.replace(/\{([0-9]+)\}/g, function (match, index) {
            return args[index - 0 + 1];
        });
    }
    var RENDER_STRING_DECLATION = 'var r="";';
    var RENDER_STRING_ADD_START = 'r+=';
    var RENDER_STRING_ADD_END = ';';
    var RENDER_STRING_RETURN = 'return r;';
    if (typeof navigator !== 'undefined' && /msie\s*([0-9]+)/i.test(navigator.userAgent) && RegExp.$1 - 0 < 8) {
        RENDER_STRING_DECLATION = 'var r=[],ri=0;';
        RENDER_STRING_ADD_START = 'r[ri++]=';
        RENDER_STRING_RETURN = 'return r.join("");';
    }
    function toGetVariableLiteral(name) {
        name = name.replace(/^\s*\*/, '');
        return stringFormat('gv({0},["{1}"])', stringLiteralize(name), name.replace(/\[['"]?([^'"]+)['"]?\]/g, function (match, name) {
            return '.' + name;
        }).split('.').join('","'));
    }
    function parseTextBlock(source, open, close, greedy, onInBlock, onOutBlock) {
        var closeLen = close.length;
        var texts = source.split(open);
        var level = 0;
        var buf = [];
        for (var i = 0, len = texts.length; i < len; i++) {
            var text = texts[i];
            if (i) {
                var openBegin = 1;
                level++;
                while (1) {
                    var closeIndex = text.indexOf(close);
                    if (closeIndex < 0) {
                        buf.push(level > 1 && openBegin ? open : '', text);
                        break;
                    }
                    level = greedy ? level - 1 : 0;
                    buf.push(level > 0 && openBegin ? open : '', text.slice(0, closeIndex), level > 0 ? close : '');
                    text = text.slice(closeIndex + closeLen);
                    openBegin = 0;
                    if (level === 0) {
                        break;
                    }
                }
                if (level === 0) {
                    onInBlock(buf.join(''));
                    onOutBlock(text);
                    buf = [];
                }
            } else {
                text && onOutBlock(text);
            }
        }
        if (level > 0 && buf.length > 0) {
            onOutBlock(open);
            onOutBlock(buf.join(''));
        }
    }
    function compileVariable(source, engine, forText) {
        var code = [];
        var options = engine.options;
        var toStringHead = '';
        var toStringFoot = '';
        var wrapHead = '';
        var wrapFoot = '';
        var defaultFilter;
        if (forText) {
            toStringHead = 'ts(';
            toStringFoot = ')';
            wrapHead = RENDER_STRING_ADD_START;
            wrapFoot = RENDER_STRING_ADD_END;
            defaultFilter = options.defaultFilter;
        }
        parseTextBlock(source, options.variableOpen, options.variableClose, 1, function (text) {
            if (forText && text.indexOf('|') < 0 && defaultFilter) {
                text += '|' + defaultFilter;
            }
            var filterCharIndex = text.indexOf('|');
            var variableName = (filterCharIndex > 0 ? text.slice(0, filterCharIndex) : text).replace(/^\s+/, '').replace(/\s+$/, '');
            var filterSource = filterCharIndex > 0 ? text.slice(filterCharIndex + 1) : '';
            var variableRawValue = variableName.indexOf('*') === 0;
            var variableCode = [
                    variableRawValue ? '' : toStringHead,
                    toGetVariableLiteral(variableName),
                    variableRawValue ? '' : toStringFoot
                ];
            if (filterSource) {
                filterSource = compileVariable(filterSource, engine);
                var filterSegs = filterSource.split('|');
                for (var i = 0, len = filterSegs.length; i < len; i++) {
                    var seg = filterSegs[i];
                    if (/^\s*([a-z0-9_-]+)(\((.*)\))?\s*$/i.test(seg)) {
                        variableCode.unshift('fs["' + RegExp.$1 + '"](');
                        if (RegExp.$3) {
                            variableCode.push(',', RegExp.$3);
                        }
                        variableCode.push(')');
                    }
                }
            }
            code.push(wrapHead, variableCode.join(''), wrapFoot);
        }, function (text) {
            code.push(wrapHead, forText ? stringLiteralize(text) : text, wrapFoot);
        });
        return code.join('');
    }
    function TextNode(value, engine) {
        this.value = value;
        this.engine = engine;
    }
    TextNode.prototype = {
        getRendererBody: function () {
            var value = this.value;
            var options = this.engine.options;
            if (!value || options.strip && /^\s*$/.test(value)) {
                return '';
            }
            return compileVariable(value, this.engine, 1);
        },
        clone: function () {
            return this;
        }
    };
    function Command(value, engine) {
        this.value = value;
        this.engine = engine;
        this.children = [];
        this.cloneProps = [];
    }
    Command.prototype = {
        addChild: function (node) {
            this.children.push(node);
        },
        open: function (context) {
            var parent = context.stack.top();
            parent && parent.addChild(this);
            context.stack.push(this);
        },
        close: function (context) {
            if (context.stack.top() === this) {
                context.stack.pop();
            }
        },
        getRendererBody: function () {
            var buf = [];
            var children = this.children;
            for (var i = 0; i < children.length; i++) {
                buf.push(children[i].getRendererBody());
            }
            return buf.join('');
        },
        clone: function () {
            var node = new this.constructor(this.value, this.engine);
            for (var i = 0, l = this.children.length; i < l; i++) {
                node.addChild(this.children[i].clone());
            }
            for (var i = 0, l = this.cloneProps.length; i < l; i++) {
                var prop = this.cloneProps[i];
                node[prop] = this[prop];
            }
            return node;
        }
    };
    function autoCloseCommand(context, CommandType) {
        var stack = context.stack;
        var closeEnd = CommandType ? stack.find(function (item) {
                return item instanceof CommandType;
            }) : stack.bottom();
        if (closeEnd) {
            var node;
            while ((node = stack.top()) !== closeEnd) {
                if (!node.autoClose) {
                    throw new Error(node.type + ' must be closed manually: ' + node.value);
                }
                node.autoClose(context);
            }
            closeEnd.close(context);
        }
        return closeEnd;
    }
    var RENDERER_BODY_START = '' + 'data=data||{};' + 'var v={},fs=engine.filters,hg=typeof data.get=="function",' + 'gv=function(n,ps){' + 'var p=ps[0],d=v[p];' + 'if(d==null){' + 'if(hg){return data.get(n);}' + 'd=data[p];' + '}' + 'for(var i=1,l=ps.length;i<l;i++)if(d!=null)d = d[ps[i]];' + 'return d;' + '},' + 'ts=function(s){' + 'if(typeof s==="string"){return s;}' + 'if(s==null){s="";}' + 'return ""+s;' + '};';
    ;
    function TargetCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*(\(\s*master\s*=\s*([a-z0-9\/_-]+)\s*\))?\s*/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        this.master = RegExp.$3;
        this.name = RegExp.$1;
        Command.call(this, value, engine);
        this.blocks = {};
    }
    inherits(TargetCommand, Command);
    function BlockCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        this.name = RegExp.$1;
        Command.call(this, value, engine);
        this.cloneProps = ['name'];
    }
    inherits(BlockCommand, Command);
    function ImportCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        this.name = RegExp.$1;
        Command.call(this, value, engine);
        this.cloneProps = [
            'name',
            'state',
            'blocks'
        ];
        this.blocks = {};
    }
    inherits(ImportCommand, Command);
    function VarCommand(value, engine) {
        if (!/^\s*([a-z0-9_]+)\s*=([\s\S]*)$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        this.name = RegExp.$1;
        this.expr = RegExp.$2;
        Command.call(this, value, engine);
        this.cloneProps = [
            'name',
            'expr'
        ];
    }
    inherits(VarCommand, Command);
    function FilterCommand(value, engine) {
        if (!/^\s*([a-z0-9_-]+)\s*(\(([\s\S]*)\))?\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        this.name = RegExp.$1;
        this.args = RegExp.$3;
        Command.call(this, value, engine);
        this.cloneProps = [
            'name',
            'args'
        ];
    }
    inherits(FilterCommand, Command);
    function UseCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*(\(([\s\S]*)\))?\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        this.name = RegExp.$1;
        this.args = RegExp.$3;
        Command.call(this, value, engine);
        this.cloneProps = [
            'name',
            'args'
        ];
    }
    inherits(UseCommand, Command);
    function ForCommand(value, engine) {
        var rule = new RegExp(stringFormat('^\\s*({0}[\\s\\S]+{1})\\s+as\\s+{0}([0-9a-z_]+){1}\\s*(,\\s*{0}([0-9a-z_]+){1})?\\s*$', regexpLiteral(engine.options.variableOpen), regexpLiteral(engine.options.variableClose)), 'i');
        if (!rule.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        this.list = RegExp.$1;
        this.item = RegExp.$2;
        this.index = RegExp.$4;
        Command.call(this, value, engine);
        this.cloneProps = [
            'list',
            'item',
            'index'
        ];
    }
    inherits(ForCommand, Command);
    function IfCommand(value, engine) {
        Command.call(this, value, engine);
    }
    inherits(IfCommand, Command);
    function ElifCommand(value, engine) {
        IfCommand.call(this, value, engine);
    }
    inherits(ElifCommand, IfCommand);
    function ElseCommand(value, engine) {
        Command.call(this, value, engine);
    }
    inherits(ElseCommand, IfCommand);
    var TargetState = {
            READING: 1,
            READED: 2,
            APPLIED: 3,
            READY: 4
        };
    ImportCommand.prototype.applyMaster = TargetCommand.prototype.applyMaster = function (masterName) {
        if (this.state >= TargetState.APPLIED) {
            return 1;
        }
        var blocks = this.blocks;
        function replaceBlock(node) {
            var children = node.children;
            if (children instanceof Array) {
                for (var i = 0, len = children.length; i < len; i++) {
                    var child = children[i];
                    if (child instanceof BlockCommand && blocks[child.name]) {
                        child = children[i] = blocks[child.name];
                    }
                    replaceBlock(child);
                }
            }
        }
        var master = this.engine.targets[masterName];
        if (master && master.applyMaster(master.master)) {
            this.children = master.clone().children;
            replaceBlock(this);
            this.state = TargetState.APPLIED;
            return 1;
        }
    };
    TargetCommand.prototype.isReady = function () {
        if (this.state >= TargetState.READY) {
            return 1;
        }
        var engine = this.engine;
        var readyState = 1;
        function checkReadyState(node) {
            for (var i = 0, len = node.children.length; i < len; i++) {
                var child = node.children[i];
                if (child instanceof ImportCommand) {
                    var target = engine.targets[child.name];
                    readyState = readyState && target && target.isReady(engine);
                } else if (child instanceof Command) {
                    checkReadyState(child);
                }
            }
        }
        if (this.applyMaster(this.master)) {
            checkReadyState(this);
            readyState && (this.state = TargetState.READY);
            return readyState;
        }
    };
    TargetCommand.prototype.getRenderer = function () {
        if (this.renderer) {
            return this.renderer;
        }
        if (this.isReady()) {
            var realRenderer = new Function('data', 'engine', [
                    RENDERER_BODY_START,
                    RENDER_STRING_DECLATION,
                    this.getRendererBody(),
                    RENDER_STRING_RETURN
                ].join('\n'));
            var engine = this.engine;
            this.renderer = function (data) {
                return realRenderer(data, engine);
            };
            return this.renderer;
        }
        return null;
    };
    function addTargetToContext(target, context) {
        context.target = target;
        var engine = context.engine;
        var name = target.name;
        if (engine.targets[name]) {
            switch (engine.options.namingConflict) {
            case 'override':
                engine.targets[name] = target;
                context.targets.push(name);
            case 'ignore':
                break;
            default:
                throw new Error('Target exists: ' + name);
            }
        } else {
            engine.targets[name] = target;
            context.targets.push(name);
        }
    }
    TargetCommand.prototype.open = function (context) {
        autoCloseCommand(context);
        Command.prototype.open.call(this, context);
        this.state = TargetState.READING;
        addTargetToContext(this, context);
    };
    VarCommand.prototype.open = UseCommand.prototype.open = function (context) {
        context.stack.top().addChild(this);
    };
    BlockCommand.prototype.open = function (context) {
        Command.prototype.open.call(this, context);
        (context.imp || context.target).blocks[this.name] = this;
    };
    ElifCommand.prototype.open = function (context) {
        var elseCommand = new ElseCommand();
        elseCommand.open(context);
        var ifCommand = autoCloseCommand(context, IfCommand);
        ifCommand.addChild(this);
        context.stack.push(this);
    };
    ElseCommand.prototype.open = function (context) {
        var ifCommand = autoCloseCommand(context, IfCommand);
        ifCommand.addChild(this);
        context.stack.push(this);
    };
    ImportCommand.prototype.open = function (context) {
        this.parent = context.stack.top();
        this.target = context.target;
        Command.prototype.open.call(this, context);
        this.state = TargetState.READING;
        context.imp = this;
    };
    UseCommand.prototype.close = VarCommand.prototype.close = function () {
    };
    ImportCommand.prototype.close = function (context) {
        Command.prototype.close.call(this, context);
        this.state = TargetState.READED;
        context.imp = null;
    };
    TargetCommand.prototype.close = function (context) {
        Command.prototype.close.call(this, context);
        this.state = this.master ? TargetState.READED : TargetState.APPLIED;
        context.target = null;
    };
    ImportCommand.prototype.autoClose = function (context) {
        var parentChildren = this.parent.children;
        parentChildren.push.apply(parentChildren, this.children);
        this.children.length = 0;
        for (var key in this.blocks) {
            this.target.blocks[key] = this.blocks[key];
        }
        this.blocks = {};
        this.close(context);
    };
    UseCommand.prototype.beforeOpen = ImportCommand.prototype.beforeOpen = VarCommand.prototype.beforeOpen = ForCommand.prototype.beforeOpen = FilterCommand.prototype.beforeOpen = BlockCommand.prototype.beforeOpen = IfCommand.prototype.beforeOpen = TextNode.prototype.beforeAdd = function (context) {
        if (context.stack.bottom()) {
            return;
        }
        var target = new TargetCommand(generateGUID(), context.engine);
        target.open(context);
    };
    ImportCommand.prototype.getRendererBody = function () {
        this.applyMaster(this.name);
        return Command.prototype.getRendererBody.call(this);
    };
    UseCommand.prototype.getRendererBody = function () {
        return stringFormat('{0}engine.render({2},{{3}}){1}', RENDER_STRING_ADD_START, RENDER_STRING_ADD_END, stringLiteralize(this.name), compileVariable(this.args, this.engine).replace(/(^|,)\s*([a-z0-9_]+)\s*=/gi, function (match, start, argName) {
            return (start || '') + stringLiteralize(argName) + ':';
        }));
    };
    VarCommand.prototype.getRendererBody = function () {
        if (this.expr) {
            return stringFormat('v[{0}]={1};', stringLiteralize(this.name), compileVariable(this.expr, this.engine));
        }
        return '';
    };
    IfCommand.prototype.getRendererBody = function () {
        return stringFormat('if({0}){{1}}', compileVariable(this.value, this.engine), Command.prototype.getRendererBody.call(this));
    };
    ElseCommand.prototype.getRendererBody = function () {
        return stringFormat('}else{{0}', Command.prototype.getRendererBody.call(this));
    };
    ForCommand.prototype.getRendererBody = function () {
        return stringFormat('' + 'var {0}={1};' + 'if({0} instanceof Array)' + 'for (var {4}=0,{5}={0}.length;{4}<{5};{4}++){v[{2}]={4};v[{3}]={0}[{4}];{6}}' + 'else if(typeof {0}==="object")' + 'for(var {4} in {0}){v[{2}]={4};v[{3}]={0}[{4}];{6}}', generateGUID(), compileVariable(this.list, this.engine), stringLiteralize(this.index || generateGUID()), stringLiteralize(this.item), generateGUID(), generateGUID(), Command.prototype.getRendererBody.call(this));
    };
    FilterCommand.prototype.getRendererBody = function () {
        var args = this.args;
        return stringFormat('{2}fs[{5}]((function(){{0}{4}{1}})(){6}){3}', RENDER_STRING_DECLATION, RENDER_STRING_RETURN, RENDER_STRING_ADD_START, RENDER_STRING_ADD_END, Command.prototype.getRendererBody.call(this), stringLiteralize(this.name), args ? ',' + compileVariable(args, this.engine) : '');
    };
    var commandTypes = {};
    function addCommandType(name, Type) {
        commandTypes[name] = Type;
        Type.prototype.type = name;
    }
    addCommandType('target', TargetCommand);
    addCommandType('block', BlockCommand);
    addCommandType('import', ImportCommand);
    addCommandType('use', UseCommand);
    addCommandType('var', VarCommand);
    addCommandType('for', ForCommand);
    addCommandType('if', IfCommand);
    addCommandType('elif', ElifCommand);
    addCommandType('else', ElseCommand);
    addCommandType('filter', FilterCommand);
    function Engine(options) {
        this.options = {
            commandOpen: '<!--',
            commandClose: '-->',
            commandSyntax: /^\s*(\/)?([a-z]+)\s*(?::([\s\S]*))?$/,
            variableOpen: '${',
            variableClose: '}',
            defaultFilter: 'html'
        };
        this.config(options);
        this.targets = {};
        this.filters = extend({}, DEFAULT_FILTERS);
    }
    Engine.prototype.config = function (options) {
        extend(this.options, options);
    };
    Engine.prototype.compile = Engine.prototype.parse = function (source) {
        if (source) {
            var targetNames = parseSource(source, this);
            if (targetNames.length) {
                return this.targets[targetNames[0]].getRenderer();
            }
        }
        return new Function('return ""');
    };
    Engine.prototype.getRenderer = function (name) {
        var target = this.targets[name];
        if (target) {
            return target.getRenderer();
        }
    };
    Engine.prototype.render = function (name, data) {
        var renderer = this.getRenderer(name);
        if (renderer) {
            return renderer(data);
        }
        return '';
    };
    Engine.prototype.addFilter = function (name, filter) {
        if (typeof filter === 'function') {
            this.filters[name] = filter;
        }
    };
    function parseSource(source, engine) {
        var commandOpen = engine.options.commandOpen;
        var commandClose = engine.options.commandClose;
        var commandSyntax = engine.options.commandSyntax;
        var stack = new Stack();
        var analyseContext = {
                engine: engine,
                targets: [],
                stack: stack,
                target: null
            };
        var textBuf = [];
        function flushTextBuf() {
            var text;
            if (textBuf.length > 0 && (text = textBuf.join(''))) {
                var textNode = new TextNode(text, engine);
                textNode.beforeAdd(analyseContext);
                stack.top().addChild(textNode);
                textBuf = [];
                if (engine.options.strip && analyseContext.current instanceof Command) {
                    textNode.value = text.replace(/^[\x20\t\r]*\n/, '');
                }
                analyseContext.current = textNode;
            }
        }
        var NodeType;
        parseTextBlock(source, commandOpen, commandClose, 0, function (text) {
            var match = commandSyntax.exec(text);
            if (match && (NodeType = commandTypes[match[2].toLowerCase()]) && typeof NodeType === 'function') {
                flushTextBuf();
                var currentNode = analyseContext.current;
                if (engine.options.strip && currentNode instanceof TextNode) {
                    currentNode.value = currentNode.value.replace(/\r?\n[\x20\t]*$/, '\n');
                }
                if (match[1]) {
                    currentNode = autoCloseCommand(analyseContext, NodeType);
                } else {
                    currentNode = new NodeType(match[3], engine);
                    if (typeof currentNode.beforeOpen === 'function') {
                        currentNode.beforeOpen(analyseContext);
                    }
                    currentNode.open(analyseContext);
                }
                analyseContext.current = currentNode;
            } else if (!/^\s*\/\//.test(text)) {
                textBuf.push(commandOpen, text, commandClose);
            }
            NodeType = null;
        }, function (text) {
            textBuf.push(text);
        });
        flushTextBuf();
        autoCloseCommand(analyseContext);
        return analyseContext.targets;
    }
    var etpl = new Engine();
    etpl.Engine = Engine;
    if (typeof exports === 'object' && typeof module === 'object') {
        exports = module.exports = etpl;
    } else if (typeof define === 'function' && define.amd) {
        define('etpl/main', [], etpl);
    } else {
        root.etpl = etpl;
    }
}(this));

define('etpl', ['etpl/main'], function ( main ) { return main; });

define('mini-event/lib', ['require'], function (require) {
    var lib = {};
    lib.extend = function (source) {
        for (var i = 1; i < arguments.length; i++) {
            var addition = arguments[i];
            if (!addition) {
                continue;
            }
            for (var key in addition) {
                if (addition.hasOwnProperty(key)) {
                    source[key] = addition[key];
                }
            }
        }
        return source;
    };
    return lib;
});

define('mini-event/Event', [
    'require',
    './lib'
], function (require) {
    var lib = require('./lib');
    function returnTrue() {
        return true;
    }
    function returnFalse() {
        return false;
    }
    function isObject(target) {
        return Object.prototype.toString.call(target) === '[object Object]';
    }
    function Event(type, args) {
        if (typeof type === 'object') {
            args = type;
            type = args.type;
        }
        if (isObject(args)) {
            lib.extend(this, args);
        } else if (args) {
            this.data = args;
        }
        if (type) {
            this.type = type;
        }
    }
    Event.prototype.isDefaultPrevented = returnFalse;
    Event.prototype.preventDefault = function () {
        this.isDefaultPrevented = returnTrue;
    };
    Event.prototype.isPropagationStopped = returnFalse;
    Event.prototype.stopPropagation = function () {
        this.isPropagationStopped = returnTrue;
    };
    Event.prototype.isImmediatePropagationStopped = returnFalse;
    Event.prototype.stopImmediatePropagation = function () {
        this.isImmediatePropagationStopped = returnTrue;
        this.stopPropagation();
    };
    var globalWindow = function () {
            return this;
        }();
    Event.fromDOMEvent = function (domEvent, type, args) {
        domEvent = domEvent || globalWindow.event;
        var event = new Event(type, args);
        event.preventDefault = function () {
            if (domEvent.preventDefault) {
                domEvent.preventDefault();
            } else {
                domEvent.returnValue = false;
            }
            Event.prototype.preventDefault.call(this);
        };
        event.stopPropagation = function () {
            if (domEvent.stopPropagation) {
                domEvent.stopPropagation();
            } else {
                domEvent.cancelBubble = true;
            }
            Event.prototype.stopPropagation.call(this);
        };
        event.stopImmediatePropagation = function () {
            if (domEvent.stopImmediatePropagation) {
                domEvent.stopImmediatePropagation();
            }
            Event.prototype.stopImmediatePropagation.call(this);
        };
        return event;
    };
    var EVENT_PROPERTY_BLACK_LIST = {
            type: true,
            target: true,
            preventDefault: true,
            isDefaultPrevented: true,
            stopPropagation: true,
            isPropagationStopped: true,
            stopImmediatePropagation: true,
            isImmediatePropagationStopped: true
        };
    Event.fromEvent = function (originalEvent, options) {
        var defaults = {
                type: originalEvent.type,
                preserveData: false,
                syncState: false
            };
        options = lib.extend(defaults, options);
        var newEvent = new Event(options.type);
        if (options.preserveData) {
            for (var key in originalEvent) {
                if (originalEvent.hasOwnProperty(key) && !EVENT_PROPERTY_BLACK_LIST.hasOwnProperty(key)) {
                    newEvent[key] = originalEvent[key];
                }
            }
        }
        if (options.extend) {
            lib.extend(newEvent, options.extend);
        }
        if (options.syncState) {
            newEvent.preventDefault = function () {
                originalEvent.preventDefault();
                Event.prototype.preventDefault.call(this);
            };
            newEvent.stopPropagation = function () {
                originalEvent.stopPropagation();
                Event.prototype.stopPropagation.call(this);
            };
            newEvent.stopImmediatePropagation = function () {
                originalEvent.stopImmediatePropagation();
                Event.prototype.stopImmediatePropagation.call(this);
            };
        }
        return newEvent;
    };
    Event.delegate = function (from, fromType, to, toType, options) {
        var useDifferentType = typeof fromType === 'string';
        var source = {
                object: from,
                type: useDifferentType ? fromType : to
            };
        var target = {
                object: useDifferentType ? to : fromType,
                type: useDifferentType ? toType : to
            };
        var config = useDifferentType ? options : toType;
        config = lib.extend({ preserveData: false }, config);
        if (typeof source.object.on !== 'function' || typeof target.object.on !== 'function' || typeof target.object.fire !== 'function') {
            return;
        }
        var delegator = function (originalEvent) {
            var event = Event.fromEvent(originalEvent, config);
            event.type = target.type;
            event.target = target.object;
            target.object.fire(target.type, event);
        };
        source.object.on(source.type, delegator);
    };
    return Event;
});

define('fc-core/util', [
    'require',
    'underscore',
    './assert',
    'mini-event/Event',
    'etpl'
], function (require) {
    'use strict';
    var _ = require('underscore');
    var assert = require('./assert');
    var util = {};
    function rand16Num(len) {
        len = len || 0;
        var result = [];
        for (var i = 0; i < len; i++) {
            result.push('0123456789abcdef'.charAt(Math.floor(Math.random() * 16)));
        }
        return result.join('');
    }
    util.guid = function () {
        var curr = new Date().valueOf().toString();
        return [
            '4b534c46',
            rand16Num(4),
            '4' + rand16Num(3),
            rand16Num(4),
            curr.substring(0, 12)
        ].join('-');
    };
    util.uid = function () {
        return [
            new Date().valueOf().toString(),
            rand16Num(4)
        ].join('');
    };
    util.processError = function (ex) {
        if (ex instanceof Error) {
            window.console.error(ex.stack);
        } else if (ex.error instanceof Error || _.isArray(ex.error)) {
            util.processError(ex.error);
        } else if (_.isArray(ex)) {
            _.each(ex, util.processError);
        } else if (ex instanceof require('mini-event/Event') && ex.type === 'error') {
            window.console.error(ex.error.failType, ex.error.reason, ex);
        } else {
            window.console.error(ex);
        }
    };
    var toString = Object.prototype.toString;
    function deepExtend(target) {
        var length = arguments.length;
        if (length < 2) {
            return target;
        }
        for (var i = 1; i < length; i++) {
            simpleDeepExtend(arguments[0], arguments[i]);
        }
        return arguments[0];
    }
    function simpleDeepExtend(target, source) {
        for (var k in source) {
            if (!source.hasOwnProperty(k)) {
                continue;
            }
            var targetType = toString.call(target[k]);
            var sourceType = toString.call(source[k]);
            switch (sourceType) {
            case '[object Object]':
                if (targetType !== sourceType) {
                    target[k] = clone(source[k]);
                } else {
                    if (!target[k]) {
                        target[k] = clone(source[k]);
                    }
                    deepExtend(target[k], source[k]);
                }
                break;
            case '[object Array]':
                target[k] = clone(source[k]);
                break;
            default:
                target[k] = source[k];
            }
        }
        return target;
    }
    util.deepExtend = deepExtend;
    var simpleType = {
            '[object String]': 1,
            '[object Number]': 1,
            '[object Boolean]': 1,
            '[object Null]': 1,
            '[object Undefined]': 1,
            '[object Function]': 1,
            '[object RegExp]': 1,
            '[object Date]': 1,
            '[object Error]': 1
        };
    function clone(target) {
        var strType = toString.call(target);
        if (simpleType[strType]) {
            return target;
        }
        switch (strType) {
        case '[object Object]':
            if (!target) {
                return target;
            }
            var newObj = {};
            for (var k in target) {
                if (target.hasOwnProperty(k)) {
                    newObj[k] = clone(target[k]);
                }
            }
            return newObj;
        case '[object Array]':
            var newArr = [];
            for (var i = 0, l = target.length; i < l; i++) {
                newArr.push(clone(target[i]));
            }
            return newArr;
        default:
            return target;
        }
    }
    util.clone = clone;
    function mixWith(conf, data) {
        return JSON.parse(require('etpl').compile(JSON.stringify(conf))(data));
    }
    util.mixWith = mixWith;
    util.customData = function (data) {
        return { data: data };
    };
    util.parseJSON = function (text) {
        if (!text) {
            return undefined;
        }
        if (window.JSON && typeof JSON.parse === 'function') {
            return JSON.parse(text);
        } else {
            return new Function('return (' + text + ');')();
        }
    };
    return util;
});

define('fc-core/main', [
    'require',
    'promise/setImmediate',
    './aop',
    './assert',
    './oo',
    'etpl',
    './util'
], function (require) {
    'use strict';
    var fc = {
            version: '0.0.1.alpha.2',
            setImmediate: require('promise/setImmediate'),
            aop: require('./aop'),
            assert: require('./assert'),
            oo: require('./oo'),
            tpl: require('etpl'),
            util: require('./util')
        };
    return fc;
});

define('fc-core', ['fc-core/main'], function ( main ) { return main; });

define('fc-ajax/hooks', ['require'], function (require) {
    var noop = function () {
    };
    function serializeArray(prefix, array) {
        var encodedKey = prefix ? encodeURIComponent(prefix) : '';
        var encoded = [];
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            encoded[i] = this.serializeData('', item);
        }
        return encodedKey ? encodedKey + '=' + encoded.join(',') : encoded.join(',');
    }
    function serializeData(prefix, data) {
        if (arguments.length === 1) {
            data = prefix;
            prefix = '';
        }
        if (data == null) {
            data = '';
        }
        var getKey = this.serializeData.getKey;
        var encodedKey = prefix ? encodeURIComponent(prefix) : '';
        var type = Object.prototype.toString.call(data);
        switch (type) {
        case '[object Array]':
            return this.serializeArray(prefix, data);
        case '[object Object]':
            var result = [];
            for (var name in data) {
                var propertyKey = getKey(name, prefix);
                var propertyValue = this.serializeData(propertyKey, data[name]);
                result.push(propertyValue);
            }
            return result.join('&');
        default:
            return encodedKey ? encodedKey + '=' + encodeURIComponent(data) : encodeURIComponent(data);
        }
    }
    serializeData.getKey = function (propertyName, parentKey) {
        return parentKey ? parentKey + '.' + propertyName : propertyName;
    };
    var hooks = {
            serializeData: serializeData,
            serializeArray: serializeArray
        };
    return hooks;
});

define('fc-ajax/globalData', ['require'], function (require) {
    return {};
});

define('fc-ajax/config', ['require'], function (require) {
    var config = {
            method: 'POST',
            data: {},
            cache: false,
            timeout: 0,
            charset: '',
            dataType: 'json'
        };
    return config;
});

define('er/util', [], function () {
    var now = +new Date();
    var util = {};
    util.guid = function () {
        return 'er' + now++;
    };
    util.mix = function (source) {
        for (var i = 1; i < arguments.length; i++) {
            var destination = arguments[i];
            if (!destination) {
                continue;
            }
            for (var key in destination) {
                if (destination.hasOwnProperty(key)) {
                    source[key] = destination[key];
                }
            }
        }
        return source;
    };
    var nativeBind = Function.prototype.bind;
    util.bind = nativeBind ? function (fn) {
        return nativeBind.apply(fn, [].slice.call(arguments, 1));
    } : function (fn, context) {
        var extraArgs = [].slice.call(arguments, 2);
        return function () {
            var args = extraArgs.concat([].slice.call(arguments));
            return fn.apply(context, args);
        };
    };
    util.noop = function () {
    };
    var dontEnumBug = !{ toString: 1 }.propertyIsEnumerable('toString');
    util.inherits = function (type, superType) {
        var Empty = function () {
        };
        Empty.prototype = superType.prototype;
        var proto = new Empty();
        var originalPrototype = type.prototype;
        type.prototype = proto;
        for (var key in originalPrototype) {
            proto[key] = originalPrototype[key];
        }
        if (dontEnumBug) {
            if (originalPrototype.hasOwnProperty('toString')) {
                proto.toString = originalPrototype.toString;
            }
            if (originalPrototype.hasOwnProperty('valueOf')) {
                proto.valueOf = originalPrototype.valueOf;
            }
        }
        type.prototype.constructor = type;
        return type;
    };
    util.parseJSON = function (text) {
        if (!text) {
            return undefined;
        }
        if (window.JSON && typeof JSON.parse === 'function') {
            return JSON.parse(text);
        } else {
            return new Function('return (' + text + ');')();
        }
    };
    var whitespace = /(^[\s\t\xa0\u3000]+)|([\u3000\xa0\s\t]+$)/g;
    util.trim = function (source) {
        return source.replace(whitespace, '');
    };
    util.encodeHTML = function (source) {
        source = source + '';
        return source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };
    util.getElement = function (element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        return element;
    };
    return util;
});

define('mini-event/EventQueue', [
    'require',
    './lib'
], function (require) {
    var lib = require('./lib');
    function isContextIdentical(context, handler, thisObject) {
        return context && context.handler === handler && context.thisObject == thisObject;
    }
    function EventQueue() {
        this.queue = [];
    }
    EventQueue.prototype.add = function (handler, options) {
        if (handler !== false && typeof handler !== 'function') {
            throw new Error('event handler must be a function or const false');
        }
        var wrapper = { handler: handler };
        lib.extend(wrapper, options);
        for (var i = 0; i < this.queue.length; i++) {
            var context = this.queue[i];
            if (isContextIdentical(context, handler, wrapper.thisObject)) {
                return;
            }
        }
        this.queue.push(wrapper);
    };
    EventQueue.prototype.remove = function (handler, thisObject) {
        if (!handler) {
            this.clear();
            return;
        }
        for (var i = 0; i < this.queue.length; i++) {
            var context = this.queue[i];
            if (isContextIdentical(context, handler, thisObject)) {
                this.queue[i] = null;
                return;
            }
        }
    };
    EventQueue.prototype.clear = function () {
        this.queue.length = 0;
    };
    EventQueue.prototype.execute = function (event, thisObject) {
        var queue = this.queue;
        for (var i = 0; i < queue.length; i++) {
            if (typeof event.isImmediatePropagationStopped === 'function' && event.isImmediatePropagationStopped()) {
                return;
            }
            var context = queue[i];
            if (!context) {
                continue;
            }
            var handler = context.handler;
            if (handler === false) {
                if (typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                if (typeof event.stopPropagation === 'function') {
                    event.stopPropagation();
                }
            } else {
                handler.call(context.thisObject || thisObject, event);
            }
            if (context.once) {
                this.remove(context.handler, context.thisObject);
            }
        }
    };
    EventQueue.prototype.getLength = function () {
        var count = 0;
        for (var i = 0; i < this.queue.length; i++) {
            if (this.queue[i]) {
                count++;
            }
        }
        return count;
    };
    EventQueue.prototype.length = EventQueue.prototype.getLength;
    EventQueue.prototype.dispose = function () {
        this.clear();
        this.queue = null;
    };
    return EventQueue;
});

define('mini-event/EventTarget', [
    'require',
    './lib',
    './Event',
    './EventQueue'
], function (require) {
    var lib = require('./lib');
    var Event = require('./Event');
    var EventQueue = require('./EventQueue');
    function EventTarget() {
    }
    EventTarget.prototype.on = function (type, fn, thisObject, options) {
        if (!this.miniEventPool) {
            this.miniEventPool = {};
        }
        if (!this.miniEventPool.hasOwnProperty(type)) {
            this.miniEventPool[type] = new EventQueue();
        }
        var queue = this.miniEventPool[type];
        options = lib.extend({}, options);
        if (thisObject) {
            options.thisObject = thisObject;
        }
        queue.add(fn, options);
    };
    EventTarget.prototype.once = function (type, fn, thisObject, options) {
        options = lib.extend({}, options);
        options.once = true;
        this.on(type, fn, thisObject, options);
    };
    EventTarget.prototype.un = function (type, handler, thisObject) {
        if (!this.miniEventPool || !this.miniEventPool.hasOwnProperty(type)) {
            return;
        }
        var queue = this.miniEventPool[type];
        queue.remove(handler, thisObject);
    };
    EventTarget.prototype.fire = function (type, args) {
        if (arguments.length === 1 && typeof type === 'object') {
            args = type;
            type = args.type;
        }
        if (!type) {
            throw new Error('No event type specified');
        }
        if (type === '*') {
            throw new Error('Cannot fire global event');
        }
        var event = args instanceof Event ? args : new Event(type, args);
        event.target = this;
        var inlineHandler = this['on' + type];
        if (typeof inlineHandler === 'function') {
            inlineHandler.call(this, event);
        }
        if (this.miniEventPool && this.miniEventPool.hasOwnProperty(type)) {
            var queue = this.miniEventPool[type];
            queue.execute(event, this);
        }
        if (this.miniEventPool && this.miniEventPool.hasOwnProperty('*')) {
            var globalQueue = this.miniEventPool['*'];
            globalQueue.execute(event, this);
        }
        return event;
    };
    EventTarget.prototype.destroyEvents = function () {
        if (!this.miniEventPool) {
            return;
        }
        for (var name in this.miniEventPool) {
            if (this.miniEventPool.hasOwnProperty(name)) {
                this.miniEventPool[name].dispose();
            }
        }
        this.miniEventPool = null;
    };
    EventTarget.enable = function (target) {
        target.miniEventPool = {};
        lib.extend(target, EventTarget.prototype);
    };
    return EventTarget;
});

define('er/Deferred', [
    'require',
    './util',
    './assert',
    'eoo',
    'mini-event/EventTarget'
], function (require) {
    var util = require('./util');
    var assert = require('./assert');
    var setImmediate = typeof window.setImmediate === 'function' ? function (fn) {
            window.setImmediate(fn);
        } : function (fn) {
            window.setTimeout(fn, 0);
        };
    function tryFlush(deferred) {
        if (deferred.state === 'pending') {
            return;
        }
        var callbacks = deferred.state === 'resolved' ? deferred._doneCallbacks.slice() : deferred._failCallbacks.slice();
        function flush() {
            for (var i = 0; i < callbacks.length; i++) {
                var callback = callbacks[i];
                try {
                    callback.apply(deferred.promise, deferred._args);
                } catch (ex) {
                }
            }
        }
        if (deferred.syncModeEnabled) {
            flush();
        } else {
            setImmediate(flush);
        }
        deferred._doneCallbacks = [];
        deferred._failCallbacks = [];
    }
    function pipe(original, deferred, callback, actionType) {
        return function () {
            if (typeof callback === 'function') {
                var resolver = deferred.resolver;
                try {
                    var returnValue = callback.apply(original.promise, arguments);
                    if (Deferred.isPromise(returnValue)) {
                        returnValue.then(resolver.resolve, resolver.reject);
                    } else {
                        resolver.resolve(returnValue);
                    }
                } catch (error) {
                    Deferred.fire('exception', {
                        deferred: original,
                        args: [error],
                        reason: error
                    });
                    resolver.reject(error);
                }
            } else {
                deferred[actionType].apply(deferred, original._args);
            }
        };
    }
    var exports = {};
    exports.constructor = function () {
        this.state = 'pending';
        this._args = null;
        this._doneCallbacks = [];
        this._failCallbacks = [];
        this.promise = {
            done: util.bind(this.done, this),
            fail: util.bind(this.fail, this),
            ensure: util.bind(this.ensure, this),
            then: util.bind(this.then, this)
        };
        this.promise.promise = this.promise;
        this.resolver = {
            resolve: util.bind(this.resolve, this),
            reject: util.bind(this.reject, this)
        };
    };
    exports.syncModeEnabled = false;
    exports.resolve = function () {
        if (this.state !== 'pending') {
            return;
        }
        this.state = 'resolved';
        this._args = [].slice.call(arguments);
        Deferred.fire('resolve', {
            deferred: this,
            args: this._args,
            reason: this._args[0]
        });
        tryFlush(this);
    };
    exports.reject = function () {
        if (this.state !== 'pending') {
            return;
        }
        this.state = 'rejected';
        this._args = [].slice.call(arguments);
        Deferred.fire('reject', {
            deferred: this,
            args: this._args,
            reason: this._args[0]
        });
        tryFlush(this);
    };
    exports.done = function (callback) {
        return this.then(callback);
    };
    exports.fail = function (callback) {
        return this.then(null, callback);
    };
    exports.ensure = function (callback) {
        return this.then(callback, callback);
    };
    exports.then = function (done, fail) {
        var deferred = new Deferred();
        deferred.syncModeEnabled = this.syncModeEnabled;
        this._doneCallbacks.push(pipe(this, deferred, done, 'resolve'));
        this._failCallbacks.push(pipe(this, deferred, fail, 'reject'));
        tryFlush(this);
        return deferred.promise;
    };
    var Deferred = require('eoo').create(exports);
    require('mini-event/EventTarget').enable(Deferred);
    Deferred.isPromise = function (value) {
        return value && typeof value.then === 'function';
    };
    Deferred.all = function () {
        var workingUnits = [].concat.apply([], arguments);
        var workingCount = workingUnits.length;
        if (!workingCount) {
            return Deferred.resolved();
        }
        var actionType = 'resolve';
        var result = [];
        var jointDeferred = new Deferred();
        function resolveOne(whichToFill) {
            workingCount--;
            assert.greaterThanOrEquals(workingCount, 0, 'workingCount should be positive');
            var unitResult = [].slice.call(arguments, 1);
            if (unitResult.length <= 1) {
                unitResult = unitResult[0];
            }
            result[whichToFill] = unitResult;
            if (workingCount === 0) {
                jointDeferred[actionType].apply(jointDeferred, result);
            }
        }
        function rejectOne() {
            actionType = 'reject';
            resolveOne.apply(this, arguments);
        }
        for (var i = 0; i < workingUnits.length; i++) {
            var unit = workingUnits[i];
            unit.then(util.bind(resolveOne, unit, i), util.bind(rejectOne, unit, i));
        }
        return jointDeferred.promise;
    };
    Deferred.resolved = function () {
        var deferred = new Deferred();
        deferred.resolve.apply(deferred, arguments);
        return deferred.promise;
    };
    Deferred.rejected = function () {
        var deferred = new Deferred();
        deferred.reject.apply(deferred, arguments);
        return deferred.promise;
    };
    Deferred.when = function (value) {
        if (Deferred.isPromise(value)) {
            return value;
        }
        var deferred = new Deferred();
        deferred.syncModeEnabled = true;
        deferred.resolve(value);
        return deferred.promise;
    };
    Deferred.require = function (modules) {
        var deferred = new Deferred();
        window.require(modules, deferred.resolver.resolve);
        deferred.promise.abort = deferred.resolver.reject;
        return deferred.promise;
    };
    return Deferred;
});

define('er/ajax', [
    'require',
    './assert',
    './util',
    './Deferred',
    'eoo',
    'mini-event/EventTarget'
], function (require) {
    var TIMESTAMP_PARAM_KEY = '_';
    function serializeArray(prefix, array) {
        var encodedKey = prefix ? encodeURIComponent(prefix) : '';
        var encoded = [];
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            encoded[i] = this.serializeData('', item);
        }
        return encodedKey ? encodedKey + '=' + encoded.join(',') : encoded.join(',');
    }
    function serializeData(prefix, data) {
        if (arguments.length === 1) {
            data = prefix;
            prefix = '';
        }
        if (data == null) {
            data = '';
        }
        var getKey = this.serializeData.getKey;
        var encodedKey = prefix ? encodeURIComponent(prefix) : '';
        var type = Object.prototype.toString.call(data);
        switch (type) {
        case '[object Array]':
            return this.serializeArray(prefix, data);
        case '[object Object]':
            var result = [];
            for (var name in data) {
                var propertyKey = getKey(name, prefix);
                var propertyValue = this.serializeData(propertyKey, data[name]);
                result.push(propertyValue);
            }
            return result.join('&');
        default:
            return encodedKey ? encodedKey + '=' + encodeURIComponent(data) : encodeURIComponent(data);
        }
    }
    serializeData.getKey = function (propertyName, parentKey) {
        return parentKey ? parentKey + '.' + propertyName : propertyName;
    };
    var exports = {};
    exports.constructor = function () {
        this.hooks = {
            serializeData: serializeData,
            serializeArray: serializeArray
        };
        this.config = {
            cache: false,
            timeout: 0,
            charset: ''
        };
    };
    exports.request = function (options) {
        if (typeof this.hooks.beforeExecute === 'function') {
            this.hooks.beforeExecute(options);
        }
        var assert = require('./assert');
        assert.hasProperty(options, 'url', 'url property is required');
        var defaults = {
                method: 'POST',
                data: {},
                cache: this.config.cache,
                timeout: this.config.timeout,
                charset: this.config.charset
            };
        var util = require('./util');
        options = util.mix(defaults, options);
        var Deferred = require('./Deferred');
        var requesting = new Deferred();
        if (typeof this.hooks.beforeCreate === 'function') {
            var canceled = this.hooks.beforeCreate(options, requesting);
            if (canceled === true) {
                var fakeXHR = requesting.promise;
                fakeXHR.abort = function () {
                };
                fakeXHR.setRequestHeader = function () {
                };
                return fakeXHR;
            }
        }
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new window.ActiveXObject('Microsoft.XMLHTTP');
        util.mix(xhr, options.xhrFields);
        var fakeXHR = requesting.promise;
        var xhrWrapper = {
                abort: function () {
                    xhr.onreadystatechange = null;
                    try {
                        xhr.abort();
                    } catch (ex) {
                    }
                    if (!fakeXHR.status) {
                        fakeXHR.status = 0;
                    }
                    fakeXHR.readyState = xhr.readyState;
                    fakeXHR.responseText = '';
                    fakeXHR.responseXML = '';
                    requesting.reject(fakeXHR);
                },
                setRequestHeader: function (name, value) {
                    xhr.setRequestHeader(name, value);
                },
                getAllResponseHeaders: function () {
                    return xhr.getAllResponseHeaders();
                },
                getResponseHeader: function (name) {
                    return xhr.getResponseHeader(name);
                },
                getRequestOption: function (name) {
                    return options[name];
                }
            };
        util.mix(fakeXHR, xhrWrapper);
        var eventObject = {
                xhr: fakeXHR,
                options: options
            };
        fakeXHR.then(util.bind(this.fire, this, 'done', eventObject), util.bind(this.fire, this, 'fail', eventObject));
        var processRequestStatus = function () {
            p('xhr state change' + xhr.readyState)();
            if (xhr.readyState === 4) {
                p('xhr finish')();
                var status = fakeXHR.status || xhr.status;
                if (status === 1223) {
                    status = 204;
                }
                fakeXHR.status = fakeXHR.status || status;
                fakeXHR.readyState = xhr.readyState;
                fakeXHR.responseText = xhr.responseText;
                fakeXHR.responseXML = xhr.responseXML;
                if (typeof this.hooks.afterReceive === 'function') {
                    this.hooks.afterReceive(fakeXHR, options);
                }
                if (status < 200 || status >= 300 && status !== 304) {
                    requesting.reject(fakeXHR);
                    return;
                }
                var data = xhr.responseText;
                if (options.dataType === 'json') {
                    try {
                        data = util.parseJSON(data);
                    } catch (ex) {
                        fakeXHR.error = ex;
                        requesting.reject(fakeXHR);
                        return;
                    }
                }
                if (typeof this.hooks.afterParse === 'function') {
                    try {
                        data = this.hooks.afterParse(data, fakeXHR, options);
                    } catch (ex) {
                        fakeXHR.error = ex;
                        requesting.reject(fakeXHR);
                        return;
                    }
                }
                requesting.resolve(data);
            }
        };
        xhr.onreadystatechange = util.bind(processRequestStatus, this);
        var method = options.method.toUpperCase();
        var data = {};
        if (method === 'GET') {
            util.mix(data, options.data);
        }
        if (options.cache === false) {
            data[TIMESTAMP_PARAM_KEY] = +new Date();
        }
        var query = this.hooks.serializeData('', data, 'application/x-www-form-urlencoded');
        var url = options.url;
        if (query) {
            var delimiter = url.indexOf('?') >= 0 ? '&' : '?';
            url += delimiter + query;
        }
        xhr.open(method, url, true);
        if (typeof this.hooks.beforeSend === 'function') {
            this.hooks.beforeSend(fakeXHR, options);
        }
        p('xhr send')();
        if (method === 'GET') {
            xhr.send();
        } else {
            var contentType = options.contentType || 'application/x-www-form-urlencoded';
            var query = this.hooks.serializeData('', options.data, contentType, fakeXHR);
            if (options.charset) {
                contentType += ';charset=' + options.charset;
            }
            xhr.setRequestHeader('Content-Type', contentType);
            xhr.send(query);
        }
        if (options.timeout > 0) {
            var notifyTimeout = function () {
                this.fire('timeout', {
                    xhr: fakeXHR,
                    options: options
                });
                fakeXHR.status = 408;
                fakeXHR.abort();
            };
            var tick = setTimeout(util.bind(notifyTimeout, this), options.timeout);
            fakeXHR.ensure(function () {
                clearTimeout(tick);
            });
        }
        return fakeXHR;
    };
    exports.get = function (url, data, cache) {
        var options = {
                method: 'GET',
                url: url,
                data: data,
                cache: cache || this.config.cache
            };
        return this.request(options);
    };
    exports.getJSON = function (url, data, cache) {
        var options = {
                method: 'GET',
                url: url,
                data: data,
                dataType: 'json',
                cache: cache || this.config.cache
            };
        return this.request(options);
    };
    exports.post = function (url, data, dataType) {
        var options = {
                method: 'POST',
                url: url,
                data: data,
                dataType: dataType || 'json'
            };
        return this.request(options);
    };
    exports.log = function (url, data) {
        var img = new Image();
        var pool = window.ER_LOG_POOL || (window.ER_LOG_POOL = {});
        var id = +new Date();
        pool[id] = img;
        img.onload = img.onerror = img.onabort = function () {
            img.onload = img.onerror = img.onabort = null;
            pool[id] = null;
            img = null;
        };
        var query = this.hooks.serializeData('', data, 'application/x-www-form-urlencoded');
        if (query) {
            var delimiter = url.indexOf('?') >= 0 ? ':' : '?';
            url += delimiter + query;
        }
        img.src = url;
    };
    var Ajax = require('eoo').create(require('mini-event/EventTarget'), exports);
    var instance = new Ajax();
    instance.Ajax = Ajax;
    return instance;
});

void function (define) {
    define('promise/util', ['require'], function (require) {
        var util = {};
        var nativeBind = Function.prototype.bind;
        if (typeof nativeBind === 'function') {
            util.bind = function (fn) {
                return nativeBind.apply(fn, [].slice.call(arguments, 1));
            };
        } else {
            util.bind = function (fn, thisObject) {
                var extraArgs = [].slice.call(arguments, 2);
                return function () {
                    var args = extraArgs.concat([].slice.call(arguments));
                    return fn.apply(thisObject, args);
                };
            };
        }
        util.isArray = function (obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        };
        util.getThen = function (promise) {
            return promise && (typeof promise === 'object' || typeof promise === 'function') && promise.then;
        };
        return util;
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
}, this);

void function (define) {
    define('promise/PromiseCapacity', [
        'require',
        './util',
        './setImmediate'
    ], function (require) {
        var u = require('./util');
        var PENDING = 'pending';
        var FULFILLED = 'fulfilled';
        var REJECTED = 'rejected';
        var setImmediate = require('./setImmediate');
        var syncInvoke = function (fn) {
            fn();
        };
        function PromiseCapacity(promise) {
            this.promise = promise;
            this.status = PENDING;
            this.isResolved = false;
            this.result = undefined;
            this.fulfilledCallbacks = [];
            this.rejectedCallbacks = [];
            this.syncModeEnabled = false;
            this.invoke = setImmediate;
        }
        PromiseCapacity.prototype = {
            constructor: PromiseCapacity,
            resolve: function (value) {
                if (this.status !== PENDING || this.isResolved) {
                    return;
                }
                if (value === this.promise) {
                    this.reject(new TypeError('Chaining cycle detected for promise #<Promise>'));
                    return;
                }
                try {
                    var then = u.getThen(value);
                    if (typeof then === 'function') {
                        chain(u.bind(then, value), this);
                        return;
                    }
                } catch (e) {
                    this.status === PENDING && this.reject(e);
                    return;
                }
                this.result = value;
                this.status = FULFILLED;
                exec(this);
            },
            reject: function (obj) {
                if (this.status !== PENDING || this.isResolved) {
                    return;
                }
                this.result = obj;
                this.status = REJECTED;
                exec(this);
            },
            then: function (onFulfilled, onRejected) {
                var capacity = this;
                this.syncModeEnabled = this.promise.syncModeEnabled;
                this.invoke = this.syncModeEnabled ? syncInvoke : setImmediate;
                var promise = new this.promise.constructor(function (resolve, reject) {
                        capacity.fulfilledCallbacks.push(createCallback(resolve, onFulfilled, resolve, reject));
                        capacity.rejectedCallbacks.push(createCallback(reject, onRejected, resolve, reject));
                    });
                promise.syncModeEnabled = this.syncModeEnabled;
                exec(this);
                return promise;
            }
        };
        function createCallback(method, callback, resolve, reject) {
            return function (value) {
                try {
                    if (typeof callback === 'function') {
                        value = callback(value);
                        method = resolve;
                    }
                    method(value);
                } catch (e) {
                    reject(e);
                }
            };
        }
        function chain(then, capacity) {
            capacity.isResolved = true;
            var chainedPromise = new capacity.promise.constructor(function (resolve, reject) {
                    var called = false;
                    try {
                        then(function (v) {
                            resolve(v);
                            called = true;
                        }, function (v) {
                            reject(v);
                            called = true;
                        });
                    } catch (e) {
                        !called && reject(e);
                    }
                });
            chainedPromise.then(function (v) {
                capacity.isResolved = false;
                capacity.resolve(v);
            }, function (v) {
                capacity.isResolved = false;
                capacity.reject(v);
            });
        }
        function exec(capacity) {
            if (capacity.status === PENDING) {
                return;
            }
            var callbacks = null;
            if (capacity.status === FULFILLED) {
                capacity.rejectedCallbacks = [];
                callbacks = capacity.fulfilledCallbacks;
            } else {
                capacity.fulfilledCallbacks = [];
                callbacks = capacity.rejectedCallbacks;
            }
            capacity.invoke(function () {
                var callback;
                var val = capacity.result;
                while (callback = callbacks.shift()) {
                    callback(val);
                }
            });
        }
        return PromiseCapacity;
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
}, this);

void function (define, global, undefined) {
    define('promise/Promise', [
        'require',
        './util',
        './PromiseCapacity'
    ], function (require) {
        var u = require('./util');
        var PromiseCapacity = require('./PromiseCapacity');
        function Promise(executor) {
            if (typeof executor !== 'function') {
                throw new TypeError('Promise resolver undefined is not a function');
            }
            if (!(this instanceof Promise)) {
                throw new TypeError('Failed to construct \'Promise\': Please use the \'new\' operator, ' + 'this object constructor cannot be called as a function.');
            }
            var capacity = new PromiseCapacity(this);
            this.then = u.bind(capacity.then, capacity);
            executor(u.bind(capacity.resolve, capacity), u.bind(capacity.reject, capacity));
        }
        Promise.prototype.then = function (onFulfilled, onReject) {
        };
        Promise.prototype['catch'] = function (onRejected) {
            return this.then(null, onRejected);
        };
        Promise.resolve = function (value) {
            return new Promise(function (resolve) {
                resolve(value);
            });
        };
        Promise.reject = function (obj) {
            return new Promise(function (resolve, reject) {
                reject(obj);
            });
        };
        Promise.all = function (promises) {
            var Promise = this;
            if (!u.isArray(promises)) {
                throw new TypeError('You must pass an array to all.');
            }
            return new Promise(function (resolve, reject) {
                var results = [];
                var remaining = promises.length;
                var promise = null;
                if (remaining === 0) {
                    resolve([]);
                }
                function resolver(index) {
                    return function (value) {
                        resolveAll(index, value);
                    };
                }
                function resolveAll(index, value) {
                    results[index] = value;
                    if (--remaining === 0) {
                        resolve(results);
                    }
                }
                for (var i = 0, len = promises.length; i < len; i++) {
                    promise = promises[i];
                    var then = u.getThen(promise);
                    if (typeof then === 'function') {
                        promise.then(resolver(i), reject);
                    } else {
                        resolveAll(i, promise);
                    }
                }
            });
        };
        Promise.race = function (promises) {
            var Promise = this;
            if (!u.isArray(promises)) {
                throw new TypeError('You must pass an array to race.');
            }
            return new Promise(function (resolve, reject) {
                for (var i = 0, len = promises.length; i < len; i++) {
                    var promise = promises[i];
                    var then = u.getThen(promise);
                    if (typeof then === 'function') {
                        then.call(promise, resolve, reject);
                    } else {
                        resolve(promise);
                    }
                }
            });
        };
        Promise.cast = function (value) {
            if (value && typeof value === 'object' && value.constructor === this) {
                return value;
            }
            return new Promise(function (resolve) {
                resolve(value);
            });
        };
        return typeof global.Promise === 'function' ? global.Promise : Promise;
    });
}(typeof define === 'function' && define.amd ? define : function (factory) {
    module.exports = factory(require);
}, this);

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

define('fc-core/Promise', [
    'require',
    'promise'
], function (require) {
    'use strict';
    return require('promise');
});

define('fc-core/EventTarget', [
    'require',
    'mini-event/EventTarget'
], function (require) {
    'use strict';
    return require('mini-event/EventTarget');
});

define('fc-ajax/status', ['require'], function (require) {
    var REQ_STATUS_CODE = {
            INITIALIZE: 0,
            SUCCESS: 200,
            PARTFAIL: 300,
            REDIRECT: 302,
            FAIL: 400,
            SERVER_ERROR: 500,
            PARAMETER_ERROR: 600,
            NOAUTH: 700,
            SERVER_EXCEEDED: 800,
            TIMEOUT: 900,
            CLIENT_SIDE_EXCEPTION: 910,
            REQUEST_ERROR: 920,
            UNRECOGNIZED_STATUS: 930
        };
    var REQ_STATUS_DESC = {
            INITIALIZE: 'ajax-initialize',
            SUCCESS: 'ajax-success',
            PARTFAIL: 'ajax-some-failed',
            REDIRECT: 'ajax-redirect',
            FAIL: 'ajax-fail',
            SERVER_ERROR: 'ajax-server-error',
            PARAMETER_ERROR: 'ajax-parameter-error',
            NOAUTH: 'ajax-noauth',
            SERVER_EXCEEDED: 'ajax-server-exceeded',
            TIMEOUT: 'ajax-timeout',
            CLIENT_SIDE_EXCEPTION: 'ajax-client-side-exception',
            REQUEST_ERROR: 'ajax-request-error',
            UNRECOGNIZED_STATUS: 'ajax-unrecognized-status'
        };
    for (var key in REQ_STATUS_CODE) {
        if (REQ_STATUS_CODE.hasOwnProperty(key)) {
            REQ_STATUS_DESC[REQ_STATUS_CODE[key]] = REQ_STATUS_DESC[key];
        }
    }
    return {
        REQ_CODE: REQ_STATUS_CODE,
        REQ_CODE_DESC: REQ_STATUS_DESC
    };
});

define('fc-ajax/requester', [
    'require',
    'fc-core',
    './hooks',
    './config',
    'fc-core/Promise',
    'mini-event/EventTarget'
], function (require) {
    'use strict';
    var fc = require('fc-core');
    var hooks = require('./hooks');
    var config = require('./config');
    var Promise = require('fc-core/Promise');
    var REQID_PARAM_KEY = '_';
    var proto = {};
    proto.constructor = function () {
        this.config = config;
        this.hooks = hooks;
    };
    proto.request = function (options) {
        var me = this;
        if (typeof me.hooks.beforeExecute === 'function') {
            me.hooks.beforeExecute(options);
        }
        fc.assert.hasProperty(options, 'url', 'url property is required');
        options = fc.util.deepExtend({}, me.config, options);
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new window.ActiveXObject('Microsoft.XMLHTTP');
        var xhrWrapper = {
                setRequestHeader: function (name, value) {
                    xhr.setRequestHeader(name, value);
                },
                getAllResponseHeaders: function () {
                    return xhr.getAllResponseHeaders();
                },
                getResponseHeader: function (name) {
                    return xhr.getResponseHeader(name);
                },
                getRequestOption: function (name) {
                    return options[name];
                }
            };
        var timeoutTic = null;
        var racingPromise = new Promise(function (resolve, reject) {
                xhrWrapper.abort = function () {
                    xhr.onreadystatechange = null;
                    try {
                        xhr.abort();
                    } catch (ex) {
                    }
                    if (!fakeXHR.status) {
                        fakeXHR.status = 0;
                    }
                    fakeXHR.readyState = xhr.readyState;
                    fakeXHR.responseText = '';
                    fakeXHR.responseXML = '';
                    reject(fakeXHR);
                };
                if (options.timeout > 0) {
                    timeoutTic = setTimeout(function () {
                        fakeXHR.status = 408;
                        fakeXHR.abort();
                    }, options.timeout);
                }
            });
        var xhrPromise = new Promise(function (resolve, reject) {
                if (typeof me.hooks.beforeCreate === 'function') {
                    var canceled = me.hooks.beforeCreate(options, resolve, reject);
                    if (canceled === true) {
                        return;
                    }
                }
                xhr.onreadystatechange = function () {
                    p('xhr state change ' + xhr.readyState + ' : ' + url)();
                    if (xhr.readyState === 4) {
                        p('xhr finish: ' + url)();
                        var status = fakeXHR.status || xhr.status;
                        if (status === 1223) {
                            status = 204;
                        }
                        fakeXHR.status = fakeXHR.status || status;
                        fakeXHR.readyState = xhr.readyState;
                        fakeXHR.responseText = xhr.responseText;
                        fakeXHR.responseXML = xhr.responseXML;
                        if (typeof me.hooks.afterReceive === 'function') {
                            me.hooks.afterReceive(fakeXHR, options);
                        }
                        if (status < 200 || status >= 300 && status !== 304) {
                            reject(fakeXHR);
                            return;
                        }
                        var data = xhr.responseText;
                        if (options.dataType === 'json') {
                            try {
                                data = fc.util.parseJSON(data);
                            } catch (ex) {
                                fakeXHR.error = ex;
                                reject(fakeXHR);
                                return;
                            }
                        }
                        if (typeof me.hooks.afterParse === 'function') {
                            try {
                                data = me.hooks.afterParse(data, fakeXHR, options);
                            } catch (ex) {
                                fakeXHR.error = ex;
                                reject(fakeXHR);
                                return;
                            }
                        }
                        resolve(data);
                    }
                };
                var method = options.method.toUpperCase();
                var data = fc.util.deepExtend({}, options.urlParam);
                if (method === 'GET') {
                    fc.util.deepExtend(data, options.data);
                }
                if (options.cache === false) {
                    data[REQID_PARAM_KEY] = fc.util.uid();
                }
                var query = me.hooks.serializeData('', data, 'application/x-www-form-urlencoded');
                var url = options.url;
                if (query) {
                    var delimiter = url.indexOf('?') >= 0 ? '&' : '?';
                    url += delimiter + query;
                }
                xhr.open(method, url, true);
                if (typeof me.hooks.beforeSend === 'function') {
                    me.hooks.beforeSend(xhrWrapper, options);
                }
                p('xhr send' + url)();
                if (method === 'GET') {
                    xhr.send();
                } else {
                    var contentType = options.contentType || 'application/x-www-form-urlencoded';
                    var query = me.hooks.serializeData('', options.data, contentType, xhrWrapper);
                    if (options.charset) {
                        contentType += ';charset=' + options.charset;
                    }
                    xhr.setRequestHeader('Content-Type', contentType);
                    xhr.send(query);
                }
            });
        var fakeXHR = Promise.race([
                xhrPromise,
                racingPromise
            ]);
        fc.util.deepExtend(fakeXHR, xhrWrapper);
        fakeXHR.ensure(function () {
            clearTimeout(timeoutTic);
        });
        return fakeXHR;
    };
    proto.get = function (url, data, cache) {
        var options = {
                method: 'GET',
                url: url,
                data: data,
                cache: cache || this.config.cache
            };
        return this.request(options);
    };
    proto.getJSON = function (url, data, cache) {
        var options = {
                method: 'GET',
                url: url,
                data: data,
                dataType: 'json',
                cache: cache || this.config.cache
            };
        return this.request(options);
    };
    proto.post = function (url, data, dataType) {
        var options = {
                method: 'POST',
                url: url,
                data: data,
                dataType: dataType || 'json'
            };
        return this.request(options);
    };
    var Ajax = fc.oo.derive(require('mini-event/EventTarget'), proto);
    var instance = new Ajax();
    instance.Ajax = Ajax;
    return instance;
});

define('fc-ajax/AjaxRequest', [
    'require',
    'underscore',
    'fc-core',
    'er/ajax',
    'fc-core/Promise',
    'fc-core/EventTarget',
    './hooks',
    './status',
    './requester'
], function (require) {
    var _ = require('underscore');
    var fc = require('fc-core');
    var ajax = require('er/ajax');
    var Promise = require('fc-core/Promise');
    var EventTarget = require('fc-core/EventTarget');
    var hooks = require('./hooks');
    var status = require('./status');
    var proto = {};
    proto.constructor = function (option) {
        fc.assert.has(option);
        var me = this;
        me.option = option;
        me.promise = new Promise(function (resolve, reject) {
            me.resolve = resolve;
            me.reject = reject;
        });
        me.promise.then(_.bind(me.processXhrSuccess, me), _.bind(me.processXhrFailure, me)).catch(_.bind(me.processXhrException, me)).then(_.bind(hooks.eachSuccess, me), _.bind(hooks.eachFailure, me)).ensure(_.bind(hooks.afterEachRequest, me));
    };
    proto.request = function () {
        var me = this;
        hooks.beforeEachRequest.call(me);
        p('AjaxRequest request start')();
        var requesting = require('./requester').request(me.option);
        requesting.then(me.resolve, me.reject);
        return requesting;
    };
    proto.processXhrSuccess = function (result) {
        try {
            if (_.isFunction(hooks.businessCheck)) {
                return hooks.businessCheck(result);
            }
        } catch (e) {
            return Promise.reject({
                status: status.REQ_CODE.CLIENT_SIDE_EXCEPTION,
                error: e,
                response: result
            });
        }
    };
    proto.processXhrFailure = function (result) {
        if (result.status == 408) {
            return Promise.rejected({
                status: status.REQ_CODE.TIMEOUT,
                desc: status.REQ_CODE_DESC.TIMEOUT,
                response: null
            });
        }
        return Promise.reject({
            httpStatus: result.status,
            status: status.REQ_CODE.REQUEST_ERROR,
            desc: status.REQ_CODE_DESC.REQUEST_ERROR,
            response: null
        });
    };
    proto.processXhrException = function (result) {
        if (result && result.error instanceof Error) {
            this.fire('error', result);
            if (result.status) {
                return Promise.reject(result);
            }
        }
        return Promise.reject({
            status: status.REQ_CODE.CLIENT_SIDE_EXCEPTION,
            desc: status.REQ_CODE_DESC.CLIENT_SIDE_EXCEPTION,
            response: result.responseText || result.response
        });
    };
    var AjaxRequest = fc.oo.derive(EventTarget, proto);
    return AjaxRequest;
});

define('fc-ajax/request', [
    'require',
    'underscore',
    'fc-core',
    './hooks',
    './globalData',
    './config',
    './AjaxRequest'
], function (require) {
    var _ = require('underscore');
    var fc = require('fc-core');
    var hooks = require('./hooks');
    var globalData = require('./globalData');
    var config = require('./config');
    var AjaxRequest = require('./AjaxRequest');
    function request(path, data, options) {
        var ajaxOption = adjustOption.apply(this, arguments);
        var req = new AjaxRequest(ajaxOption);
        req.on('error', fc.util.processError);
        return req.request();
    }
    function adjustOption(path, data, options) {
        if (_.isObject(path)) {
            options = data;
            data = path;
            path = data.path;
            delete data.path;
        }
        var ajaxOption = {
                url: config.url,
                urlParam: { path: path }
            };
        _.extend(ajaxOption, options);
        ajaxOption.cache = true;
        var reqId = fc.util.uid();
        ajaxOption.urlParam.reqId = reqId;
        ajaxOption.data = fc.util.deepExtend({}, globalData, { reqId: reqId });
        if (!ajaxOption.data.eventId) {
            ajaxOption.data.eventId = fc.util.guid();
        }
        ajaxOption.data.params = JSON.stringify(data);
        return ajaxOption;
    }
    return request;
});

define('fc-ajax/main', [
    'require',
    './request'
], function (require) {
    'use strict';
    var ajax = {
            version: '0.0.1-alpha.2',
            request: require('./request')
        };
    return ajax;
});

define('fc-ajax', ['fc-ajax/main'], function ( main ) { return main; });

define('main', [
    'require',
    'fc-core',
    'fc-ajax',
    'fc-ajax/AjaxRequest',
    'fc-core/Promise',
    'fc-ajax/config',
    'fc-ajax/globalData',
    'fc-ajax/hooks'
], function (require) {
    var fc = require('fc-core');
    var ajax = require('fc-ajax');
    var AjaxRequest = require('fc-ajax/AjaxRequest');
    var Promise = require('fc-core/Promise');
    window.p = function (msg, isStart) {
        isStart = !!isStart;
        return function () {
            counter.dump(msg, isStart);
        };
    };
    require('fc-ajax/config').url = 'request.ajax';
    var counter = {
            time: null,
            startTime: null,
            start: function () {
                counter.startTime = counter.time = new Date();
            },
            dump: function (msg, isStart) {
                if (isStart) {
                    counter.start();
                } else {
                    var now = new Date();
                    var diff = now - counter.time;
                    counter.time = now;
                }
                console.log(msg, performance.now());
            }
        };
    require('fc-ajax/globalData').userid = 666666;
    var ajaxHooks = require('fc-ajax/hooks');
    ajaxHooks.beforeEachRequest = p('request start', true);
    ajaxHooks.afterEachRequest = p('request finish');
    ajaxHooks.eachSuccess = p('succ');
    ajaxHooks.eachFailure = p('fail');
    var noop = function () {
    };
    ajax.request('GET/basicInfo').then(function () {
        return ajax.request('vega/GET/material', {
            'level': 'useracct',
            'fields': [
                'wregion',
                'bgttype',
                'wbudget',
                'weekbudget',
                'userstat',
                'qrstat1'
            ]
        });
    }, noop).then(function (response) {
        p('recieved material')();
        return ajax.request('vega/GET/mtl/planlist', {
            'fields': [
                'planid',
                'pausestat',
                'planname',
                'shows',
                'clks',
                'paysum',
                'trans',
                'avgprice',
                'plandynamicideastat',
                'acctdynamicideastat',
                'mPriceFactor',
                'planstat',
                'remarketingstat',
                'deviceprefer',
                'wregion',
                'qrstat1',
                'phonetrans',
                'allipblackcnt',
                'clkrate',
                'wbudget',
                'plancyc',
                'showprob',
                'allnegativecnt',
                'showpay'
            ],
            'startTime': '2014-11-20',
            'endTime': '2014-11-20',
            'levelCond': { 'userid': 630152 },
            'pageSize': 50,
            'pageNo': 1
        });
    }, noop).then(function (response) {
        p('recieved planlist')();
        var html = [
                '<table>',
                '<!-- for: ${listData} as ${item} -->',
                '<tr>',
                '<td>${item.planname}</td>',
                '</tr>',
                '<!-- /for -->',
                '</table>'
            ].join('\n');
        var render = fc.tpl.compile(html);
        var htmlcode = render(response.data);
        document.getElementById('main').innerHTML = htmlcode;
    }, noop);
});