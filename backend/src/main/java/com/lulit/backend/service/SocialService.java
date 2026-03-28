package com.lulit.backend.service;

import com.lulit.backend.dto.social.ApiStatusDto;
import com.lulit.backend.dto.social.NotificationDto;
import com.lulit.backend.entity.Follower;
import com.lulit.backend.entity.Notification;
import com.lulit.backend.entity.User;
import com.lulit.backend.exception.ApiException;
import com.lulit.backend.repository.FollowerRepository;
import com.lulit.backend.repository.NotificationRepository;
import com.lulit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SocialService {
    private static final String FRIEND_REQUEST_PREFIX = "FRIEND_REQUEST::";

    private final UserRepository userRepository;
    private final FollowerRepository followerRepository;
    private final NotificationRepository notificationRepository;

    @Transactional
    public ApiStatusDto follow(String actorUsername, String targetUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new ApiException("Target user not found"));

        if (actor.getId().equals(target.getId())) {
            throw new ApiException("You cannot follow yourself");
        }
        if (followerRepository.existsByFollowerIdAndFollowingId(actor.getId(), target.getId())) {
            return new ApiStatusDto("Already following");
        }

        Follower relation = new Follower();
        relation.setFollower(actor);
        relation.setFollowing(target);
        followerRepository.save(relation);

        Notification notification = new Notification();
        notification.setUser(target);
        notification.setMessage(actor.getUsername() + " started following you");
        notificationRepository.save(notification);

        return new ApiStatusDto("Followed successfully");
    }

    @Transactional
    public ApiStatusDto addFriend(String actorUsername, String targetUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new ApiException("Target user not found"));

        if (actor.getId().equals(target.getId())) {
            throw new ApiException("You cannot add yourself as a friend");
        }

        boolean actorFollowsTarget = followerRepository.existsByFollowerIdAndFollowingId(actor.getId(), target.getId());
        boolean targetFollowsActor = followerRepository.existsByFollowerIdAndFollowingId(target.getId(), actor.getId());
        if (actorFollowsTarget && targetFollowsActor) {
            return new ApiStatusDto("You are already friends");
        }

        String outgoingRequest = friendRequestMessage(actor.getUsername());
        String incomingRequest = friendRequestMessage(target.getUsername());
        boolean alreadyRequested = notificationRepository.existsByUserIdAndMessage(target.getId(), outgoingRequest);
        boolean hasIncomingRequest = notificationRepository.existsByUserIdAndMessage(actor.getId(), incomingRequest);

        if (hasIncomingRequest) {
            ensureFollow(actor, target);
            ensureFollow(target, actor);
            notificationRepository.deleteByUserIdAndMessage(actor.getId(), incomingRequest);

            Notification actorNotice = new Notification();
            actorNotice.setUser(actor);
            actorNotice.setMessage("You and " + target.getUsername() + " are now friends");
            notificationRepository.save(actorNotice);

            Notification targetNotice = new Notification();
            targetNotice.setUser(target);
            targetNotice.setMessage("You and " + actor.getUsername() + " are now friends");
            notificationRepository.save(targetNotice);
            return new ApiStatusDto("Friend request accepted");
        }

        if (alreadyRequested) {
            return new ApiStatusDto("Friend request already sent");
        }

        Notification notification = new Notification();
        notification.setUser(target);
        notification.setMessage(outgoingRequest);
        notificationRepository.save(notification);

        return new ApiStatusDto("Friend request sent");
    }

    @Transactional
    public ApiStatusDto unfollow(String actorUsername, String targetUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new ApiException("Target user not found"));

        followerRepository.deleteByFollowerIdAndFollowingId(actor.getId(), target.getId());
        return new ApiStatusDto("Unfollowed successfully");
    }

    @Transactional
    public ApiStatusDto unfriend(String actorUsername, String targetUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new ApiException("Target user not found"));

        followerRepository.deleteByFollowerIdAndFollowingId(actor.getId(), target.getId());
        followerRepository.deleteByFollowerIdAndFollowingId(target.getId(), actor.getId());
        notificationRepository.deleteByUserIdAndMessage(target.getId(), friendRequestMessage(actor.getUsername()));
        notificationRepository.deleteByUserIdAndMessage(actor.getId(), friendRequestMessage(target.getUsername()));

        return new ApiStatusDto("Friend removed");
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> notifications(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));

        return notificationRepository.findTop30ByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(n -> new NotificationDto(
                        n.getId(),
                        n.getMessage().startsWith(FRIEND_REQUEST_PREFIX)
                                ? n.getMessage().replace(FRIEND_REQUEST_PREFIX, "") + " sent you a friend request"
                                : n.getMessage(),
                        Boolean.TRUE.equals(n.getReadStatus()),
                        n.getCreatedAt()
                ))
                .toList();
    }

    private String friendRequestMessage(String fromUsername) {
        return FRIEND_REQUEST_PREFIX + fromUsername;
    }

    private void ensureFollow(User follower, User following) {
        if (followerRepository.existsByFollowerIdAndFollowingId(follower.getId(), following.getId())) {
            return;
        }
        Follower relation = new Follower();
        relation.setFollower(follower);
        relation.setFollowing(following);
        followerRepository.save(relation);
    }
}
