package com.lulit.backend.dto.dao;

import com.lulit.backend.entity.dao.DaoNoncePurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DaoNonceRequestDto(
        @NotBlank String wallet,
        @NotNull DaoNoncePurpose purpose,
        Long proposalId,
        String choice
) {
}
