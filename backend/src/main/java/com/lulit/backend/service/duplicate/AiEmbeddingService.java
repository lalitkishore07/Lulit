package com.lulit.backend.service.duplicate;

import java.util.List;

public interface AiEmbeddingService {
    List<Double> generateEmbedding(byte[] mediaBytes, String mimeType, String sha256Hex);
}
