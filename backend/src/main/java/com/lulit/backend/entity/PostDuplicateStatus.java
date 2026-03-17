package com.lulit.backend.entity;

public enum PostDuplicateStatus {
    UNIQUE,
    EXACT_DUPLICATE_BLOCKED,
    PERCEPTUAL_NEAR_DUPLICATE,
    EMBEDDING_NEAR_DUPLICATE
}
