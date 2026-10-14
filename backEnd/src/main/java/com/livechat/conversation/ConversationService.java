package com.livechat.conversation;

import com.livechat.common.exception.BadRequestException;
import com.livechat.common.exception.ResourceNotFoundException;
import com.livechat.conversation.dto.ConversationResponse;
import com.livechat.conversation.dto.ConversationResult;
import com.livechat.site.Site;
import com.livechat.site.SiteRepository;
import com.livechat.site.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final SiteRepository siteRepository;
    private final SiteService siteService;
    private final PlatformTransactionManager transactionManager;

    /**
     * Starts a new conversation or resumes an existing one for the specified site and visitor.
     */
    public ConversationResult startOrResume(String siteKey, String visitorId) {
        if (visitorId == null || visitorId.isBlank()) {
            throw new BadRequestException("Visitor ID must not be blank");
        }

        String normalizedVisitorId = visitorId.trim();
        if (normalizedVisitorId.length() > 64) {
            throw new BadRequestException("Visitor ID must not exceed 64 characters");
        }
        Site site = siteService.getBySiteKey(siteKey);

        return conversationRepository.findBySiteIdAndVisitorId(site.getId(), normalizedVisitorId)
                .map(existing -> new ConversationResult(ConversationResponse.from(existing), false))
                .orElseGet(() -> {
                    TransactionTemplate creationTransaction = new TransactionTemplate(transactionManager);
                    creationTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                    try {
                        return creationTransaction.execute(status -> {
                            Conversation newConversation = Conversation.builder()
                                    .site(site)
                                    .visitorId(normalizedVisitorId)
                                    .status(ConversationStatus.OPEN)
                                    .build();
                            Conversation saved = conversationRepository.saveAndFlush(newConversation);
                            return new ConversationResult(ConversationResponse.from(saved), true);
                        });
                    } catch (DataIntegrityViolationException exception) {
                        // The failed insert has rolled back; reload the concurrently created conversation.
                        return conversationRepository.findBySiteIdAndVisitorId(site.getId(), normalizedVisitorId)
                                .map(existing -> new ConversationResult(ConversationResponse.from(existing), false))
                                .orElseThrow(() -> exception);
                    }
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
     * Retrieves a conversation entity by its ID, visitor ID and site key for public widget use.
     */
    @Transactional(readOnly = true)
    public Conversation getByIdAndVisitorIdAndSiteKey(Long conversationId, String visitorId, String siteKey) {
        if (visitorId == null || siteKey == null) {
            throw new ResourceNotFoundException("Conversation not found");
        }
        String normalizedVisitorId = visitorId.trim();
        String normalizedSiteKey = siteKey.trim();
        if (normalizedVisitorId.length() > 64) {
            throw new BadRequestException("Visitor ID must not exceed 64 characters");
        }
        if (normalizedSiteKey.length() > 64) {
            throw new BadRequestException("Site key must not exceed 64 characters");
        }
        return conversationRepository.findByIdAndVisitorIdAndSiteSiteKey(
                        conversationId, normalizedVisitorId, normalizedSiteKey)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
    }
}
