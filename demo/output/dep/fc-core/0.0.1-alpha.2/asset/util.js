define([
    'require',
    'underscore',
    './assert',
    'mini-event/Event',
    'etpl'
], function (require) {
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
        assert.equals($.isPlainObject(data), true, '\u4F20\u5165\u7684data\u5FC5\u987B\u4E3A\u4E00\u4E2A\u6709\u6548\u7684Object Map\u683C\u5F0F');
        return { data: data };
    };
    return util;
});