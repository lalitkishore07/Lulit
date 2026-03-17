package com.lulit.backend.service;

import com.lulit.backend.entity.OtpVerification;
import com.lulit.backend.exception.ApiException;
import com.lulit.backend.repository.OtpVerificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private OtpVerificationRepository otpVerificationRepository;

    @Mock
    private OtpDeliveryService otpDeliveryService;

    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setup() {
        passwordEncoder = new BCryptPasswordEncoder();
        otpService = new OtpService(otpVerificationRepository, passwordEncoder, otpDeliveryService);
    }

    @Test
    void sendOtpShouldRejectRapidResend() {
        OtpVerification existing = new OtpVerification();
        existing.setIdentifier("email:test@example.com");
        existing.setVerified(false);
        existing.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        when(otpVerificationRepository.findByIdentifier(existing.getIdentifier())).thenReturn(Optional.of(existing));

        assertThrows(ApiException.class, () -> otpService.sendOtp(existing.getIdentifier()));
    }

    @Test
    void verifyOtpShouldPassForCorrectOtp() {
        String rawOtp = "123456";
        OtpVerification verification = new OtpVerification();
        verification.setIdentifier("email:test@example.com");
        verification.setOtp(passwordEncoder.encode(rawOtp));
        verification.setVerified(false);
        verification.setAttemptCount(0);
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(2));

        when(otpVerificationRepository.findByIdentifier(verification.getIdentifier())).thenReturn(Optional.of(verification));
        when(otpVerificationRepository.save(any(OtpVerification.class))).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> otpService.verifyOtp(verification.getIdentifier(), rawOtp));
    }
}
