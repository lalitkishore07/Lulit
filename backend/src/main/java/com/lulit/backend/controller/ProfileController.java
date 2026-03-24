package com.lulit.backend.controller;

import com.lulit.backend.dto.profile.ProfileResponseDto;
import com.lulit.backend.dto.profile.ProfileUpdateRequestDto;
import com.lulit.backend.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponseDto> me(Authentication authentication) {
        return ResponseEntity.ok(profileService.myProfile(authentication.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<ProfileResponseDto> updateMe(
            @Valid @RequestBody ProfileUpdateRequestDto requestDto,
            Authentication authentication
    ) {
        return ResponseEntity.ok(profileService.updateMyProfile(authentication.getName(), requestDto));
    }

    @PostMapping(value = "/me/avatar", consumes = "multipart/form-data")
    public ResponseEntity<ProfileResponseDto> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        return ResponseEntity.ok(profileService.uploadAvatar(authentication.getName(), file));
    }

    @PostMapping(value = "/me/cover", consumes = "multipart/form-data")
    public ResponseEntity<ProfileResponseDto> uploadCover(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        return ResponseEntity.ok(profileService.uploadCover(authentication.getName(), file));
    }

    @GetMapping("/wallet/{walletAddress}")
    public ResponseEntity<ProfileResponseDto> byWallet(@PathVariable String walletAddress, Authentication authentication) {
        return ResponseEntity.ok(profileService.profileByWallet(authentication.getName(), walletAddress));
    }

    @GetMapping("/{username}")
    public ResponseEntity<ProfileResponseDto> byUsername(@PathVariable String username, Authentication authentication) {
        return ResponseEntity.ok(profileService.profileByUsername(authentication.getName(), username));
    }
}
