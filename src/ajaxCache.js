/**
 * @file ajax缓存模块
 * 针对部分对实时性不高的请求结构，可以采取调用上次请求的缓存结果
 * 每个请求接口返回值在localStorage/memory中的存储格式
 *     CACHE_KEY : {
 *         // 是否开启缓存
 *         isCacheOn: true,
 *         // 过期时间，单位是毫秒
 *         expiredTime: 1447640681911,
 *         // 缓存的Promise数据
 *         promiseData: {},
 *         // 参数
 *         params: '{}'
 *     }
 *
 *      使用方法：在extraOpts对象中添加两个字段
 *      {
 *          isCacheOn: false, // 是否开启缓存,默认关闭
            expiredHours: 3 // 单元是小时
 *      }
 *
 *      CACHE_KEY的构成： CACHE_KEY + options.data.path + '-' + options.data.params;
 * @author Ming Liu(liuming07@baidu.com)
 */

define(function (require) {
    'use strict';

    var _ = require('underscore');
    var fc = require('fc-core');
    var Promise = require('fc-core/Promise');
    var localStorage = require('fc-storage/localStorage');
    var memory = require('fc-storage/memory');

    var CACHE_KEY = 'ajaxCache-';

    /**
     * 默认的缓存时间 1小时
     *
     * @type {number}
     */
    var DEFAULT_TIME = (new Date()).getTime() + 1 * 60 * 60 * 1000;

    /**
     * @type {Object}
     */
    var proto = {

        /**
         * 存储环境
         * @type {Object}
         */
        context: localStorage,

        /**
         * 获取缓存结果
         *
         * @param {Object} options 缓存的options对象描述
         * @return {?Promise}
         */
        getCache: function (options) {
            var cacheKey = CACHE_KEY + options.data.path + '-' + options.data.params;
            var data = JSON.parse(this.context.getItem(cacheKey)).promiseData;

            return Promise.resolve(data);
        },

        /**
         * 将本次请求结构设置到缓存池中
         *
         * @param {Object} options 缓存的options对象描述
         * @param {Object} Object 请求返回的
         * @return {boolean} 是否成功设置
         */
        setCache: function (options, promiseData) {
            var cacheKey = CACHE_KEY + options.data.path + '-' + options.data.params;
            var expiredHours = +options.expiredHours;
            var expiredTime = 0;

            // 如果设置为0或则负数，则不设置缓存
            if (expiredHours <= 0) {
                return false;
            }
            else {
                expiredTime = (new Date()).getTime() + expiredHours * 60 * 60 * 1000;
            }

            var cacheData = {
                isCacheOn: true,
                promiseData: promiseData,
                expiredTime: expiredTime,
                params: options.data.params
            };

            if (options.data.params === '{}') {
                // 溢出检测
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    return true;
                }
                catch (oException) {
                    if (oException.name == 'QuotaExceededError') {
                        console.warn('已经超出本地存储限定大小！');
                        // 清除该key的缓存
                        localStorage.removeItem('cacheKey');
                        return false;
                    }
                }
            }
            else {
                memory.setItem(cacheKey, JSON.stringify(cacheData));
            }
        },

        /**
         * 是否已经存在缓存池中
         *
         * @param {Object} options 缓存的options对象描述
         * @return {boolean}
         */
        hasCache: function (options) {
           var cacheKey = CACHE_KEY + options.data.path + '-' + options.data.params;

           // 设置当前所处的存储环境
           if(options.data.params === '{}') {
                this.context = localStorage;
           }
           else {
                this.context = memory;
           }
           return !!this.context.getItem(cacheKey);
        },

        /**
         * 判断缓存是否有效
         *
         * @param {Object} options 缓存的options对象描述
         * @return {boolean}
         */
        isCacheValid: function (options) {
            var cacheKey = CACHE_KEY + options.data.path + '-' + options.data.params;
            var cacheData = JSON.parse(this.context.getItem(cacheKey));
            var expiredTime = +cacheData.expiredTime;
            var now = (new Date()).getTime();

            return now < expiredTime;
        },

        /**
         * 清除缓存
         *
         * @param {Object} options 缓存的options对象描述
         */
        clearCache: function (options) {
           var cacheKey = CACHE_KEY + options.data.path + '-' + options.data.params;

           localStorage.removeItem(cacheKey);
        },

        /**
         * 清理已经过期的存储，在进入系统时调用
         */
        clearExpiredItems: function () {
            var len = localStorage.length;
            var now = (new Date()).getTime();

            for (var i = 0; i < len; i++) {
                if (localStorage.key(i).indexOf(CACHE_KEY) > -1) {
                    var cacheData = JSON.parse(localStorage.getItem(cacheKey));
                    var expiredTime = +cacheData.expiredTime;
                    if (now > expiredTime) {
                        localStorage.removeItem(cacheKey);
                    }
                }
            }
        },

        /**
         * 进入系统时清理已经过期的localStorage
         */
        init: function () {
            this.clearExpiredItems();
        }
    };

    var AjaxCache = fc.oo.derive(require('fc-core/EventTarget'), proto);
    var instance = new AjaxCache();

    return instance;
});
