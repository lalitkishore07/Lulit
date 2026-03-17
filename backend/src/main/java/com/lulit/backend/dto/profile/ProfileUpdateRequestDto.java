package com.lulit.backend.dto.profile;

import jakarta.validation.constraints.Size;

public record ProfileUpdateRequestDto(
        @Size(max = 80) String displayName,
        @Size(max = 280) String bio,
        @Size(max = 100) String location,
        @Size(max = 255) String websiteUrl,
        @Size(max = 1200) String about,
        @Size(max = 42) String walletAddress,
        Long pinnedPostId
) {
}
