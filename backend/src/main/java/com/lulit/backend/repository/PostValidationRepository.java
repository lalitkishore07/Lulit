package com.lulit.backend.repository;

import com.lulit.backend.entity.PostValidation;
import com.lulit.backend.entity.PostValidationChoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostValidationRepository extends JpaRepository<PostValidation, Long> {
    Optional<PostValidation> findByPostIdAndUserId(Long postId, Long userId);
    long countByPostIdAndChoice(Long postId, PostValidationChoice choice);
    long countByPostUserId(Long userId);
    List<PostValidation> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
}
