package com.lulit.backend.dto.dao;

public record DaoAuthVerifyResponseDto(
        String wallet,
        boolean verified
) {
}
