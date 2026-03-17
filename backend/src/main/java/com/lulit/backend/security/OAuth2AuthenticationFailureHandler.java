package com.lulit.backend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2AuthenticationFailureHandler implements AuthenticationFailureHandler {

    @Value("${app.security.oauth2.success-redirect-uri:http://localhost:5173/oauth/callback}")
    private String successRedirectUri;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException, ServletException {
        String redirect = UriComponentsBuilder.fromUriString(successRedirectUri)
                .queryParam("error", exception.getMessage() == null ? "OAuth login failed" : exception.getMessage())
                .build()
                .toUriString();
        response.sendRedirect(redirect);
    }
}
