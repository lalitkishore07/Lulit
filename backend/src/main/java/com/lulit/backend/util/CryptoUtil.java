package com.lulit.backend.util;

import com.lulit.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Component
public class CryptoUtil {

    private final SecretKeySpec aesKey;

    public CryptoUtil(@Value("${app.security.aes-key}") String aesKey) {
        if (aesKey == null || aesKey.length() != 32) {
            throw new IllegalArgumentException("AES key must be exactly 32 characters (256-bit)");
        }
        this.aesKey = new SecretKeySpec(aesKey.getBytes(StandardCharsets.UTF_8), "AES");
    }

    public String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new ApiException("Failed to hash input");
        }
    }

    public String encryptAes(String value) {
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, aesKey);
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception ex) {
            throw new ApiException("Failed to encrypt sensitive value");
        }
    }
}
