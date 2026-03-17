package com.lulit.backend.dto.post;

import com.lulit.backend.entity.PostValidationChoice;
import jakarta.validation.constraints.NotNull;

public record ValidationRequestDto(
        @NotNull PostValidationChoice choice
) {
}
