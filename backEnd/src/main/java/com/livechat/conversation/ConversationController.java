package com.livechat.conversation;

import com.livechat.auth.CurrentUser;
import com.livechat.chat.dto.ChatMessage;
import com.livechat.conversation.dto.ConversationResponse;
import com.livechat.message.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<ConversationResponse> listBySite(@RequestParam Long siteId) {
        return conversationService.listBySite(siteId, currentUser.getId());
    }

    @GetMapping("/{id}/messages")
    public List<ChatMessage> getMessages(@PathVariable Long id) {
        conversationService.getByIdForOwner(id, currentUser.getId());
        return messageService.getHistory(id);
    }
}
