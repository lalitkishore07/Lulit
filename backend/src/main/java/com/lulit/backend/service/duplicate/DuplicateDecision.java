package com.lulit.backend.service.duplicate;

import com.lulit.backend.entity.PostDuplicateStatus;

public record DuplicateDecision(
        boolean exactDuplicate,
        boolean nearDuplicate,
        PostDuplicateStatus status,
        double confidenceScore,
        Long referencePostId,
        String reason
) {
    public static DuplicateDecision unique() {
        return new DuplicateDecision(false, false, PostDuplicateStatus.UNIQUE, 0.0, null, "Unique content");
    }

    public static DuplicateDecision exact(PostDuplicateStatus status, Long referencePostId, String reason) {
        return new DuplicateDecision(true, false, status, 1.0, referencePostId, reason);
    }

    public static DuplicateDecision near(PostDuplicateStatus status, Long referencePostId, double confidence, String reason) {
        return new DuplicateDecision(false, true, status, confidence, referencePostId, reason);
    }
}
