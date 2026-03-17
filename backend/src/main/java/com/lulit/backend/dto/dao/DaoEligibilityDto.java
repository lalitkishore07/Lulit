package com.lulit.backend.dto.dao;

import java.math.BigDecimal;

public record DaoEligibilityDto(
        String wallet,
        BigDecimal tokenBalance,
        BigDecimal reputationScore,
        BigDecimal stakingWeight,
        BigDecimal votingPower,
        boolean eligible
) {
}
