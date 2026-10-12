package com.livechat.auth.dto;

public record LoginRequest(
        String email,
        String password
) {
}
