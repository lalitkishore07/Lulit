package com.lulit.backend.dto.social;

import java.time.LocalDateTime;

public record NotificationDto(
        Long id,
        String message,
        boolean readStatus,
        LocalDateTime createdAt
) {
}
