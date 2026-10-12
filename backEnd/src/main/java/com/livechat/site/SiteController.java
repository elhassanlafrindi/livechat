package com.livechat.site;

import com.livechat.auth.CurrentUser;
import com.livechat.site.dto.CreateSiteRequest;
import com.livechat.site.dto.SiteResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sites")
@RequiredArgsConstructor
public class SiteController {

    private final SiteService siteService;
    private final CurrentUser currentUser;

    @PostMapping
    public SiteResponse createSite(@RequestBody CreateSiteRequest request) {
        return siteService.createSite(currentUser.getId(), request.name(), request.allowedDomain());
    }

    @GetMapping
    public List<SiteResponse> listSites() {
        return siteService.listByOwner(currentUser.getId());
    }
}
