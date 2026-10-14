package com.livechat.chat;

import com.livechat.chat.dto.ChatMessage;
import com.livechat.conversation.ConversationService;
import com.livechat.conversation.dto.ConversationResponse;
import com.livechat.conversation.dto.ConversationResult;
import com.livechat.conversation.dto.StartConversationRequest;
import com.livechat.message.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/widget")
@RequiredArgsConstructor
public class WidgetController {

    private final ConversationService conversationService;
    private final NotificationService notificationService;
    private final MessageService messageService;

    @PostMapping("/conversations")
    public ConversationResponse startConversation(@RequestBody StartConversationRequest request) {
        ConversationResult result = conversationService.startOrResume(request.siteKey(), request.visitorId());
        if (result.created()) {
            notificationService.notifyNewConversation(result.conversation());
        }
        return result.conversation();
    }

    @GetMapping("/conversations/{id}/messages")
    public List<ChatMessage> getMessages(@PathVariable Long id, @RequestParam String visitorId,
                                        @RequestParam String siteKey) {
        conversationService.getByIdAndVisitorIdAndSiteKey(id, visitorId, siteKey);
        return messageService.getHistory(id);
    }
}
