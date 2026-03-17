package com.lulit.backend.dto.dao;

import com.lulit.backend.entity.dao.DaoProposalType;
import com.lulit.backend.entity.dao.DaoVotingStrategy;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DaoCreateProposalRequestDto(
        @NotBlank String title,
        @NotBlank String description,
        @NotBlank String wallet,
        @NotNull DaoProposalType proposalType,
        @NotNull DaoVotingStrategy votingStrategy,
        @NotNull Long startTimeEpochSecond,
        @NotNull Long endTimeEpochSecond,
        Long snapshotBlock,
        @Min(1) @Max(10_000) Integer quorumBps,
        @NotBlank String nonce,
        @NotBlank String signature
) {
}
