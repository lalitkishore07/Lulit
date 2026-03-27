package com.lulit.backend.controller;

import com.lulit.backend.dto.social.ApiStatusDto;
import com.lulit.backend.dto.social.NotificationDto;
import com.lulit.backend.service.SocialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/social")
@RequiredArgsConstructor
public class SocialController {

    private final SocialService socialService;

    @PostMapping("/follow/{username}")
    public ResponseEntity<ApiStatusDto> follow(@PathVariable String username, Authentication authentication) {
        return ResponseEntity.ok(socialService.follow(authentication.getName(), username));
    }

    @PostMapping("/add-friend/{username}")
    public ResponseEntity<ApiStatusDto> addFriend(@PathVariable String username, Authentication authentication) {
        return ResponseEntity.ok(socialService.addFriend(authentication.getName(), username));
    }

    @PostMapping("/unfollow/{username}")
    public ResponseEntity<ApiStatusDto> unfollow(@PathVariable String username, Authentication authentication) {
        return ResponseEntity.ok(socialService.unfollow(authentication.getName(), username));
    }

    @PostMapping("/unfriend/{username}")
    public ResponseEntity<ApiStatusDto> unfriend(@PathVariable String username, Authentication authentication) {
        return ResponseEntity.ok(socialService.unfriend(authentication.getName(), username));
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationDto>> notifications(Authentication authentication) {
        return ResponseEntity.ok(socialService.notifications(authentication.getName()));
    }
}
