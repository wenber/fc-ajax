/**
 * @ignore
 * @file FC基础层 入口模块
 *
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {
    'use strict';

    /**
     * FC 基础层 入口模块
     * @module fc
     */
    var fc = {
        version: '0.0.1.alpha.2',

        /**
         * 浏览器信息
         * @type {Object}
         */
        browser: require('./browser'),

        /**
         * aop相关的方法集
         * @type {Object}
         */
        aop: require('./aop'),

        /**
         * 断言相关的方法集
         * @type {Object}
         */
        assert: require('./assert'),

        /**
         * OO相关的方法集，类的创建 & 继承
         * @type {Object}
         */
        oo: require('./oo'),

        /**
         * TPL相关的方法集，当前直接使用etpl
         * @type {Object}
         */
        tpl: require('etpl'),

        /**
         * 自定义事件类
         * @type {Class}
         */
        EventTarget: require('mini-event/EventTarget'),

        /**
         * 扩展的工具方法集
         * @type {Object}
         */
        util: require('./util')
    };

    return fc;
});
