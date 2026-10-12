package com.livechat.message;

import com.livechat.chat.dto.ChatMessage;
import com.livechat.common.exception.BadRequestException;
import com.livechat.common.exception.ResourceNotFoundException;
import com.livechat.conversation.Conversation;
import com.livechat.conversation.ConversationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;

    /**
     * Saves a message in a conversation and updates the conversation's last message timestamp.
     */
    @Transactional
    public ChatMessage saveMessage(Long conversationId, SenderType senderType, String content) {
        if (content == null || content.isBlank()) {
            throw new BadRequestException("Message content must not be blank");
        }

        String trimmedContent = content.trim();
        if (trimmedContent.length() > 2000) {
            throw new BadRequestException("Message content must not exceed 2000 characters");
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        Message message = Message.builder()
                .conversation(conversation)
                .senderType(senderType)
                .content(trimmedContent)
                .build();

        Message savedMessage = messageRepository.save(message);

        LocalDateTime messageCreatedAt = savedMessage.getCreatedAt() != null ? savedMessage.getCreatedAt() : LocalDateTime.now();
        conversation.setLastMessageAt(messageCreatedAt);
        conversationRepository.save(conversation);

        return ChatMessage.from(savedMessage);
    }

    /**
     * Retrieves the message history for a conversation ordered by creation time ascending.
     */
    @Transactional(readOnly = true)
    public List<ChatMessage> getHistory(Long conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(ChatMessage::from)
                .toList();
    }
}
