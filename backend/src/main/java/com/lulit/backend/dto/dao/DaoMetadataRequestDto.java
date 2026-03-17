package com.lulit.backend.dto.dao;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record DaoMetadataRequestDto(
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String proposalType,
        @NotNull Map<String, Object> payload
) {
}
