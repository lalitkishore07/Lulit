package com.lulit.backend.dto.post;

public record PostSearchResultDto(
        PostResponseDto post,
        Double relevanceScore,
        String rationale
) {
}
