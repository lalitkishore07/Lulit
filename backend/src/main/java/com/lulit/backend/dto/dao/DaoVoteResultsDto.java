package com.lulit.backend.dto.dao;

import com.lulit.backend.entity.dao.DaoProposalState;

import java.math.BigDecimal;

public record DaoVoteResultsDto(
        Long proposalId,
        BigDecimal forVotes,
        BigDecimal againstVotes,
        BigDecimal abstainVotes,
        BigDecimal totalVotes,
        BigDecimal quorumRequired,
        DaoProposalState state
) {
}
