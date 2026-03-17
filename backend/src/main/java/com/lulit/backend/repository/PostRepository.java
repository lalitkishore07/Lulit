package com.lulit.backend.repository;

import com.lulit.backend.entity.Post;
import com.lulit.backend.entity.PostModerationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findTop50ByOrderByCreatedAtDesc();

    List<Post> findTop500ByOrderByCreatedAtDesc();

    List<Post> findTop50ByModerationStatusOrderByCreatedAtDesc(PostModerationStatus moderationStatus);

    List<Post> findTop50ByModerationStatusOrModerationStatusIsNullOrderByCreatedAtDesc(
            PostModerationStatus moderationStatus);

    List<Post> findTop500ByModerationStatusOrModerationStatusIsNullOrderByCreatedAtDesc(
            PostModerationStatus moderationStatus);

    Page<Post> findByModerationStatusOrModerationStatusIsNullOrderByCreatedAtDesc(PostModerationStatus moderationStatus,
            Pageable pageable);

    List<Post> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);

    List<Post> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);

    List<Post> findTop50ByUserIdAndIpfsCidIsNullOrderByCreatedAtDesc(Long userId);

    List<Post> findTop50ByUserIdAndIpfsCidIsNotNullOrderByCreatedAtDesc(Long userId);

    Optional<Post> findFirstByMediaSha256(String mediaSha256);

    Optional<Post> findFirstByIpfsCid(String ipfsCid);

    List<Post> findTop500ByMediaPerceptualHashIsNotNullOrderByCreatedAtDesc();

    List<Post> findTop500ByMediaEmbeddingJsonIsNotNullOrderByCreatedAtDesc();

    long countByUserId(Long userId);

    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime createdAt);
}
