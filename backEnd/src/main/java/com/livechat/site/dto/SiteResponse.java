package com.livechat.site.dto;

import com.livechat.site.Site;

import java.time.LocalDateTime;

public record SiteResponse(
        Long id,
        String name,
        String siteKey,
        String allowedDomain,
        LocalDateTime createdAt
) {
    public static SiteResponse from(Site site) {
        return new SiteResponse(
                site.getId(),
                site.getName(),
                site.getSiteKey(),
                site.getAllowedDomain(),
                site.getCreatedAt()
        );
    }
}
