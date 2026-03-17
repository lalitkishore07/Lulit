package com.lulit.backend.service;

import com.lulit.backend.dto.auth.ApiMessageResponse;
import com.lulit.backend.dto.auth.AuthResponseDto;
import com.lulit.backend.dto.auth.LoginRequestDto;
import com.lulit.backend.entity.User;
import com.lulit.backend.entity.UserSession;
import com.lulit.backend.exception.ApiException;
import com.lulit.backend.repository.UserRepository;
import com.lulit.backend.repository.UserSessionRepository;
import com.lulit.backend.security.JwtService;
import com.lulit.backend.util.CryptoUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CryptoUtil cryptoUtil;

    @Value("${app.security.refresh-token-days:30}")
    private long refreshTokenDays;

    @Transactional
    public AuthResult login(LoginRequestDto request) {
        String identifier = request.username() == null ? "" : request.username().trim();
        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier.toLowerCase(Locale.ROOT)))
                .orElseThrow(() -> new ApiException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException("Invalid username or password");
        }

        return issueSession(user);
    }

    @Transactional
    public AuthResult loginWithOAuth(String provider, String email, String preferredUsername) {
        if (email == null || email.isBlank()) {
            throw new ApiException("Email was not provided by OAuth provider");
        }

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> createOAuthUser(provider, normalizedEmail, preferredUsername));
        return issueSession(user);
    }

    @Transactional
    public AuthResult refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException("Refresh token is required");
        }

        UserSession session = userSessionRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new ApiException("Invalid refresh token"));

        if (session.getExpiry().isBefore(LocalDateTime.now())) {
            userSessionRepository.delete(session);
            throw new ApiException("Refresh token expired");
        }

        String nextRefreshToken = generateRefreshToken();
        session.setRefreshToken(nextRefreshToken);
        session.setExpiry(LocalDateTime.now().plusDays(refreshTokenDays));
        userSessionRepository.save(session);

        User user = session.getUser();
        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getId());
        return new AuthResult(new AuthResponseDto(accessToken, nextRefreshToken, user.getId(), user.getUsername()),
                nextRefreshToken);
    }

    @Transactional
    public ApiMessageResponse logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            userSessionRepository.deleteByRefreshToken(refreshToken);
        }
        return new ApiMessageResponse("Logged out successfully");
    }

    private String generateRefreshToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private AuthResult issueSession(User user) {
        String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getId());
        String refreshToken = generateRefreshToken();

        UserSession session = new UserSession();
        session.setUser(user);
        session.setRefreshToken(refreshToken);
        session.setExpiry(LocalDateTime.now().plusDays(refreshTokenDays));
        userSessionRepository.save(session);

        return new AuthResult(new AuthResponseDto(accessToken, refreshToken, user.getId(), user.getUsername()),
                refreshToken);
    }

    private User createOAuthUser(String provider, String email, String preferredUsername) {
        String normalizedProvider = provider == null ? "oauth" : provider.trim().toLowerCase(Locale.ROOT);
        User user = new User();
        user.setEmail(email);
        user.setPhone(generateUniquePhone());
        user.setAadhaarLast4("0000");
        user.setAadhaarHashEncrypted(cryptoUtil.encryptAes(cryptoUtil.sha256(normalizedProvider + ":" + email)));
        user.setUsername(generateUniqueUsername(preferredUsername, email));
        user.setPasswordHash(passwordEncoder.encode(generateRefreshToken()));
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        return userRepository.save(user);
    }

    private String generateUniquePhone() {
        String phone;
        do {
            StringBuilder suffix = new StringBuilder(11);
            for (int i = 0; i < 11; i++) {
                suffix.append(SECURE_RANDOM.nextInt(10));
            }
            suffix.setCharAt(0, (char) ('1' + SECURE_RANDOM.nextInt(9)));
            phone = "+99" + suffix;
        } while (userRepository.existsByPhone(phone));
        return phone;
    }

    private String generateUniqueUsername(String preferredUsername, String email) {
        String seed = preferredUsername;
        if (seed == null || seed.isBlank()) {
            int at = email.indexOf('@');
            seed = at > 0 ? email.substring(0, at) : "user";
        }

        String base = seed.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]", "");
        if (base.length() < 3) {
            base = (base + "user").substring(0, 4);
        }
        if (base.length() > 24) {
            base = base.substring(0, 24);
        }

        String candidate = base;
        int attempt = 0;
        while (userRepository.existsByUsername(candidate)) {
            attempt++;
            String suffix = String.valueOf(attempt);
            int maxBaseLen = Math.max(1, 24 - suffix.length());
            String prefix = base.length() > maxBaseLen ? base.substring(0, maxBaseLen) : base;
            candidate = prefix + suffix;
        }
        return candidate;
    }

    public record AuthResult(AuthResponseDto authResponse, String refreshToken) {
    }
}
