/**
 * @file [please input description]
 *
 * @author wangkemiao(wangkemiao@baidu.com)
 */

define(function (require) {
    var fc = require('fc-core');
    var ajax = require('fc-ajax');
    var AjaxRequest = require('fc-ajax/AjaxRequest');
    var Promise = require('fc-core/Promise');

    window.p = function (msg, isStart) {
        isStart = !!isStart;
        return function (res) {
            var toShow = msg;
            if (this.option) {
                toShow = '[' + this.option.data.path + '] ' + toShow;
            }
            counter.dump(toShow, isStart);
        }
    }

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
                // console.log(msg, counter.startTime, 0);
            }
            else {
                var now = new Date();
                var diff = now - counter.time;
                counter.time = now;
                // console.log(msg, now - counter.startTime, diff);
            }
            console.log(msg, performance.now());
        }
    };

    require('fc-ajax/globalData').userid = 666666;

    var ajaxHooks = require('fc-ajax/hooks');

    function pp (msg) {
        return function () {
            p(msg);
            console.log(this.option)
        };
    }

    ajaxHooks.beforeEachRequest = p('hook.beforeEachRequest', true);
    ajaxHooks.afterEachRequest = p('hook.afterEachRequest');
    ajaxHooks.eachSuccess = p('hook.eachSuccess');
    ajaxHooks.eachFailure = p('hook.eachFailure');

    ajaxHooks.businessCheck = function (response) {
        if (typeof response === 'object') {
            // if (this.option.data.path === 'GET/basicInfo') {
            //     return response;
            // }
            if (response.status === 200) {
                return response
            }
        }

        throw new Error('response data has sth error');
    };

    var noop = function (res) { console.error('fail biz handler', res); return Promise.reject(); };

    var requesting = ajax.request('GET/basicInfo');
        requesting.then(
            function (response) {
                p('recieved basicInfo && biz processing')();
                console.log(response);
            },
            noop
        )
        .then(
            function () {
                return ajax.request('vega/GET/material', {
                    "level":"useracct","fields":["wregion","bgttype","wbudget","weekbudget","userstat","qrstat1"]
                });
            },
            noop
        )
        .then(
            function (response) {
                p('recieved material && biz processing')();
                console.log(response);
                return ajax.request('vega/GET/mtl/planlist', {
                    "fields":["planid","pausestat","planname","shows","clks","paysum","trans","avgprice","plandynamicideastat","acctdynamicideastat","mPriceFactor","planstat","remarketingstat","deviceprefer","wregion","qrstat1","phonetrans","allipblackcnt","clkrate","wbudget","plancyc","showprob","allnegativecnt","showpay"],"startTime":"2014-11-20","endTime":"2014-11-20","levelCond":{"userid":630152},"pageSize":50,"pageNo":1
                });
            },
            noop
        )
        .then(
            function (response) {
                p('recieved planlist && biz processing')();
                console.log(response);
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
            },
            noop
        );
});
