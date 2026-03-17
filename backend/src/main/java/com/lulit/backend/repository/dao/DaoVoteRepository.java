package com.lulit.backend.repository.dao;

import com.lulit.backend.entity.dao.DaoProposal;
import com.lulit.backend.entity.dao.DaoVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DaoVoteRepository extends JpaRepository<DaoVote, Long> {
    Optional<DaoVote> findByProposalAndVoterWallet(DaoProposal proposal, String voterWallet);
    long countByProposal(DaoProposal proposal);
}
