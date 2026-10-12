package com.livechat.auth.dto;

public record RegisterRequest(
        String email,
        String password
) {
}
