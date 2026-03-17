package com.lulit.backend.entity.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
        name = "dao_signature_nonces",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_dao_nonce_wallet_nonce", columnNames = {"wallet", "nonce_value"})
        }
)
public class DaoSignatureNonce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 42)
    private String wallet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DaoNoncePurpose purpose;

    @Column(name = "nonce_value", nullable = false, length = 80)
    private String nonceValue;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.used = false;
    }
}
