/**
 * @file [please input description]
 *
 * @author wangkemiao(wangkemiao@baidu.com)
 */

define(function (require) {
    var fc = require('fc');
    var flag = require('fc/flag');

    // 配置默认系统配置，必须在start之前
    var erConf = require('fc/context/config/er');
    erConf.indexURL = '/';
    erConf.systemName = '百度推广';
    require('fc/context/config/ajax').redirectUrl = 'main.do';
    require('fc/context/config/monitor').monitorUrl = flag.get('LOGGING_PATH');

    // 配置系统的er Action的定义配置
    fc.setActionConf(require('./actionConf'));

    // 环境开始
    fc.start().done(function () {
        // 业务处理GO
    });
});