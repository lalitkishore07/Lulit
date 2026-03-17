package com.lulit.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AadhaarVerificationDto(
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "^\\d{12}$", message = "Aadhaar must be 12 digits") String aadhaarNumber
) {
}
