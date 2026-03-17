package com.lulit.backend.repository.dao;

import com.lulit.backend.entity.dao.DaoProposal;
import com.lulit.backend.entity.dao.DaoProposalState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface DaoProposalRepository extends JpaRepository<DaoProposal, Long> {
    List<DaoProposal> findByStateInOrderByIdDesc(List<DaoProposalState> states);
    List<DaoProposal> findByStateInAndEndTimeBefore(List<DaoProposalState> states, LocalDateTime endTime);
}
