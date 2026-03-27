package com.lulit.backend.repository;

import com.lulit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByWalletAddressIgnoreCase(String walletAddress);
    List<User> findTop20ByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCaseOrderByUsernameAsc(String usernamePart, String displayNamePart);
}
