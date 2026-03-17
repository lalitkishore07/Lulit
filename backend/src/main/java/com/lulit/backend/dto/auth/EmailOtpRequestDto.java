package com.lulit.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailOtpRequestDto(
        @NotBlank @Email String email
) {
}
