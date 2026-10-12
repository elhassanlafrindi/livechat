package com.livechat.site;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SiteRepository extends JpaRepository<Site, Long> {

    Optional<Site> findBySiteKey(String siteKey);

    List<Site> findByOwnerId(Long ownerId);

    Optional<Site> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsBySiteKey(String siteKey);

    boolean existsByIdAndOwnerId(Long id, Long ownerId);
}
