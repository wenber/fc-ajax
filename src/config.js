/**
 * @file ajax的全局配置
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

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
