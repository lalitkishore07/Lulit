package com.lulit.backend.controller;

import com.lulit.backend.dto.dao.DaoAuthVerifyRequestDto;
import com.lulit.backend.dto.dao.DaoAuthVerifyResponseDto;
import com.lulit.backend.dto.dao.DaoCastVoteRequestDto;
import com.lulit.backend.dto.dao.DaoCreateProposalRequestDto;
import com.lulit.backend.dto.dao.DaoEligibilityDto;
import com.lulit.backend.dto.dao.DaoMetadataRequestDto;
import com.lulit.backend.dto.dao.DaoMetadataResponseDto;
import com.lulit.backend.dto.dao.DaoNonceRequestDto;
import com.lulit.backend.dto.dao.DaoNonceResponseDto;
import com.lulit.backend.dto.dao.DaoProposalDto;
import com.lulit.backend.dto.dao.DaoVoteResultsDto;
import com.lulit.backend.service.DaoGovernanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dao")
@RequiredArgsConstructor
public class DaoController {

    private final DaoGovernanceService daoGovernanceService;

    @PostMapping("/signature/challenge")
    public ResponseEntity<DaoNonceResponseDto> signatureChallenge(@Valid @RequestBody DaoNonceRequestDto requestDto) {
        return ResponseEntity.ok(daoGovernanceService.createNonceChallenge(requestDto));
    }

    @PostMapping("/auth/verify")
    public ResponseEntity<DaoAuthVerifyResponseDto> authVerify(@Valid @RequestBody DaoAuthVerifyRequestDto requestDto) {
        return ResponseEntity.ok(daoGovernanceService.verifyAuth(requestDto));
    }

    @GetMapping("/proposals/active")
    public ResponseEntity<List<DaoProposalDto>> activeProposals() {
        return ResponseEntity.ok(daoGovernanceService.getActiveProposals());
    }

    @GetMapping("/proposals/{id}")
    public ResponseEntity<DaoProposalDto> proposal(@PathVariable("id") Long id) {
        return ResponseEntity.ok(daoGovernanceService.getProposalById(id));
    }

    @PostMapping("/proposals")
    public ResponseEntity<DaoProposalDto> createProposal(@Valid @RequestBody DaoCreateProposalRequestDto requestDto) {
        return ResponseEntity.ok(daoGovernanceService.createProposal(requestDto));
    }

    @PostMapping("/proposals/{id}/vote")
    public ResponseEntity<DaoProposalDto> castVote(@PathVariable("id") Long id, @Valid @RequestBody DaoCastVoteRequestDto requestDto) {
        return ResponseEntity.ok(daoGovernanceService.castVote(id, requestDto));
    }

    @PostMapping("/proposals/metadata")
    public ResponseEntity<DaoMetadataResponseDto> proposalMetadata(@Valid @RequestBody DaoMetadataRequestDto requestDto) {
        return ResponseEntity.ok(daoGovernanceService.createProposalMetadata(requestDto));
    }

    @GetMapping("/proposals/{id}/results")
    public ResponseEntity<DaoVoteResultsDto> votingResults(@PathVariable("id") Long id) {
        return ResponseEntity.ok(daoGovernanceService.getVotingResults(id));
    }

    @GetMapping("/eligibility/{wallet}")
    public ResponseEntity<DaoEligibilityDto> eligibility(@PathVariable("wallet") String wallet) {
        return ResponseEntity.ok(daoGovernanceService.getVotingEligibility(wallet));
    }
}
