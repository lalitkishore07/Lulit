package com.lulit.backend.controller;

import com.lulit.backend.dto.post.AltTextResponseDto;
import com.lulit.backend.dto.post.PostSearchResultDto;
import com.lulit.backend.dto.post.PostResponseDto;
import com.lulit.backend.dto.post.ValidationRequestDto;
import com.lulit.backend.dto.post.ValidationResponseDto;
import com.lulit.backend.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<PostResponseDto> createPost(
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "file", required = false) List<MultipartFile> files,
            Authentication authentication
    ) {
        String username = authentication.getName();
        return ResponseEntity.ok(postService.createPost(username, caption, files));
    }

    @GetMapping("/feed")
    public ResponseEntity<List<PostResponseDto>> feed(Authentication authentication) {
        return ResponseEntity.ok(postService.getFeed(authentication.getName()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<PostSearchResultDto>> search(
            @RequestParam("q") String query,
            Authentication authentication
    ) {
        return ResponseEntity.ok(postService.semanticSearch(authentication.getName(), query));
    }

    @GetMapping("/{id}/similar")
    public ResponseEntity<List<PostSearchResultDto>> similar(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(postService.similarPosts(authentication.getName(), id));
    }

    @GetMapping("/{id}/alt-text")
    public ResponseEntity<AltTextResponseDto> altText(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(postService.altText(authentication.getName(), id));
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<ValidationResponseDto> validate(
            @PathVariable Long id,
            @Valid @RequestBody ValidationRequestDto request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(postService.validatePost(authentication.getName(), id, request.choice()));
    }
}
