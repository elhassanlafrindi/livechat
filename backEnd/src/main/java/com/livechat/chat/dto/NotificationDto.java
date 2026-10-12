package com.livechat.chat.dto;

import java.time.LocalDateTime;

public record NotificationDto(
        String type,
        Long siteId,
        Long conversationId,
        String visitorId,
        String preview,
        LocalDateTime createdAt
) {
}
