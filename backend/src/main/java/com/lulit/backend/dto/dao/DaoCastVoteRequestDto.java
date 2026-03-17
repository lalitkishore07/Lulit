package com.lulit.backend.dto.dao;

import com.lulit.backend.entity.dao.DaoVoteChoice;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DaoCastVoteRequestDto(
        @NotBlank String wallet,
        @NotNull DaoVoteChoice choice,
        @NotBlank String nonce,
        @NotBlank String signature
) {
}
