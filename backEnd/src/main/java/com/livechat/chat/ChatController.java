package com.livechat.chat;

import com.livechat.chat.dto.ChatMessage;
import com.livechat.chat.dto.SendMessageRequest;
import com.livechat.common.exception.BadRequestException;
import com.livechat.message.MessageService;
import com.livechat.message.SenderType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final MessageService messageService;
    private final NotificationService notificationService;

    /**
     * Receives a chat message, derives the sender type from session attributes, saves it, notifies owner if from visitor, and broadcasts to subscribers.
     */
    @MessageMapping("/chat/{conversationId}")
    @SendTo("/topic/chat/{conversationId}")
    public ChatMessage send(
            @DestinationVariable Long conversationId,
            @Payload SendMessageRequest request,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        if (request == null || request.content() == null) {
            throw new BadRequestException("Content must not be null");
        }

        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        String type = sessionAttributes != null ? (String) sessionAttributes.get(WsSession.TYPE) : null;

        SenderType derivedSenderType;
        if (WsSession.TYPE_OWNER.equals(type)) {
            derivedSenderType = SenderType.OWNER;
        } else if (WsSession.TYPE_VISITOR.equals(type)) {
            derivedSenderType = SenderType.VISITOR;
        } else {
            throw new BadRequestException("Unknown or missing sender type in session");
        }

        ChatMessage saved = messageService.saveMessage(conversationId, derivedSenderType, request.content());

        if (derivedSenderType == SenderType.VISITOR) {
            notificationService.notifyNewMessage(saved);
        }

        return saved;
    }

    @MessageExceptionHandler
    public void handleException(Exception e) {
        log.warn("Error processing chat message: {}", e.getMessage(), e);
    }
}
