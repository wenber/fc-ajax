/**
 * @file ajaxSession,用于串联一组完成的ajax会话
 * @author Ming Liu(liuming07@baidu.com)
 */

define(function (require) {
    var fc = require('fc-core');
    /**
     * ajaxSession 全局ajaxSession对象
     * 每一个键值对标识一个会话流
     * @type {Object}
     * example:
     * {
     *     sessionId: eventId,
     *     sessionId: eventId,
     *     sessionId: eventId
     * }
     */
    var ajaxSession = ajaxSession || {};

    return {
        session: ajaxSession,
        createSessionId: fc.util.guid,
        actionEventId: ''
    };
});
