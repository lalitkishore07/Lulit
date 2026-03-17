package com.lulit.backend.repository.dao;

import com.lulit.backend.entity.dao.DaoWalletProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DaoWalletProfileRepository extends JpaRepository<DaoWalletProfile, Long> {
    Optional<DaoWalletProfile> findByWallet(String wallet);
}
