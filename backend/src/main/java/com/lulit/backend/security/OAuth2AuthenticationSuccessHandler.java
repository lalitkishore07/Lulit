package com.lulit.backend.security;

import com.lulit.backend.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private static final String REFRESH_COOKIE = "lulit_refresh_token";

    private final AuthService authService;

    @Value("${app.security.oauth2.success-redirect-uri:http://localhost:5173/oauth/callback}")
    private String successRedirectUri;

    @Value("${app.security.cookies.secure:false}")
    private boolean secureCookie;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            response.sendRedirect(buildErrorRedirect("Invalid OAuth authentication"));
            return;
        }

        OAuth2User oauthUser = oauthToken.getPrincipal();
        Map<String, Object> attributes = oauthUser.getAttributes();
        String provider = oauthToken.getAuthorizedClientRegistrationId();
        String email = resolveEmail(provider, attributes);
        String preferredUsername = resolvePreferredUsername(provider, attributes, email);

        try {
            AuthService.AuthResult result = authService.loginWithOAuth(provider, email, preferredUsername);
            response.setHeader(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString());
            String redirect = UriComponentsBuilder.fromUriString(successRedirectUri)
                    .queryParam("accessToken", result.authResponse().accessToken())
                    .queryParam("userId", result.authResponse().userId())
                    .queryParam("username", result.authResponse().username())
                    .build()
                    .toUriString();
            response.sendRedirect(redirect);
        } catch (Exception ex) {
            response.sendRedirect(buildErrorRedirect(ex.getMessage()));
        }
    }

    private String resolveEmail(String provider, Map<String, Object> attributes) {
        Object emailValue = attributes.get("email");
        if (emailValue instanceof String email && !email.isBlank()) {
            return email.trim().toLowerCase(Locale.ROOT);
        }

        if ("github".equalsIgnoreCase(provider)) {
            Object login = attributes.get("login");
            if (login instanceof String loginName && !loginName.isBlank()) {
                return loginName.trim().toLowerCase(Locale.ROOT) + "@users.noreply.github.com";
            }
        }
        return null;
    }

    private String resolvePreferredUsername(String provider, Map<String, Object> attributes, String fallbackEmail) {
        Object login = attributes.get("login");
        if (login instanceof String s && !s.isBlank()) {
            return s;
        }
        Object name = attributes.get("name");
        if (name instanceof String s && !s.isBlank()) {
            return s;
        }
        Object givenName = attributes.get("given_name");
        if (givenName instanceof String s && !s.isBlank()) {
            return s;
        }
        if (fallbackEmail != null) {
            int at = fallbackEmail.indexOf('@');
            if (at > 0) {
                return fallbackEmail.substring(0, at);
            }
        }
        return provider + "_user";
    }

    private String buildErrorRedirect(String message) {
        return UriComponentsBuilder.fromUriString(successRedirectUri)
                .queryParam("error", message == null ? "OAuth login failed" : message)
                .build()
                .toUriString();
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
}
