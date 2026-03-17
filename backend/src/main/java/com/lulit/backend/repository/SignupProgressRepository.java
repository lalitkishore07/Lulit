package com.lulit.backend.repository;

import com.lulit.backend.entity.SignupProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SignupProgressRepository extends JpaRepository<SignupProgress, Long> {
    Optional<SignupProgress> findByEmail(String email);
}
