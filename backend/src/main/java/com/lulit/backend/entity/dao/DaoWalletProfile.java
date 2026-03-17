package com.lulit.backend.entity.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
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
        name = "dao_wallet_profiles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_dao_wallet_profile_wallet", columnNames = {"wallet"})
        }
)
public class DaoWalletProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 42)
    private String wallet;

    @Column(name = "reputation_score", nullable = false)
    private Integer reputationScore;

    @Column(name = "staking_weight", nullable = false, precision = 20, scale = 4)
    private BigDecimal stakingWeight;

    @Column(name = "sybil_blocked", nullable = false)
    private boolean sybilBlocked;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.reputationScore == null) {
            this.reputationScore = 1;
        }
        if (this.stakingWeight == null) {
            this.stakingWeight = BigDecimal.ONE;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
