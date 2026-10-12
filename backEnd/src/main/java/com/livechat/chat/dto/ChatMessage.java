package com.livechat.chat.dto;

import com.livechat.message.Message;
import com.livechat.message.SenderType;

import java.time.LocalDateTime;

public record ChatMessage(
        Long conversationId,
        SenderType senderType,
        String content,
        LocalDateTime createdAt
) {
    public static ChatMessage from(Message m) {
        return new ChatMessage(
                m.getConversation() != null ? m.getConversation().getId() : null,
                m.getSenderType(),
                m.getContent(),
                m.getCreatedAt()
        );
    }
}
