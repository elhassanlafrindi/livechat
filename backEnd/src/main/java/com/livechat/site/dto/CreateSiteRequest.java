package com.livechat.site.dto;

public record CreateSiteRequest(
        String name,
        String allowedDomain
) {
}
