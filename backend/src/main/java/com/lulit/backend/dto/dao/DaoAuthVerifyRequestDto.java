package com.lulit.backend.dto.dao;

import jakarta.validation.constraints.NotBlank;

public record DaoAuthVerifyRequestDto(
        @NotBlank String wallet,
        @NotBlank String nonce,
        @NotBlank String signature
) {
}
