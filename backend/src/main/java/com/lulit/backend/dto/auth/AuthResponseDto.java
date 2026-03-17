package com.lulit.backend.dto.auth;

public record AuthResponseDto(
                String accessToken,
                String refreshToken,
                Long userId,
                String username) {
}
