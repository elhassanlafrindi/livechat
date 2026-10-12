package com.livechat.chat;

import com.livechat.chat.dto.ChatMessage;
import com.livechat.chat.dto.NotificationDto;
import com.livechat.common.exception.ResourceNotFoundException;
import com.livechat.conversation.Conversation;
import com.livechat.conversation.ConversationRepository;
import com.livechat.conversation.dto.ConversationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ConversationRepository conversationRepository;

    /**
     * Broadcasts a notification when a new conversation is started.
     */
    public void notifyNewConversation(ConversationResponse conversation) {
        NotificationDto notification = new NotificationDto(
                "NEW_CONVERSATION",
                conversation.siteId(),
                conversation.id(),
                conversation.visitorId(),
                null,
                conversation.createdAt() != null ? conversation.createdAt() : LocalDateTime.now()
        );
        messagingTemplate.convertAndSend("/topic/site/" + conversation.siteId() + "/notifications", notification);
    }

    /**
     * Broadcasts a notification when a new message is received in a conversation.
     */
    @Transactional(readOnly = true)
    public void notifyNewMessage(ChatMessage message) {
        Conversation conversation = conversationRepository.findById(message.conversationId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + message.conversationId()));

        Long siteId = conversation.getSite().getId();
        String content = message.content();
        String preview = (content != null && content.length() > 50) ? content.substring(0, 50) : content;

        NotificationDto notification = new NotificationDto(
                "NEW_MESSAGE",
                siteId,
                conversation.getId(),
                conversation.getVisitorId(),
                preview,
                message.createdAt() != null ? message.createdAt() : LocalDateTime.now()
        );
        messagingTemplate.convertAndSend("/topic/site/" + siteId + "/notifications", notification);
    }
}
