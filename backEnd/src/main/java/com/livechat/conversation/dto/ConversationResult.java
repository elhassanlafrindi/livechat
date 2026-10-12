package com.livechat.conversation.dto;

public record ConversationResult(
        ConversationResponse conversation,
        boolean created
) {
}
