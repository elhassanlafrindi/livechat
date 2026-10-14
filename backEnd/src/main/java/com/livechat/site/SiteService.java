package com.livechat.site;

import com.livechat.common.exception.BadRequestException;
import com.livechat.common.exception.ResourceNotFoundException;
import com.livechat.site.dto.SiteResponse;
import com.livechat.user.User;
import com.livechat.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class SiteService {

    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern HOSTNAME_PATTERN = Pattern.compile(
            "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*");

    private final SiteRepository siteRepository;
    private final UserRepository userRepository;

    /**
     * Creates a new site for an owner and generates a unique site key.
     */
    @Transactional
    public SiteResponse createSite(Long ownerId, String name, String allowedDomain) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Site name must not be blank");
        }
        String normalizedName = name.trim();
        if (normalizedName.length() > 100) {
            throw new BadRequestException("Site name must not exceed 100 characters");
        }
        String normalizedDomain = allowedDomain == null ? null : allowedDomain.trim().toLowerCase(Locale.ROOT);
        if (normalizedDomain != null) {
            if (normalizedDomain.length() > 253) {
                throw new BadRequestException("Allowed domain must not exceed 253 characters");
            }
            if (!HOSTNAME_PATTERN.matcher(normalizedDomain).matches()) {
                throw new BadRequestException("Allowed domain must be a bare hostname");
            }
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + ownerId));

        String siteKey = generateSiteKey();
        Site site = Site.builder()
                .name(normalizedName)
                .siteKey(siteKey)
                .allowedDomain(normalizedDomain)
                .owner(owner)
                .build();

        Site savedSite = siteRepository.save(site);
        return SiteResponse.from(savedSite);
    }

    /**
     * Lists all sites owned by the specified owner.
     */
    @Transactional(readOnly = true)
    public List<SiteResponse> listByOwner(Long ownerId) {
        return siteRepository.findByOwnerId(ownerId)
                .stream()
                .map(SiteResponse::from)
                .toList();
    }

    /**
     * Retrieves a site entity by its site key for internal use by other services.
     */
    @Transactional(readOnly = true)
    public Site getBySiteKey(String siteKey) {
        if (siteKey == null || siteKey.isBlank()) {
            throw new BadRequestException("Site key must not be blank");
        }
        String normalizedSiteKey = siteKey.trim();
        if (normalizedSiteKey.length() > 64) {
            throw new BadRequestException("Site key must not exceed 64 characters");
        }
        return siteRepository.findBySiteKey(normalizedSiteKey)
                .orElseThrow(() -> new ResourceNotFoundException("Site not found with key: " + normalizedSiteKey));
    }

    private String generateSiteKey() {
        String key;
        do {
            StringBuilder sb = new StringBuilder("sk_");
            for (int i = 0; i < 24; i++) {
                int index = RANDOM.nextInt(ALPHANUMERIC.length());
                sb.append(ALPHANUMERIC.charAt(index));
            }
            key = sb.toString();
        } while (siteRepository.existsBySiteKey(key));
        return key;
    }
}
