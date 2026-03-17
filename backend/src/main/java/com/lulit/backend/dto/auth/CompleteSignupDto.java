package com.lulit.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CompleteSignupDto(
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "^[a-zA-Z0-9_.]{3,30}$", message = "Username must be 3-30 characters") String username,
        @NotBlank @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
                message = "Password must be 8+ chars and include uppercase, lowercase, number, and special character"
        ) String password
) {
}
