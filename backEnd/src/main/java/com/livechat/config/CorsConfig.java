package com.livechat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        // Widget endpoint: allows any origin without credentials (loaded in shop websites)
        CorsConfiguration widgetConfig = new CorsConfiguration();
        widgetConfig.setAllowedOriginPatterns(List.of("*"));
        widgetConfig.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        widgetConfig.setAllowedHeaders(List.of("*"));
        widgetConfig.setAllowCredentials(false);
        source.registerCorsConfiguration("/api/widget/**", widgetConfig);

        // API and Auth endpoints: restricted to dashboard/demo origins with credentials
        CorsConfiguration apiConfig = new CorsConfiguration();
        apiConfig.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5500"));
        apiConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        apiConfig.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        apiConfig.setAllowCredentials(true);
        source.registerCorsConfiguration("/api/**", apiConfig);
        source.registerCorsConfiguration("/auth/**", apiConfig);

        return source;
    }
}
