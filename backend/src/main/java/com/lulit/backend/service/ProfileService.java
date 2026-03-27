package com.lulit.backend.service;

import com.lulit.backend.dto.post.PostResponseDto;
import com.lulit.backend.dto.profile.AccountSearchResultDto;
import com.lulit.backend.dto.profile.ProfileResponseDto;
import com.lulit.backend.dto.profile.ProfileUpdateRequestDto;
import com.lulit.backend.entity.Post;
import com.lulit.backend.entity.PostDuplicateStatus;
import com.lulit.backend.entity.PostModerationStatus;
import com.lulit.backend.entity.PostValidation;
import com.lulit.backend.entity.PostValidationChoice;
import com.lulit.backend.entity.User;
import com.lulit.backend.exception.ApiException;
import com.lulit.backend.repository.FollowerRepository;
import com.lulit.backend.repository.PostValidationRepository;
import com.lulit.backend.repository.PostRepository;
import com.lulit.backend.repository.UserRepository;
import com.lulit.backend.repository.dao.DaoWalletProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostValidationRepository postValidationRepository;
    private final FollowerRepository followerRepository;
    private final DaoWalletProfileRepository daoWalletProfileRepository;
    private final PinataService pinataService;

    @Value("${app.ipfs.gateway:https://gateway.pinata.cloud/ipfs}")
    private String gatewayBaseUrl;

    @Transactional(readOnly = true)
    public ProfileResponseDto myProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        return buildProfile(user, user);
    }

    @Transactional(readOnly = true)
    public ProfileResponseDto profileByUsername(String actorUsername, String username) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        User target = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Target user not found"));
        return buildProfile(actor, target);
    }

    @Transactional(readOnly = true)
    public ProfileResponseDto profileByWallet(String actorUsername, String walletAddress) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        User target = userRepository.findByWalletAddressIgnoreCase(walletAddress)
                .orElseThrow(() -> new ApiException("Wallet profile not found"));
        return buildProfile(actor, target);
    }

    @Transactional(readOnly = true)
    public List<AccountSearchResultDto> searchAccounts(String actorUsername, String query) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));

        String normalized = query == null ? "" : query.trim();
        if (normalized.isBlank()) {
            return List.of();
        }

        return userRepository
                .findTop20ByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCaseOrderByUsernameAsc(normalized, normalized)
                .stream()
                .filter(candidate -> !candidate.getId().equals(actor.getId()))
                .map(candidate -> {
                    boolean following = followerRepository.existsByFollowerIdAndFollowingId(actor.getId(), candidate.getId());
                    boolean followingYou = followerRepository.existsByFollowerIdAndFollowingId(candidate.getId(), actor.getId());
                    return new AccountSearchResultDto(
                            candidate.getUsername(),
                            candidate.getDisplayName(),
                            candidate.getAvatarUrl(),
                            candidate.getBio(),
                            following,
                            followingYou,
                            following && followingYou
                    );
                })
                .toList();
    }

    @Transactional
    public ProfileResponseDto updateMyProfile(String username, ProfileUpdateRequestDto requestDto) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));

        user.setDisplayName(trimToNull(requestDto.displayName()));
        user.setBio(trimToNull(requestDto.bio()));
        user.setLocation(trimToNull(requestDto.location()));
        user.setWebsiteUrl(trimToNull(requestDto.websiteUrl()));
        user.setAbout(trimToNull(requestDto.about()));

        String wallet = trimToNull(requestDto.walletAddress());
        if (wallet != null && !wallet.matches("^0x[0-9a-fA-F]{40}$")) {
            throw new ApiException("Wallet address must be a valid 0x address");
        }
        user.setWalletAddress(wallet);

        if (requestDto.pinnedPostId() != null) {
            Post pinned = postRepository.findById(requestDto.pinnedPostId())
                    .orElseThrow(() -> new ApiException("Pinned post not found"));
            if (!pinned.getUser().getId().equals(user.getId())) {
                throw new ApiException("Pinned post must belong to your account");
            }
            user.setPinnedPostId(requestDto.pinnedPostId());
        } else {
            user.setPinnedPostId(null);
        }

        userRepository.save(user);
        return buildProfile(user, user);
    }

    @Transactional
    public ProfileResponseDto uploadAvatar(String username, MultipartFile file) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        if (file == null || file.isEmpty()) {
            throw new ApiException("Avatar file is required");
        }
        String cid = pinataService.uploadToIpfs(file);
        user.setAvatarUrl(gatewayBaseUrl + "/" + cid);
        userRepository.save(user);
        return buildProfile(user, user);
    }

    @Transactional
    public ProfileResponseDto uploadCover(String username, MultipartFile file) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        if (file == null || file.isEmpty()) {
            throw new ApiException("Cover file is required");
        }
        String cid = pinataService.uploadToIpfs(file);
        user.setCoverUrl(gatewayBaseUrl + "/" + cid);
        userRepository.save(user);
        return buildProfile(user, user);
    }

    private ProfileResponseDto buildProfile(User actor, User target) {
        long postsCount = postRepository.countByUserId(target.getId());
        long followersCount = followerRepository.countByFollowingId(target.getId());
        long followingCount = followerRepository.countByFollowerId(target.getId());
        long reactionsReceived = postValidationRepository.countByPostUserId(target.getId());
        boolean following = !actor.getId().equals(target.getId()) &&
                followerRepository.existsByFollowerIdAndFollowingId(actor.getId(), target.getId());
        boolean followingYou = !actor.getId().equals(target.getId()) &&
                followerRepository.existsByFollowerIdAndFollowingId(target.getId(), actor.getId());
        boolean friend = following && followingYou;

        List<PostResponseDto> textPosts = postRepository.findTop50ByUserIdAndIpfsCidIsNullOrderByCreatedAtDesc(target.getId())
                .stream()
                .map(post -> toDto(post, actor.getId()))
                .toList();

        List<PostResponseDto> mediaPosts = postRepository.findTop50ByUserIdAndIpfsCidIsNotNullOrderByCreatedAtDesc(target.getId())
                .stream()
                .map(post -> toDto(post, actor.getId()))
                .toList();

        Map<Long, PostResponseDto> reactedUnique = new LinkedHashMap<>();
        List<PostValidation> reacted = postValidationRepository.findTop50ByUserIdOrderByCreatedAtDesc(target.getId());
        for (PostValidation validation : reacted) {
            Post post = validation.getPost();
            reactedUnique.putIfAbsent(post.getId(), toDto(post, actor.getId()));
        }

        boolean walletConnected = target.getWalletAddress() != null && !target.getWalletAddress().isBlank();
        boolean daoParticipant = walletConnected && daoWalletProfileRepository.findByWallet(target.getWalletAddress()).isPresent();

        return new ProfileResponseDto(
                target.getId(),
                target.getUsername(),
                target.getDisplayName(),
                target.getAvatarUrl(),
                target.getCoverUrl(),
                target.getBio(),
                target.getLocation(),
                target.getWebsiteUrl(),
                target.getAbout(),
                target.getWalletAddress(),
                target.getPinnedPostId(),
                Boolean.TRUE.equals(target.getEmailVerified()),
                Boolean.TRUE.equals(target.getPhoneVerified()),
                walletConnected,
                daoParticipant,
                postsCount,
                followersCount,
                followingCount,
                reactionsReceived,
                following,
                followingYou,
                friend,
                textPosts,
                mediaPosts,
                List.copyOf(reactedUnique.values())
        );
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
