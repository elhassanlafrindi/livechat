package com.livechat.conversation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findBySiteIdAndVisitorId(Long siteId, String visitorId);

    List<Conversation> findBySiteIdOrderByLastMessageAtDesc(Long siteId);

    Optional<Conversation> findByIdAndSiteOwnerId(Long id, Long ownerId);

    Optional<Conversation> findByIdAndVisitorId(Long id, String visitorId);

    boolean existsByIdAndSiteOwnerId(Long id, Long ownerId);

    boolean existsByIdAndVisitorIdAndSiteId(Long id, String visitorId, Long siteId);
}
