package com.livechat.conversation.dto;

import com.livechat.conversation.Conversation;
import com.livechat.conversation.ConversationStatus;

import java.time.LocalDateTime;

public record ConversationResponse(
        Long id,
        Long siteId,
        String visitorId,
        ConversationStatus status,
        LocalDateTime createdAt,
        LocalDateTime lastMessageAt
) {
    public static ConversationResponse from(Conversation c) {
        return new ConversationResponse(
                c.getId(),
                c.getSite() != null ? c.getSite().getId() : null,
                c.getVisitorId(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getLastMessageAt()
        );
    }
}
