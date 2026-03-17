package com.lulit.backend.controller;

import com.lulit.backend.dto.auth.ApiMessageResponse;
import com.lulit.backend.dto.auth.AuthResponseDto;
import com.lulit.backend.dto.auth.LoginRequestDto;
import com.lulit.backend.dto.auth.RefreshRequestDto;
import com.lulit.backend.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class SessionController {

    private static final String REFRESH_COOKIE = "lulit_refresh_token";

    private final AuthService authService;

    @Value("${app.security.cookies.secure:true}")
    private boolean secureCookie;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginRequestDto request) {
        AuthService.AuthResult result = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
                .body(result.authResponse());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseDto> refresh(@RequestBody(required = false) RefreshRequestDto request, HttpServletRequest http) {
        String token = extractRefreshTokenFromCookie(http);
        if ((token == null || token.isBlank()) && request != null) {
            token = request.refreshToken();
        }

        AuthService.AuthResult result = authService.refresh(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
                .body(result.authResponse());
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiMessageResponse> logout(HttpServletRequest http) {
        String token = extractRefreshTokenFromCookie(http);
        ApiMessageResponse response = authService.logout(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(response);
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (REFRESH_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie refreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(secureCookie)
                .path("/api/v1/auth")
                .sameSite("Strict")
                .maxAge(60L * 60 * 24 * 30)
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(secureCookie)
                .path("/api/v1/auth")
                .sameSite("Strict")
                .maxAge(0)
                .build();
    }
}
