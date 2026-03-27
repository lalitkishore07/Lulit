package com.lulit.backend.dto.profile;

public record AccountSearchResultDto(
        String username,
        String displayName,
        String avatarUrl,
        String bio,
        boolean following,
        boolean followingYou,
        boolean friend
) {
}
