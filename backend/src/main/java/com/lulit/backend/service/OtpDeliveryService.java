package com.lulit.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OtpDeliveryService {

    private static final Logger logger = LoggerFactory.getLogger(OtpDeliveryService.class);
    private static final String PROVIDER_CONSOLE = "console";
    private static final String PROVIDER_RESEND = "resend";
    private static final String PROVIDER_TEXTBELT = "textbelt";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.otp.brand-name:Lulit}")
    private String brandName;

    @Value("${app.otp.email-provider:console}")
    private String emailProvider;

    @Value("${app.otp.sms-provider:console}")
    private String smsProvider;

    @Value("${app.providers.resend.api-key:}")
    private String resendApiKey;

    @Value("${app.providers.resend.from-email:no-reply@lulit.local}")
    private String resendFromEmail;

    @Value("${app.providers.textbelt.url:https://textbelt.com/text}")
    private String textbeltUrl;

    @Value("${app.providers.textbelt.api-key:textbelt}")
    private String textbeltApiKey;

    public void deliverOtp(String identifier, String otp) {
        if (identifier.startsWith("email:")) {
            String email = identifier.substring("email:".length());
            deliverEmailOtp(email, otp);
            return;
        }
        if (identifier.startsWith("phone:")) {
            String phone = identifier.substring("phone:".length());
            deliverSmsOtp(phone, otp);
            return;
        }
        logger.warn("Unknown OTP identifier type. Falling back to console log. identifier={}", identifier);
        logger.info("OTP for {} is {}", identifier, otp);
    }

    private void deliverEmailOtp(String email, String otp) {
        String provider = safeLower(emailProvider);
        if (PROVIDER_CONSOLE.equals(provider)) {
            logger.info("OTP for email:{} is {}", email, otp);
            return;
        }
        if (PROVIDER_RESEND.equals(provider)) {
            sendEmailViaResend(email, otp);
            return;
        }
        logger.warn("Unsupported email provider '{}'. Falling back to console OTP logging.", emailProvider);
        logger.info("OTP for email:{} is {}", email, otp);
    }

    private void deliverSmsOtp(String phone, String otp) {
        String provider = safeLower(smsProvider);
        if (PROVIDER_CONSOLE.equals(provider)) {
            logger.info("OTP for phone:{} is {}", phone, otp);
            return;
        }
        if (PROVIDER_TEXTBELT.equals(provider)) {
            sendSmsViaTextbelt(phone, otp);
            return;
        }
        logger.warn("Unsupported SMS provider '{}'. Falling back to console OTP logging.", smsProvider);
        logger.info("OTP for phone:{} is {}", phone, otp);
    }

    private void sendEmailViaResend(String email, String otp) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            throw new IllegalStateException("Resend API key missing. Set app.providers.resend.api-key");
        }
        try {
            Map<String, Object> payload = Map.of(
                    "from", resendFromEmail,
                    "to", email,
                    "subject", brandName + " OTP Verification Code",
                    "text", "Your " + brandName + " OTP is " + otp + ". It expires in 5 minutes."
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + resendApiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Resend failed. status=" + response.statusCode() + ", body=" + response.body());
            }
            logger.info("OTP email sent via Resend to {}", email);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Failed to send OTP email via Resend", ex);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to send OTP email via Resend", ex);
        }
    }

    private void sendSmsViaTextbelt(String phone, String otp) {
        try {
            String body = "phone=" + urlEncode(phone)
                    + "&message=" + urlEncode("Your " + brandName + " OTP is " + otp + ". Expires in 5 minutes.")
                    + "&key=" + urlEncode(textbeltApiKey);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(textbeltUrl))
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Textbelt failed. status=" + response.statusCode() + ", body=" + response.body());
            }

            Map<String, Object> parsed = objectMapper.readValue(response.body(), new TypeReference<>() {
            });
            Object success = parsed.get("success");
            if (!(success instanceof Boolean) || !((Boolean) success)) {
                throw new IllegalStateException("Textbelt rejected SMS: " + response.body());
            }
            logger.info("OTP SMS sent via Textbelt to {}", phone);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Failed to send OTP SMS via Textbelt", ex);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to send OTP SMS via Textbelt", ex);
        }
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
