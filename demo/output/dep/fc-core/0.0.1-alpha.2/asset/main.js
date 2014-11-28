define([
    'require',
    './browser',
    './aop',
    './assert',
    './oo',
    'etpl',
    'mini-event/EventTarget',
    './util'
], function (require) {
    'use strict';
    var fc = {
            version: '0.0.1.alpha.2',
            browser: require('./browser'),
            aop: require('./aop'),
            assert: require('./assert'),
            oo: require('./oo'),
            tpl: require('etpl'),
            EventTarget: require('mini-event/EventTarget'),
            util: require('./util')
        };
    return fc;
});