package com.lulit.backend.dto.dao;

import com.lulit.backend.entity.dao.DaoExecutionStatus;
import com.lulit.backend.entity.dao.DaoProposalState;
import com.lulit.backend.entity.dao.DaoProposalType;
import com.lulit.backend.entity.dao.DaoVotingStrategy;

import java.math.BigDecimal;

public record DaoProposalDto(
        Long id,
        String title,
        String description,
        String creatorWallet,
        DaoProposalType proposalType,
        DaoVotingStrategy votingStrategy,
        String metadataHash,
        String metadataUrl,
        long startTime,
        long endTime,
        DaoProposalState state,
        int quorumBps,
        BigDecimal forVotes,
        BigDecimal againstVotes,
        BigDecimal abstainVotes,
        BigDecimal totalVotes,
        DaoExecutionStatus executionStatus
) {
}
