package com.lulit.backend.dto.post;

public record ValidationResponseDto(
        Long postId,
        String myValidation,
        long supportCount,
        long challengeCount
) {
}
