package com.lulit.backend.config;

import com.lulit.backend.security.JwtService;
import com.lulit.backend.service.DaoRealtimeGateway;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Arrays;
import java.util.Map;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    private final DaoRealtimeGateway daoRealtimeGateway;
    private final JwtService jwtService;

    @Value("${app.security.cors-origin:http://localhost:5173,http://127.0.0.1:5173}")
    private String corsOrigin;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(corsOrigin.split(","))
                .map(String::trim)
                .filter(o -> !o.isBlank())
                .toArray(String[]::new);

        registry.addHandler(daoRealtimeGateway, "/ws/dao")
                .addInterceptors(new JwtHandshakeInterceptor(jwtService))
                .setAllowedOrigins(origins.length > 0 ? origins : new String[] { "*" });
    }

    /**
     * Validates the JWT token passed as a query parameter during WebSocket
     * handshake.
     * Usage from client: new WebSocket("ws://host/ws/dao?token=<jwt>")
     */
    private static class JwtHandshakeInterceptor implements HandshakeInterceptor {

        private final JwtService jwtService;

        JwtHandshakeInterceptor(JwtService jwtService) {
            this.jwtService = jwtService;
        }

        @Override
        public boolean beforeHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Map<String, Object> attributes) {
            String query = request.getURI().getQuery();
            if (query == null) {
                log.debug("WebSocket handshake rejected: no query parameters");
                return false;
            }

            String token = Arrays.stream(query.split("&"))
                    .filter(param -> param.startsWith("token="))
                    .map(param -> param.substring("token=".length()))
                    .findFirst()
                    .orElse(null);

            if (token == null || token.isBlank()) {
                log.debug("WebSocket handshake rejected: missing token parameter");
                return false;
            }

            if (!jwtService.isValid(token)) {
                log.debug("WebSocket handshake rejected: invalid JWT");
                return false;
            }

            String username = jwtService.extractUsername(token);
            attributes.put("username", username);
            return true;
        }

        @Override
        public void afterHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Exception exception) {
            // No-op
        }
    }
}
