package com.livechat.auth.dto;

public record AuthResponse(
        String token,
        Long userId,
        String email
) {
}
