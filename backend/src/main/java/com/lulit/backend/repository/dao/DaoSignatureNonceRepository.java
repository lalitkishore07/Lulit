package com.lulit.backend.repository.dao;

import com.lulit.backend.entity.dao.DaoSignatureNonce;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DaoSignatureNonceRepository extends JpaRepository<DaoSignatureNonce, Long> {
    Optional<DaoSignatureNonce> findByWalletAndNonceValue(String wallet, String nonceValue);
}
