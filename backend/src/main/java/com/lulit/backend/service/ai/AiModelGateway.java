package com.lulit.backend.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AiModelGateway {

    private final ObjectMapper objectMapper;

    @Value("${app.ai.enabled:true}")
    private boolean aiEnabled;

    @Value("${app.ai.timeout-ms:5000}")
    private int timeoutMs;

    @Value("${app.ai.endpoints.embedding:}")
    private String embeddingEndpoint;

    @Value("${app.ai.endpoints.moderation:}")
    private String moderationEndpoint;

    @Value("${app.ai.endpoints.summary:}")
    private String summaryEndpoint;

    public Optional<JsonNode> requestEmbedding(Map<String, Object> payload) {
        return postJson(embeddingEndpoint, payload);
    }

    public Optional<JsonNode> requestModeration(Map<String, Object> payload) {
        return postJson(moderationEndpoint, payload);
    }

    public Optional<JsonNode> requestSummary(Map<String, Object> payload) {
        return postJson(summaryEndpoint, payload);
    }

    private Optional<JsonNode> postJson(String endpoint, Map<String, Object> payload) {
        if (!aiEnabled || endpoint == null || endpoint.isBlank()) {
            return Optional.empty();
        }
        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofMillis(Math.max(timeoutMs, 1000)))
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Optional.empty();
            }
            return Optional.ofNullable(objectMapper.readTree(response.body()));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
