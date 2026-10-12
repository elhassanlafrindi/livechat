package com.livechat.chat;

import com.livechat.auth.JwtService;
import com.livechat.conversation.ConversationRepository;
import com.livechat.site.Site;
import com.livechat.site.SiteRepository;
import com.livechat.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern CHAT_TOPIC_PATTERN = Pattern.compile("^/topic/chat/(\\d+)$");
    private static final Pattern NOTIFICATION_TOPIC_PATTERN = Pattern.compile("^/topic/site/(\\d+)/notifications$");
    private static final Pattern APP_CHAT_PATTERN = Pattern.compile("^/app/chat/(\\d+)$");

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final SiteRepository siteRepository;
    private final ConversationRepository conversationRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            accessor = StompHeaderAccessor.wrap(message);
        }

        StompCommand command = accessor.getCommand();
        if (command == null) {
            return message;
        }

        switch (command) {
            case CONNECT -> handleConnect(accessor);
            case SUBSCRIBE -> handleSubscribe(accessor);
            case SEND -> handleSend(accessor);
            default -> {
            }
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (!jwtService.isValid(token)) {
                log.warn("CONNECT rejected: invalid token");
                throw new MessageDeliveryException("Unauthorized: invalid token");
            }

            Long userId;
            try {
                userId = jwtService.extractUserId(token);
            } catch (Exception e) {
                log.warn("CONNECT rejected: error extracting userId from token");
                throw new MessageDeliveryException("Unauthorized: invalid token");
            }

            if (!userRepository.existsById(userId)) {
                log.warn("CONNECT rejected: user id {} not found", userId);
                throw new MessageDeliveryException("Unauthorized: user not found");
            }

            Map<String, Object> sessionAttributes = getOrCreateSessionAttributes(accessor);
            sessionAttributes.put(WsSession.TYPE, WsSession.TYPE_OWNER);
            sessionAttributes.put(WsSession.USER_ID, userId);
        } else {
            String siteKey = accessor.getFirstNativeHeader("siteKey");
            String visitorId = accessor.getFirstNativeHeader("visitorId");

            if (siteKey != null && !siteKey.isBlank() && visitorId != null && !visitorId.isBlank()) {
                Optional<Site> siteOpt = siteRepository.findBySiteKey(siteKey.trim());
                if (siteOpt.isEmpty()) {
                    log.warn("CONNECT rejected: site not found for siteKey");
                    throw new MessageDeliveryException("Unauthorized: site not found");
                }

                Map<String, Object> sessionAttributes = getOrCreateSessionAttributes(accessor);
                sessionAttributes.put(WsSession.TYPE, WsSession.TYPE_VISITOR);
                sessionAttributes.put(WsSession.SITE_ID, siteOpt.get().getId());
                sessionAttributes.put(WsSession.VISITOR_ID, visitorId.trim());
            } else {
                log.warn("CONNECT rejected: missing authentication credentials");
                throw new MessageDeliveryException("Unauthorized: credentials required");
            }
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        String type = sessionAttributes != null ? (String) sessionAttributes.get(WsSession.TYPE) : null;
        if (type == null) {
            log.warn("SUBSCRIBE rejected: unauthenticated session");
            throw new MessageDeliveryException("Unauthorized: session not authenticated");
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            log.warn("SUBSCRIBE rejected: destination missing");
            throw new MessageDeliveryException("Bad Request: destination missing");
        }

        Matcher chatMatcher = CHAT_TOPIC_PATTERN.matcher(destination);
        if (chatMatcher.matches()) {
            Long conversationId = Long.parseLong(chatMatcher.group(1));
            validateConversationAccess(conversationId, type, sessionAttributes, destination, "SUBSCRIBE");
            return;
        }

        Matcher notifMatcher = NOTIFICATION_TOPIC_PATTERN.matcher(destination);
        if (notifMatcher.matches()) {
            if (!WsSession.TYPE_OWNER.equals(type)) {
                log.warn("SUBSCRIBE rejected: destination={}, visitors cannot subscribe to notifications", destination);
                throw new MessageDeliveryException("Forbidden: notifications available to owner only");
            }

            Long siteId = Long.parseLong(notifMatcher.group(1));
            Long userId = (Long) sessionAttributes.get(WsSession.USER_ID);
            if (userId == null || !siteRepository.existsByIdAndOwnerId(siteId, userId)) {
                log.warn("SUBSCRIBE rejected: destination={}, owner does not own site", destination);
                throw new MessageDeliveryException("Forbidden: site not owned");
            }
            return;
        }

        log.warn("SUBSCRIBE rejected: unsupported or forbidden destination {}", destination);
        throw new MessageDeliveryException("Forbidden destination");
    }

    private void handleSend(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        String type = sessionAttributes != null ? (String) sessionAttributes.get(WsSession.TYPE) : null;
        if (type == null) {
            log.warn("SEND rejected: unauthenticated session");
            throw new MessageDeliveryException("Unauthorized: session not authenticated");
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            log.warn("SEND rejected: destination missing");
            throw new MessageDeliveryException("Bad Request: destination missing");
        }

        Matcher appMatcher = APP_CHAT_PATTERN.matcher(destination);
        if (!appMatcher.matches()) {
            log.warn("SEND rejected: forbidden destination {}", destination);
            throw new MessageDeliveryException("Forbidden destination");
        }

        Long conversationId = Long.parseLong(appMatcher.group(1));
        validateConversationAccess(conversationId, type, sessionAttributes, destination, "SEND");
    }

    private void validateConversationAccess(
            Long conversationId,
            String type,
            Map<String, Object> sessionAttributes,
            String destination,
            String action
    ) {
        if (WsSession.TYPE_OWNER.equals(type)) {
            Long userId = (Long) sessionAttributes.get(WsSession.USER_ID);
            if (userId == null || !conversationRepository.existsByIdAndSiteOwnerId(conversationId, userId)) {
                log.warn("{} rejected: destination={}, owner does not own conversation", action, destination);
                throw new MessageDeliveryException("Forbidden: conversation not owned");
            }
        } else if (WsSession.TYPE_VISITOR.equals(type)) {
            String visitorId = (String) sessionAttributes.get(WsSession.VISITOR_ID);
            Long siteId = (Long) sessionAttributes.get(WsSession.SITE_ID);
            if (visitorId == null || siteId == null
                    || !conversationRepository.existsByIdAndVisitorIdAndSiteId(conversationId, visitorId, siteId)) {
                log.warn("{} rejected: destination={}, visitor does not belong to conversation", action, destination);
                throw new MessageDeliveryException("Forbidden: conversation not owned");
            }
        } else {
            log.warn("{} rejected: destination={}, unknown session type", action, destination);
            throw new MessageDeliveryException("Forbidden: unknown session type");
        }
    }

    private Map<String, Object> getOrCreateSessionAttributes(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            sessionAttributes = new HashMap<>();
            accessor.setSessionAttributes(sessionAttributes);
        }
        return sessionAttributes;
    }
}
