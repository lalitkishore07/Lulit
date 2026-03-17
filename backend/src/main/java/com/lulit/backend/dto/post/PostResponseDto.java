package com.lulit.backend.dto.post;

import java.time.LocalDateTime;

public record PostResponseDto(
        Long id,
        String username,
        String caption,
        String ipfsCid,
        String mediaUrl,
        String mediaMimeType,
        String blockchainTxHash,
        Long supportCount,
        Long challengeCount,
        String myValidation,
        String moderationStatus,
        String moderationReason,
        Long moderationDaoProposalId,
        String duplicateStatus,
        Double duplicateConfidenceScore,
        LocalDateTime createdAt
) {
}
