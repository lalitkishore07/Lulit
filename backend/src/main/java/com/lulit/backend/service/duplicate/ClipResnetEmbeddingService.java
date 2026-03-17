package com.lulit.backend.service.duplicate;

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
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClipResnetEmbeddingService implements AiEmbeddingService {

    private final ObjectMapper objectMapper;

    @Value("${app.duplicate.embedding.provider:hash-fallback}")
    private String provider;

    @Value("${app.duplicate.embedding.endpoint:}")
    private String endpoint;

    @Value("${app.duplicate.embedding.dimension:128}")
    private int fallbackDimension;

    @Value("${app.duplicate.embedding.timeout-ms:4000}")
    private int timeoutMs;

    @Override
    public List<Double> generateEmbedding(byte[] mediaBytes, String mimeType, String sha256Hex) {
        if (shouldUseRemoteProvider()) {
            List<Double> remote = requestEmbeddingFromProvider(mediaBytes, mimeType);
            if (remote != null && !remote.isEmpty()) {
                return remote;
            }
        }
        return deterministicFallbackEmbedding(sha256Hex);
    }

    private boolean shouldUseRemoteProvider() {
        return ("clip-http".equalsIgnoreCase(provider) || "resnet-http".equalsIgnoreCase(provider))
                && endpoint != null
                && !endpoint.isBlank();
    }

    private List<Double> requestEmbeddingFromProvider(byte[] mediaBytes, String mimeType) {
        try {
            String model = "clip-http".equalsIgnoreCase(provider) ? "clip" : "resnet";
            String payload = objectMapper.writeValueAsString(new ProviderEmbeddingRequest(
                    model,
                    mimeType,
                    Base64.getEncoder().encodeToString(mediaBytes)
            ));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .timeout(Duration.ofMillis(Math.max(timeoutMs, 1000)))
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
            }

            JsonNode body = objectMapper.readTree(response.body());
            JsonNode embeddingNode = body.get("embedding");
            if (embeddingNode == null || !embeddingNode.isArray()) {
                return null;
            }
            List<Double> vector = new ArrayList<>(embeddingNode.size());
            for (JsonNode value : embeddingNode) {
                vector.add(value.asDouble());
            }
            return vector;
        } catch (Exception ex) {
            return null;
        }
    }

    private List<Double> deterministicFallbackEmbedding(String sha256Hex) {
        int dimension = Math.min(Math.max(fallbackDimension, 16), 1024);
        byte[] source = sha256Hex.getBytes(StandardCharsets.UTF_8);
        List<Double> vector = new ArrayList<>(dimension);
        for (int i = 0; i < dimension; i++) {
            int a = Byte.toUnsignedInt(source[i % source.length]);
            int b = Byte.toUnsignedInt(source[(i * 7 + 11) % source.length]);
            vector.add(((a << 8) | b) / 65535.0d);
        }
        return vector;
    }

    private record ProviderEmbeddingRequest(String model, String mimeType, String contentBase64) {
    }
}
