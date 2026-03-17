package com.lulit.backend.service.duplicate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lulit.backend.entity.Post;
import com.lulit.backend.entity.PostDuplicateStatus;
import com.lulit.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DuplicateDetectionService {

    private final PostRepository postRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.duplicate.thresholds.phash:0.90}")
    private double perceptualThreshold;

    @Value("${app.duplicate.thresholds.embedding:0.95}")
    private double embeddingThreshold;

    @Value("${app.duplicate.compare-limit:500}")
    private int compareLimit;

    public DuplicateDecision detectExactBySha256(String sha256) {
        Optional<Post> existing = postRepository.findFirstByMediaSha256(sha256);
        if (existing.isPresent()) {
            return DuplicateDecision.exact(
                    PostDuplicateStatus.EXACT_DUPLICATE_BLOCKED,
                    existing.get().getId(),
                    "Exact duplicate detected from SHA-256"
            );
        }
        return DuplicateDecision.unique();
    }

    public DuplicateDecision detectNearDuplicate(String perceptualHash, List<Double> embedding) {
        DuplicateDecision perceptualDecision = detectPerceptualDuplicate(perceptualHash);
        DuplicateDecision embeddingDecision = detectEmbeddingDuplicate(embedding);

        if (!perceptualDecision.nearDuplicate() && !embeddingDecision.nearDuplicate()) {
            return DuplicateDecision.unique();
        }
        if (!perceptualDecision.nearDuplicate()) {
            return embeddingDecision;
        }
        if (!embeddingDecision.nearDuplicate()) {
            return perceptualDecision;
        }
        return embeddingDecision.confidenceScore() >= perceptualDecision.confidenceScore()
                ? embeddingDecision
                : perceptualDecision;
    }

    public DuplicateDecision detectExactByCid(String cid) {
        Optional<Post> existing = postRepository.findFirstByIpfsCid(cid);
        if (existing.isPresent()) {
            return DuplicateDecision.exact(
                    PostDuplicateStatus.EXACT_DUPLICATE_BLOCKED,
                    existing.get().getId(),
                    "Exact duplicate detected from IPFS CID"
            );
        }
        return DuplicateDecision.unique();
    }

    private DuplicateDecision detectPerceptualDuplicate(String perceptualHash) {
        if (perceptualHash == null || perceptualHash.isBlank()) {
            return DuplicateDecision.unique();
        }
        List<Post> candidates = postRepository.findTop500ByMediaPerceptualHashIsNotNullOrderByCreatedAtDesc();
        int max = Math.min(compareLimit, candidates.size());
        double bestScore = 0.0;
        Long bestId = null;

        for (int i = 0; i < max; i++) {
            Post candidate = candidates.get(i);
            String candidateHash = candidate.getMediaPerceptualHash();
            if (candidateHash == null || candidateHash.isBlank()) {
                continue;
            }
            double score = similarity(perceptualHash, candidateHash);
            if (score > bestScore) {
                bestScore = score;
                bestId = candidate.getId();
            }
        }

        if (bestScore > perceptualThreshold && bestId != null) {
            return DuplicateDecision.near(
                    PostDuplicateStatus.PERCEPTUAL_NEAR_DUPLICATE,
                    bestId,
                    bestScore,
                    "Perceptual similarity above threshold"
            );
        }
        return DuplicateDecision.unique();
    }

    private DuplicateDecision detectEmbeddingDuplicate(List<Double> embedding) {
        if (embedding == null || embedding.isEmpty()) {
            return DuplicateDecision.unique();
        }
        List<Post> candidates = postRepository.findTop500ByMediaEmbeddingJsonIsNotNullOrderByCreatedAtDesc();
        int max = Math.min(compareLimit, candidates.size());
        double bestScore = 0.0;
        Long bestId = null;

        for (int i = 0; i < max; i++) {
            Post candidate = candidates.get(i);
            List<Double> candidateVector = deserializeVector(candidate.getMediaEmbeddingJson());
            if (candidateVector.isEmpty()) {
                continue;
            }
            double score = cosineSimilarity(embedding, candidateVector);
            if (score > bestScore) {
                bestScore = score;
                bestId = candidate.getId();
            }
        }

        if (bestScore > embeddingThreshold && bestId != null) {
            return DuplicateDecision.near(
                    PostDuplicateStatus.EMBEDDING_NEAR_DUPLICATE,
                    bestId,
                    bestScore,
                    "Embedding similarity above threshold"
            );
        }
        return DuplicateDecision.unique();
    }

    private List<Double> deserializeVector(String serialized) {
        if (serialized == null || serialized.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(serialized, new TypeReference<List<Double>>() {
            });
        } catch (Exception ex) {
            return List.of();
        }
    }

    private double similarity(String a, String b) {
        try {
            long first = Long.parseUnsignedLong(a, 16);
            long second = Long.parseUnsignedLong(b, 16);
            int distance = Long.bitCount(first ^ second);
            return 1.0 - (distance / 64.0);
        } catch (Exception ex) {
            return 0.0;
        }
    }

    private double cosineSimilarity(List<Double> first, List<Double> second) {
        int length = Math.min(first.size(), second.size());
        if (length == 0) {
            return 0.0;
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < length; i++) {
            double a = first.get(i);
            double b = second.get(i);
            dot += a * b;
            normA += a * a;
            normB += b * b;
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
