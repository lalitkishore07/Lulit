package com.lulit.backend.service.upload;

public record ValidatedMediaFile(
        String originalFilename,
        String mimeType,
        long sizeBytes,
        byte[] bytes
) {
}
