package com.lulit.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PhoneOtpRequestDto(
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "^\\+\\d{1,3}$", message = "Country code must be in +XX format") String countryCode,
        @NotBlank @Pattern(regexp = "^\\d{6,14}$", message = "Phone number must contain 6 to 14 digits") String phoneNumber
) {
}
