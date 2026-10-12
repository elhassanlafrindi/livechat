package com.livechat.conversation;

import com.livechat.common.exception.BadRequestException;
import com.livechat.common.exception.ResourceNotFoundException;
import com.livechat.conversation.dto.ConversationResponse;
import com.livechat.conversation.dto.ConversationResult;
import com.livechat.site.Site;
import com.livechat.site.SiteRepository;
import com.livechat.site.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final SiteRepository siteRepository;
    private final SiteService siteService;

    /**
     * Starts a new conversation or resumes an existing one for the specified site and visitor.
     */
    @Transactional
    public ConversationResult startOrResume(String siteKey, String visitorId) {
        if (siteKey == null || siteKey.isBlank()) {
            throw new BadRequestException("Site key must not be blank");
        }
        if (visitorId == null || visitorId.isBlank()) {
            throw new BadRequestException("Visitor ID must not be blank");
        }

        Site site = siteService.getBySiteKey(siteKey.trim());
        String normalizedVisitorId = visitorId.trim();

        return conversationRepository.findBySiteIdAndVisitorId(site.getId(), normalizedVisitorId)
                .map(existing -> new ConversationResult(ConversationResponse.from(existing), false))
                .orElseGet(() -> {
                    Conversation newConversation = Conversation.builder()
                            .site(site)
                            .visitorId(normalizedVisitorId)
                            .status(ConversationStatus.OPEN)
                            .build();
                    Conversation saved = conversationRepository.save(newConversation);
                    return new ConversationResult(ConversationResponse.from(saved), true);
                });
    }

    /**
     * Lists all conversations for a site owned by the specified owner, ordered by most recent message.
     */
    @Transactional(readOnly = true)
    public List<ConversationResponse> listBySite(Long siteId, Long ownerId) {
        siteRepository.findByIdAndOwnerId(siteId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Site not found with id: " + siteId + " for owner: " + ownerId));

        return conversationRepository.findBySiteIdOrderByLastMessageAtDesc(siteId)
                .stream()
                .map(ConversationResponse::from)
                .toList();
    }

    /**
     * Retrieves a conversation entity by its ID and owner ID for internal use.
     */
    @Transactional(readOnly = true)
    public Conversation getByIdForOwner(Long conversationId, Long ownerId) {
        return conversationRepository.findByIdAndSiteOwnerId(conversationId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Conversation not found with id: " + conversationId + " for owner: " + ownerId));
    }

    /**
     * Retrieves a conversation entity by its ID and visitor ID for public widget use.
     */
    @Transactional(readOnly = true)
    public Conversation getByIdAndVisitorId(Long conversationId, String visitorId) {
        return conversationRepository.findByIdAndVisitorId(conversationId, visitorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Conversation not found with id: " + conversationId + " for visitor: " + visitorId));
    }
}
