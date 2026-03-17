package com.lulit.backend.entity.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
        name = "dao_votes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_dao_vote_proposal_wallet", columnNames = {"proposal_id", "voter_wallet"})
        }
)
public class DaoVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proposal_id", nullable = false)
    private DaoProposal proposal;

    @Column(name = "voter_wallet", nullable = false, length = 42)
    private String voterWallet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private DaoVoteChoice choice;

    @Column(name = "voting_power", nullable = false, precision = 30, scale = 6)
    private BigDecimal votingPower;

    @Column(nullable = false, length = 255)
    private String signature;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
