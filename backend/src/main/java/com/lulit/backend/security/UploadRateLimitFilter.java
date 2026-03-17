package com.lulit.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lulit.backend.dto.auth.ApiMessageResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class UploadRateLimitFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;
    private final Map<String, Deque<Long>> requestsByKey = new ConcurrentHashMap<>();

    @Value("${app.upload.rate-limit.window-seconds:60}")
    private int windowSeconds;

    @Value("${app.upload.rate-limit.max-requests:10}")
    private int maxRequests;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!shouldRateLimit(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = resolveKey(request);
        if (isRateLimited(key)) {
            response.setStatus(429);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType("application/json");
            response.getWriter().write(objectMapper.writeValueAsString(new ApiMessageResponse("Upload rate limit exceeded")));
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean shouldRateLimit(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod()) && "/api/v1/posts".equals(request.getRequestURI());
    }

    private String resolveKey(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null) {
            return "user:" + auth.getName();
        }
        return "ip:" + request.getRemoteAddr();
    }

    private boolean isRateLimited(String key) {
        long now = Instant.now().toEpochMilli();
        long cutoff = now - (Math.max(windowSeconds, 1) * 1000L);
        Deque<Long> deque = requestsByKey.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (deque) {
            while (!deque.isEmpty() && deque.peekFirst() < cutoff) {
                deque.pollFirst();
            }
            if (deque.size() >= Math.max(maxRequests, 1)) {
                return true;
            }
            deque.addLast(now);
            return false;
        }
    }
}
