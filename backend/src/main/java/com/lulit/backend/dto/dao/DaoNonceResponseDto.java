package com.lulit.backend.dto.dao;

public record DaoNonceResponseDto(
        String nonce,
        String message,
        long expiresAtEpochSecond
) {
}
