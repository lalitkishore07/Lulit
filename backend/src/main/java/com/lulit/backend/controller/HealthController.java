package com.lulit.backend.controller;

import com.lulit.backend.dto.social.ApiStatusDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<ApiStatusDto> health() {
        return ResponseEntity.ok(new ApiStatusDto("ok"));
    }
}
