package com.lulit.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.lulit.backend.dto.post.AltTextResponseDto;
import com.lulit.backend.dto.post.PostSearchResultDto;
import com.lulit.backend.dto.post.PostResponseDto;
import com.lulit.backend.dto.post.ValidationResponseDto;
import com.lulit.backend.entity.Post;
import com.lulit.backend.entity.PostDuplicateStatus;
import com.lulit.backend.entity.PostModerationStatus;
import com.lulit.backend.entity.PostValidation;
import com.lulit.backend.entity.PostValidationChoice;
import com.lulit.backend.entity.User;
import com.lulit.backend.entity.dao.DaoExecutionStatus;
import com.lulit.backend.entity.dao.DaoProposal;
import com.lulit.backend.entity.dao.DaoProposalState;
import com.lulit.backend.entity.dao.DaoProposalType;
import com.lulit.backend.entity.dao.DaoVotingStrategy;
import com.lulit.backend.exception.ApiException;
import com.lulit.backend.repository.PostValidationRepository;
import com.lulit.backend.repository.PostRepository;
import com.lulit.backend.repository.UserRepository;
import com.lulit.backend.repository.dao.DaoProposalRepository;
import com.lulit.backend.service.duplicate.AiEmbeddingService;
import com.lulit.backend.service.duplicate.DuplicateDecision;
import com.lulit.backend.service.duplicate.DuplicateDetectionService;
import com.lulit.backend.service.duplicate.MediaFingerprintService;
import com.lulit.backend.service.ai.AiInsightService;
import com.lulit.backend.service.upload.InMemoryMultipartFile;
import com.lulit.backend.service.upload.MediaUploadSecurityService;
import com.lulit.backend.service.upload.ValidatedMediaFile;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostValidationRepository postValidationRepository;
    private final UserRepository userRepository;
    private final DaoProposalRepository daoProposalRepository;
    private final PinataService pinataService;
    private final BlockchainService blockchainService;
    private final ContentModerationService contentModerationService;
    private final MediaUploadSecurityService mediaUploadSecurityService;
    private final MediaFingerprintService mediaFingerprintService;
    private final DuplicateDetectionService duplicateDetectionService;
    private final AiEmbeddingService aiEmbeddingService;
    private final AiInsightService aiInsightService;
    private final ObjectMapper objectMapper;

    @Value("${app.ipfs.gateway:https://gateway.pinata.cloud/ipfs}")
    private String gatewayBaseUrl;

    @Value("${app.moderation.enabled:true}")
    private boolean moderationEnabled;

    @Value("${app.dao.enabled:false}")
    private boolean daoEnabled;

    @Value("${app.moderation.review-hours:24}")
    private int moderationReviewHours;

    @Transactional
    public PostResponseDto createPost(String username, String caption, List<MultipartFile> mediaFiles) {
        if (mediaFiles == null || mediaFiles.size() != 1) {
            throw new ApiException("Exactly one media file is required");
        }

        String normalizedCaption = caption == null ? "" : caption.trim();
        ValidatedMediaFile validatedFile = mediaUploadSecurityService.validate(mediaFiles.get(0));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));

        String sha256 = mediaFingerprintService.sha256Hex(validatedFile.bytes());
        DuplicateDecision exactSha = duplicateDetectionService.detectExactBySha256(sha256);
        if (exactSha.exactDuplicate()) {
            throw new ApiException("Exact duplicate blocked: " + exactSha.reason());
        }

        String perceptualHash = mediaFingerprintService.perceptualHash(validatedFile.bytes(), validatedFile.mimeType());
        List<Double> embedding = aiEmbeddingService.generateEmbedding(validatedFile.bytes(), validatedFile.mimeType(), sha256);
        DuplicateDecision nearDuplicate = duplicateDetectionService.detectNearDuplicate(perceptualHash, embedding);

        MultipartFile safeMultipartFile = new InMemoryMultipartFile(
                "file",
                validatedFile.originalFilename() == null ? "upload.bin" : validatedFile.originalFilename(),
                validatedFile.mimeType(),
                validatedFile.bytes()
        );
        String cid = pinataService.uploadToIpfs(safeMultipartFile);
        DuplicateDecision exactCid = duplicateDetectionService.detectExactByCid(cid);
        if (exactCid.exactDuplicate()) {
            throw new ApiException("Exact duplicate blocked: " + exactCid.reason());
        }
        String txHash = blockchainService.recordPostCid(cid);

        List<Post> recentPosts = postRepository.findTop20ByUserIdOrderByCreatedAtDesc(user.getId());
        long postsInLast10Minutes = postRepository.countByUserIdAndCreatedAtAfter(user.getId(), LocalDateTime.now().minusMinutes(10));
        ContentModerationService.ModerationEvaluation moderation = moderationEnabled
                ? contentModerationService.evaluate(normalizedCaption, recentPosts, postsInLast10Minutes)
                : new ContentModerationService.ModerationEvaluation(0, 0, 0, 0, 0, 0, 1, false, "Moderation disabled");
        moderation = aiInsightService.enhanceModeration(normalizedCaption, validatedFile.mimeType(), moderation);
        boolean shouldReview = moderation.flagged() || nearDuplicate.nearDuplicate();
        String moderationReason = shouldReview
                ? buildModerationReason(moderation.summary(), nearDuplicate)
                : "Approved by automated checks";

        Post post = new Post();
        post.setUser(user);
        post.setCaption(normalizedCaption);
        post.setIpfsCid(cid);
        post.setMediaMimeType(validatedFile.mimeType());
        post.setMediaSizeBytes(validatedFile.sizeBytes());
        post.setMediaSha256(sha256);
        post.setMediaPerceptualHash(perceptualHash);
        post.setMediaEmbeddingJson(serializeEmbedding(embedding));
        post.setDuplicateStatus(nearDuplicate.nearDuplicate() ? nearDuplicate.status() : PostDuplicateStatus.UNIQUE);
        post.setDuplicateConfidenceScore(nearDuplicate.nearDuplicate() ? nearDuplicate.confidenceScore() : 0.0);
        post.setDuplicateReferencePostId(nearDuplicate.referencePostId());
        post.setBlockchainTxHash(txHash);
        post.setModerationStatus(shouldReview ? PostModerationStatus.PENDING_REVIEW : PostModerationStatus.APPROVED);
        post.setModerationReason(moderationReason);
        post.setModerationScoresJson(moderation.toCompactJson());
        Post saved = postRepository.save(post);

        if (shouldReview && daoEnabled) {
            Long proposalId = createDaoModerationProposal(saved, moderation);
            saved.setModerationDaoProposalId(proposalId);
            postRepository.save(saved);
        }

        return toDto(saved, user.getId());
    }

    @Transactional(readOnly = true)
    public List<PostResponseDto> getFeed(String viewerUsername) {
        User viewer = userRepository.findByUsername(viewerUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        return postRepository.findTop50ByModerationStatusOrModerationStatusIsNullOrderByCreatedAtDesc(PostModerationStatus.APPROVED)
                .stream()
                .sorted(Comparator.comparingDouble((Post post) -> feedScore(post, viewer.getId())).reversed())
                .map(post -> toDto(post, viewer.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PostSearchResultDto> semanticSearch(String viewerUsername, String query) {
        User viewer = userRepository.findByUsername(viewerUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));

        String normalized = query == null ? "" : query.trim();
        if (normalized.isBlank()) {
            throw new ApiException("Search query is required");
        }

        List<Double> queryEmbedding = aiInsightService.textEmbedding(normalized);
        return postRepository.findTop500ByModerationStatusOrModerationStatusIsNullOrderByCreatedAtDesc(PostModerationStatus.APPROVED)
                .stream()
                .map(post -> toSearchResult(post, viewer.getId(), queryEmbedding, normalized))
                .sorted(Comparator.comparingDouble(PostSearchResultDto::relevanceScore).reversed())
                .limit(25)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PostSearchResultDto> similarPosts(String viewerUsername, Long postId) {
        User viewer = userRepository.findByUsername(viewerUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        Post seed = postRepository.findById(postId)
                .orElseThrow(() -> new ApiException("Post not found"));

        List<Double> seedEmbedding = parseEmbedding(seed.getMediaEmbeddingJson());
        if (seedEmbedding.isEmpty()) {
            seedEmbedding = aiInsightService.textEmbedding(seed.getCaption() == null ? "" : seed.getCaption());
        }
        List<Double> baseline = seedEmbedding;

        return postRepository.findTop500ByModerationStatusOrModerationStatusIsNullOrderByCreatedAtDesc(PostModerationStatus.APPROVED)
                .stream()
                .filter(candidate -> !candidate.getId().equals(seed.getId()))
                .map(candidate -> toSearchResult(candidate, viewer.getId(), baseline, "similar:" + seed.getId()))
                .sorted(Comparator.comparingDouble(PostSearchResultDto::relevanceScore).reversed())
                .limit(25)
                .toList();
    }

    @Transactional(readOnly = true)
    public AltTextResponseDto altText(String viewerUsername, Long postId) {
        userRepository.findByUsername(viewerUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ApiException("Post not found"));
        String mediaUrl = post.getIpfsCid() == null ? null : gatewayBaseUrl + "/" + post.getIpfsCid();
        return new AltTextResponseDto(postId, aiInsightService.generateAltText(mediaUrl, post.getCaption()));
    }

    @Transactional
    public ValidationResponseDto validatePost(String viewerUsername, Long postId, PostValidationChoice choice) {
        User viewer = userRepository.findByUsername(viewerUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ApiException("Post not found"));

        PostValidation existing = postValidationRepository.findByPostIdAndUserId(postId, viewer.getId()).orElse(null);
        String myValidation;
        if (existing != null) {
            if (existing.getChoice() == choice) {
                postValidationRepository.delete(existing);
                myValidation = null;
            } else {
                existing.setChoice(choice);
                postValidationRepository.save(existing);
                myValidation = choice.name();
            }
        } else {
            PostValidation validation = new PostValidation();
            validation.setPost(post);
            validation.setUser(viewer);
            validation.setChoice(choice);
            postValidationRepository.save(validation);
            myValidation = choice.name();
        }

        long supportCount = postValidationRepository.countByPostIdAndChoice(postId, PostValidationChoice.SUPPORT);
        long challengeCount = postValidationRepository.countByPostIdAndChoice(postId, PostValidationChoice.CHALLENGE);
        return new ValidationResponseDto(postId, myValidation, supportCount, challengeCount);
    }

    private PostResponseDto toDto(Post post, Long viewerUserId) {
        long supportCount = postValidationRepository.countByPostIdAndChoice(post.getId(), PostValidationChoice.SUPPORT);
        long challengeCount = postValidationRepository.countByPostIdAndChoice(post.getId(), PostValidationChoice.CHALLENGE);
        String myValidation = postValidationRepository.findByPostIdAndUserId(post.getId(), viewerUserId)
                .map(v -> v.getChoice().name())
                .orElse(null);
        return new PostResponseDto(
                post.getId(),
                post.getUser().getUsername(),
                post.getCaption(),
                post.getIpfsCid(),
                post.getIpfsCid() == null ? null : gatewayBaseUrl + "/" + post.getIpfsCid(),
                post.getMediaMimeType(),
                post.getBlockchainTxHash(),
                supportCount,
                challengeCount,
                myValidation,
                post.getModerationStatus() == null ? PostModerationStatus.APPROVED.name() : post.getModerationStatus().name(),
                post.getModerationReason(),
                post.getModerationDaoProposalId(),
                post.getDuplicateStatus() == null ? PostDuplicateStatus.UNIQUE.name() : post.getDuplicateStatus().name(),
                post.getDuplicateConfidenceScore(),
                post.getCreatedAt()
        );
    }

    private String serializeEmbedding(List<Double> embedding) {
        try {
            return objectMapper.writeValueAsString(embedding);
        } catch (Exception ex) {
            return "[]";
        }
    }

    private String buildModerationReason(String moderationSummary, DuplicateDecision nearDuplicate) {
        if (!nearDuplicate.nearDuplicate()) {
            return moderationSummary;
        }
        if (moderationSummary == null || moderationSummary.isBlank() || "Moderation disabled".equalsIgnoreCase(moderationSummary)) {
            return nearDuplicate.reason();
        }
        return moderationSummary + " | " + nearDuplicate.reason();
    }

    private Long createDaoModerationProposal(Post post, ContentModerationService.ModerationEvaluation moderation) {
        String aiSummary = aiInsightService.summarizeModerationCase(post, moderation, post.getModerationReason());
        DaoProposal proposal = new DaoProposal();
        proposal.setTitle("Content moderation review for post #" + post.getId());
        proposal.setDescription(String.format(
                "AI moderation flagged this post.%nReason: %s%nAI Summary: %s%nScores: %s",
                post.getModerationReason(),
                aiSummary,
                post.getModerationScoresJson()
        ));
        proposal.setCreatorWallet(resolveCreatorWallet(post.getUser()));
        proposal.setProposalType(DaoProposalType.CONTENT_MODERATION);
        proposal.setVotingStrategy(DaoVotingStrategy.ONE_WALLET_ONE_VOTE);
        proposal.setMetadataHash("local-moderation-" + post.getId());
        proposal.setMetadataUrl("local://post/" + post.getId());
        proposal.setStartTime(LocalDateTime.now());
        proposal.setEndTime(LocalDateTime.now().plusHours(Math.max(moderationReviewHours, 1)));
        proposal.setState(DaoProposalState.ACTIVE);
        proposal.setExecutionStatus(DaoExecutionStatus.PENDING_ACTION);
        proposal.setQuorumBps(2000);

        return daoProposalRepository.save(proposal).getId();
    }

    private String resolveCreatorWallet(User user) {
        String wallet = user.getWalletAddress();
        if (wallet != null && wallet.matches("^0x[0-9a-fA-F]{40}$")) {
            return wallet;
        }
        return "0x0000000000000000000000000000000000000000";
    }

    private PostSearchResultDto toSearchResult(Post post, Long viewerUserId, List<Double> queryEmbedding, String query) {
        List<Double> candidateEmbedding = parseEmbedding(post.getMediaEmbeddingJson());
        if (candidateEmbedding.isEmpty()) {
            candidateEmbedding = aiInsightService.textEmbedding(post.getCaption() == null ? "" : post.getCaption());
        }
        double embeddingScore = cosineSimilarity(queryEmbedding, candidateEmbedding);
        double textScore = lexicalScore(query, post.getCaption());
        double recencyBoost = recencyBoost(post.getCreatedAt());
        double relevance = (embeddingScore * 0.70) + (textScore * 0.20) + (recencyBoost * 0.10);
        String rationale = String.format(Locale.ROOT, "embedding=%.3f text=%.3f recency=%.3f", embeddingScore, textScore, recencyBoost);
        return new PostSearchResultDto(toDto(post, viewerUserId), clamp01(relevance), rationale);
    }

    private List<Double> parseEmbedding(String embeddingJson) {
        if (embeddingJson == null || embeddingJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(embeddingJson, new TypeReference<List<Double>>() {
            });
        } catch (Exception ex) {
            return List.of();
        }
    }

    private double cosineSimilarity(List<Double> left, List<Double> right) {
        int size = Math.min(left.size(), right.size());
        if (size == 0) {
            return 0.0;
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < size; i++) {
            double a = left.get(i);
            double b = right.get(i);
            dot += a * b;
            normA += a * a;
            normB += b * b;
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private double lexicalScore(String query, String caption) {
        if (query == null || query.isBlank() || caption == null || caption.isBlank()) {
            return 0.0;
        }
        String q = query.toLowerCase(Locale.ROOT);
        String c = caption.toLowerCase(Locale.ROOT);
        if (c.contains(q)) {
            return 1.0;
        }
        long overlap = List.of(q.split("\\s+")).stream().filter(token -> !token.isBlank() && c.contains(token)).count();
        long total = List.of(q.split("\\s+")).stream().filter(token -> !token.isBlank()).count();
        if (total == 0) {
            return 0.0;
        }
        return overlap / (double) total;
    }

    private double recencyBoost(LocalDateTime createdAt) {
        if (createdAt == null) {
            return 0.0;
        }
        long hours = Math.max(0, ChronoUnit.HOURS.between(createdAt, LocalDateTime.now()));
        return 1.0 / (1.0 + (hours / 12.0));
    }

    private double feedScore(Post post, Long viewerUserId) {
        long support = postValidationRepository.countByPostIdAndChoice(post.getId(), PostValidationChoice.SUPPORT);
        long challenge = postValidationRepository.countByPostIdAndChoice(post.getId(), PostValidationChoice.CHALLENGE);
        double crowdSignal = (support + 1.0) / (support + challenge + 2.0);

        List<Double> viewerPreference = viewerPreferenceEmbedding(viewerUserId);
        List<Double> postEmbedding = parseEmbedding(post.getMediaEmbeddingJson());
        double preferenceScore = viewerPreference.isEmpty() || postEmbedding.isEmpty()
                ? 0.0
                : cosineSimilarity(viewerPreference, postEmbedding);

        return (crowdSignal * 0.55) + (preferenceScore * 0.30) + (recencyBoost(post.getCreatedAt()) * 0.15);
    }

    private List<Double> viewerPreferenceEmbedding(Long viewerUserId) {
        List<PostValidation> recent = postValidationRepository.findTop50ByUserIdOrderByCreatedAtDesc(viewerUserId);
        List<List<Double>> vectors = recent.stream()
                .filter(v -> v.getChoice() == PostValidationChoice.SUPPORT)
                .map(v -> parseEmbedding(v.getPost().getMediaEmbeddingJson()))
                .filter(v -> !v.isEmpty())
                .limit(15)
                .toList();

        if (vectors.isEmpty()) {
            return List.of();
        }
        int dim = vectors.stream().mapToInt(List::size).min().orElse(0);
        if (dim == 0) {
            return List.of();
        }
        double[] aggregate = new double[dim];
        for (List<Double> vector : vectors) {
            for (int i = 0; i < dim; i++) {
                aggregate[i] += vector.get(i);
            }
        }
        List<Double> average = new java.util.ArrayList<>(dim);
        for (int i = 0; i < dim; i++) {
            average.add(aggregate[i] / vectors.size());
        }
        return average;
    }

    private double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }
}
