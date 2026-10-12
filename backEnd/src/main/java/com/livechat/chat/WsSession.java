package com.livechat.chat;

public final class WsSession {

    private WsSession() {
    }

    public static final String TYPE = "type";
    public static final String USER_ID = "userId";
    public static final String SITE_ID = "siteId";
    public static final String VISITOR_ID = "visitorId";

    public static final String TYPE_OWNER = "OWNER";
    public static final String TYPE_VISITOR = "VISITOR";
}
