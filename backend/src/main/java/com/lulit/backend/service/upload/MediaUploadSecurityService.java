package com.lulit.backend.service.upload;

import com.lulit.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MediaUploadSecurityService {

    private final Set<String> allowedMimeTypes;
    private final long maxFileSizeBytes;

    public MediaUploadSecurityService(
            @Value("${app.upload.allowed-mime-types:image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime}") String allowedMimeTypesCsv,
            @Value("${app.upload.max-file-size-bytes:52428800}") long maxFileSizeBytes
    ) {
        this.allowedMimeTypes = Arrays.stream(allowedMimeTypesCsv.split(","))
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());
        this.maxFileSizeBytes = Math.max(maxFileSizeBytes, 1024);
    }

    public ValidatedMediaFile validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Exactly one media file is required");
        }
        String mimeType = normalizeMime(file.getContentType());
        if (!allowedMimeTypes.contains(mimeType)) {
            throw new ApiException("Unsupported media type: " + mimeType);
        }

        long sizeBytes = file.getSize();
        if (sizeBytes <= 0) {
            throw new ApiException("Uploaded file is empty");
        }
        if (sizeBytes > maxFileSizeBytes) {
            throw new ApiException("File exceeds maximum allowed size");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception ex) {
            throw new ApiException("Failed to read uploaded media");
        }
        validateFileSignature(bytes, mimeType);
        return new ValidatedMediaFile(file.getOriginalFilename(), mimeType, sizeBytes, bytes);
    }

    private String normalizeMime(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "application/octet-stream";
        }
        return contentType.toLowerCase(Locale.ROOT).trim();
    }

    private void validateFileSignature(byte[] bytes, String mimeType) {
        if (bytes.length < 12) {
            throw new ApiException("File is too small to validate");
        }

        boolean matchesType = switch (mimeType) {
            case "image/jpeg" -> bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8;
            case "image/png" -> bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
            case "image/gif" -> bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46;
            case "image/webp" -> bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50;
            case "video/mp4", "video/quicktime" -> bytes[4] == 0x66 && bytes[5] == 0x74 && bytes[6] == 0x79 && bytes[7] == 0x70;
            case "video/webm" -> bytes[0] == 0x1A && bytes[1] == 0x45 && bytes[2] == (byte) 0xDF && bytes[3] == (byte) 0xA3;
            default -> false;
        };

        if (!matchesType) {
            throw new ApiException("Uploaded file content does not match declared MIME type");
        }

        if (bytes[0] == 0x4D && bytes[1] == 0x5A) {
            throw new ApiException("Potentially malicious executable upload blocked");
        }
    }
}
