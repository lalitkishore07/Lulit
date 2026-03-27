package com.lulit.backend.dto.profile;

import com.lulit.backend.dto.post.PostResponseDto;

import java.util.List;

public record ProfileResponseDto(
        Long userId,
        String username,
        String displayName,
        String avatarUrl,
        String coverUrl,
        String bio,
        String location,
        String websiteUrl,
        String about,
        String walletAddress,
        Long pinnedPostId,
        boolean emailVerified,
        boolean phoneVerified,
        boolean walletConnected,
        boolean daoParticipant,
        long postsCount,
        long followersCount,
        long followingCount,
        long reactionsReceived,
        boolean following,
        boolean followingYou,
        boolean friend,
        List<PostResponseDto> textPosts,
        List<PostResponseDto> mediaPosts,
        List<PostResponseDto> reactedPosts
) {
}
