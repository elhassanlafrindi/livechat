package com.livechat.conversation.dto;

public record StartConversationRequest(
        String siteKey,
        String visitorId
) {
}
