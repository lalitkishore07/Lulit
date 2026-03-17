package com.lulit.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "posts", indexes = {
        @Index(name = "idx_posts_sha256", columnList = "media_sha256"),
        @Index(name = "idx_posts_ipfs_cid", columnList = "ipfs_cid"),
        @Index(name = "idx_posts_perceptual_hash", columnList = "media_perceptual_hash")
})
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 2200)
    private String caption;

    @Column(name = "ipfs_cid", length = 255)
    private String ipfsCid;

    @Column(name = "media_mime_type", length = 120)
    private String mediaMimeType;

    @Column(name = "media_size_bytes")
    private Long mediaSizeBytes;

    @Column(name = "media_sha256", length = 64)
    private String mediaSha256;

    @Column(name = "media_perceptual_hash", length = 64)
    private String mediaPerceptualHash;

    @Lob
    @Column(name = "media_embedding_json")
    private String mediaEmbeddingJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "duplicate_status", length = 40)
    private PostDuplicateStatus duplicateStatus;

    @Column(name = "duplicate_confidence_score")
    private Double duplicateConfidenceScore;

    @Column(name = "duplicate_reference_post_id")
    private Long duplicateReferencePostId;

    @Column(name = "blockchain_tx_hash", length = 255)
    private String blockchainTxHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", length = 30)
    private PostModerationStatus moderationStatus;

    @Column(name = "moderation_reason", length = 500)
    private String moderationReason;

    @Column(name = "moderation_scores_json", length = 2200)
    private String moderationScoresJson;

    @Column(name = "moderation_dao_proposal_id")
    private Long moderationDaoProposalId;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.moderationStatus == null) {
            this.moderationStatus = PostModerationStatus.APPROVED;
        }
        if (this.duplicateStatus == null) {
            this.duplicateStatus = PostDuplicateStatus.UNIQUE;
        }
    }
}
