package com.lulit.backend.controller;

import com.lulit.backend.dto.auth.AadhaarVerificationDto;
import com.lulit.backend.dto.auth.ApiMessageResponse;
import com.lulit.backend.dto.auth.CompleteSignupDto;
import com.lulit.backend.dto.auth.EmailOtpRequestDto;
import com.lulit.backend.dto.auth.PhoneOtpRequestDto;
import com.lulit.backend.dto.auth.VerifyEmailOtpDto;
import com.lulit.backend.dto.auth.VerifyPhoneOtpDto;
import com.lulit.backend.service.SignupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/signup")
@RequiredArgsConstructor
public class AuthController {

    private final SignupService signupService;

    @PostMapping("/email/request")
    public ResponseEntity<ApiMessageResponse> requestEmailOtp(@Valid @RequestBody EmailOtpRequestDto request) {
        return ResponseEntity.ok(signupService.requestEmailOtp(request));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<ApiMessageResponse> verifyEmailOtp(@Valid @RequestBody VerifyEmailOtpDto request) {
        return ResponseEntity.ok(signupService.verifyEmailOtp(request));
    }

    @PostMapping("/phone/request")
    public ResponseEntity<ApiMessageResponse> requestPhoneOtp(@Valid @RequestBody PhoneOtpRequestDto request) {
        return ResponseEntity.ok(signupService.requestPhoneOtp(request));
    }

    @PostMapping("/phone/verify")
    public ResponseEntity<ApiMessageResponse> verifyPhoneOtp(@Valid @RequestBody VerifyPhoneOtpDto request) {
        return ResponseEntity.ok(signupService.verifyPhoneOtp(request));
    }

    @PostMapping("/aadhaar/verify")
    public ResponseEntity<ApiMessageResponse> verifyAadhaar(@Valid @RequestBody AadhaarVerificationDto request) {
        return ResponseEntity.ok(signupService.verifyAadhaar(request));
    }

    @PostMapping("/complete")
    public ResponseEntity<ApiMessageResponse> completeSignup(@Valid @RequestBody CompleteSignupDto request) {
        return ResponseEntity.ok(signupService.completeSignup(request));
    }
}
