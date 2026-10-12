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

@Service
@RequiredArgsConstructor
public class SiteService {

    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

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

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + ownerId));

        String siteKey = generateSiteKey();
        Site site = Site.builder()
                .name(name.trim())
                .siteKey(siteKey)
                .allowedDomain(allowedDomain)
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
        return siteRepository.findBySiteKey(siteKey)
                .orElseThrow(() -> new ResourceNotFoundException("Site not found with key: " + siteKey));
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
