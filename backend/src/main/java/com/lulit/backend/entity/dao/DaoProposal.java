package com.lulit.backend.entity.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "dao_proposals")
public class DaoProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 140)
    private String title;

    @Column(nullable = false, length = 5000)
    private String description;

    @Column(name = "creator_wallet", nullable = false, length = 42)
    private String creatorWallet;

    @Enumerated(EnumType.STRING)
    @Column(name = "proposal_type", nullable = false, length = 40)
    private DaoProposalType proposalType;

    @Enumerated(EnumType.STRING)
    @Column(name = "voting_strategy", nullable = false, length = 40)
    private DaoVotingStrategy votingStrategy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DaoProposalState state;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_status", nullable = false, length = 30)
    private DaoExecutionStatus executionStatus;

    @Column(name = "metadata_hash", nullable = false, length = 120)
    private String metadataHash;

    @Column(name = "metadata_url", nullable = false, length = 255)
    private String metadataUrl;

    @Column(name = "snapshot_block")
    private Long snapshotBlock;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "quorum_bps", nullable = false)
    private Integer quorumBps;

    @Column(name = "for_votes", nullable = false, precision = 30, scale = 6)
    private BigDecimal forVotes;

    @Column(name = "against_votes", nullable = false, precision = 30, scale = 6)
    private BigDecimal againstVotes;

    @Column(name = "abstain_votes", nullable = false, precision = 30, scale = 6)
    private BigDecimal abstainVotes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.state == null) {
            this.state = DaoProposalState.PENDING;
        }
        if (this.executionStatus == null) {
            this.executionStatus = DaoExecutionStatus.NONE;
        }
        if (this.forVotes == null) {
            this.forVotes = BigDecimal.ZERO;
        }
        if (this.againstVotes == null) {
            this.againstVotes = BigDecimal.ZERO;
        }
        if (this.abstainVotes == null) {
            this.abstainVotes = BigDecimal.ZERO;
        }
        if (this.quorumBps == null) {
            this.quorumBps = 2000;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
