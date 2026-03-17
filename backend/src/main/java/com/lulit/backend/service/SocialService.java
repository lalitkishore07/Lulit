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
    public ApiStatusDto unfollow(String actorUsername, String targetUsername) {
        User actor = userRepository.findByUsername(actorUsername)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new ApiException("Target user not found"));

        followerRepository.deleteByFollowerIdAndFollowingId(actor.getId(), target.getId());
        return new ApiStatusDto("Unfollowed successfully");
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> notifications(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("Authenticated user not found"));

        return notificationRepository.findTop30ByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(n -> new NotificationDto(n.getId(), n.getMessage(), Boolean.TRUE.equals(n.getReadStatus()), n.getCreatedAt()))
                .toList();
    }
}
