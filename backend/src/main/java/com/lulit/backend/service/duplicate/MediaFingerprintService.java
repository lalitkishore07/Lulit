package com.lulit.backend.service.duplicate;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.security.MessageDigest;

@Service
public class MediaFingerprintService {

    public String sha256Hex(byte[] payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload);
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute SHA-256", ex);
        }
    }

    public String perceptualHash(byte[] payload, String mimeType) {
        if (mimeType == null || !mimeType.startsWith("image/")) {
            return null;
        }
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(payload));
            if (image == null) {
                return null;
            }

            BufferedImage resized = new BufferedImage(9, 8, BufferedImage.TYPE_BYTE_GRAY);
            Graphics2D graphics = resized.createGraphics();
            Image scaled = image.getScaledInstance(9, 8, Image.SCALE_SMOOTH);
            graphics.drawImage(scaled, 0, 0, null);
            graphics.dispose();

            long hash = 0L;
            int bitIndex = 0;
            for (int y = 0; y < 8; y++) {
                for (int x = 0; x < 8; x++) {
                    int left = resized.getRaster().getSample(x, y, 0);
                    int right = resized.getRaster().getSample(x + 1, y, 0);
                    if (left > right) {
                        hash |= (1L << bitIndex);
                    }
                    bitIndex++;
                }
            }
            return String.format("%016x", hash);
        } catch (Exception ex) {
            return null;
        }
    }

    public double perceptualSimilarity(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return 0.0;
        }
        long first = Long.parseUnsignedLong(a, 16);
        long second = Long.parseUnsignedLong(b, 16);
        int distance = Long.bitCount(first ^ second);
        return 1.0 - (distance / 64.0);
    }
}
