package com.lulit.backend.service;

import com.lulit.backend.entity.Post;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ContentModerationService {

    private static final Set<String> TOXIC_TERMS = Set.of(
            "idiot", "stupid", "hate", "kill", "nazi", "racist", "terrorist", "abuse"
    );
    private static final Set<String> SPAM_TERMS = Set.of(
            "buy now", "click here", "free money", "work from home", "loan approved", "guaranteed profit"
    );
    private static final Set<String> FAKE_NEWS_TERMS = Set.of(
            "shocking truth", "secret cure", "government hiding", "mainstream media lies", "100% proven"
    );
    private static final Set<String> AI_STYLE_TERMS = Set.of(
            "as an ai language model", "in conclusion", "furthermore", "it is important to note", "overall,"
    );

    private static final Pattern URL_PATTERN = Pattern.compile("https?://|www\\.");
    private static final Pattern REPEATED_CHAR_PATTERN = Pattern.compile("(.)\\1{5,}");

    @Value("${app.moderation.toxicity-threshold:0.55}")
    private double toxicityThreshold;

    @Value("${app.moderation.spam-threshold:0.65}")
    private double spamThreshold;

    @Value("${app.moderation.fake-news-threshold:0.70}")
    private double fakeNewsThreshold;

    @Value("${app.moderation.ai-generated-threshold:0.85}")
    private double aiGeneratedThreshold;

    @Value("${app.moderation.plagiarism-threshold:0.80}")
    private double plagiarismThreshold;

    @Value("${app.moderation.bot-risk-threshold:0.70}")
    private double botRiskThreshold;

    @Value("${app.moderation.authenticity-min-threshold:0.35}")
    private double authenticityMinThreshold;

    public ModerationEvaluation evaluate(
            String caption,
            List<Post> recentUserPosts,
            long recentPostCount10m
    ) {
        String normalized = caption == null ? "" : caption.trim();
        String lower = normalized.toLowerCase(Locale.ROOT);

        double toxicity = scoreKeywordDensity(lower, TOXIC_TERMS);
        double spam = scoreSpam(lower);
        double fakeNews = scoreKeywordDensity(lower, FAKE_NEWS_TERMS);
        double aiGenerated = scoreKeywordDensity(lower, AI_STYLE_TERMS);
        double plagiarism = scorePlagiarism(normalized, recentUserPosts);
        double botRisk = scoreBotRisk(lower, recentPostCount10m);

        double authenticity = clamp01(
                1.0 - ((spam * 0.25) + (fakeNews * 0.20) + (plagiarism * 0.20) + (botRisk * 0.20) + (aiGenerated * 0.15))
        );

        boolean flagged = toxicity > toxicityThreshold
                || spam > spamThreshold
                || fakeNews > fakeNewsThreshold
                || aiGenerated > aiGeneratedThreshold
                || plagiarism > plagiarismThreshold
                || botRisk > botRiskThreshold
                || authenticity < authenticityMinThreshold;

        String reason = flagged
                ? "Flagged by AI moderation: toxicity/spam/authenticity thresholds exceeded."
                : "Passed AI moderation checks.";

        return new ModerationEvaluation(
                clamp01(toxicity),
                clamp01(spam),
                clamp01(fakeNews),
                clamp01(aiGenerated),
                clamp01(plagiarism),
                clamp01(botRisk),
                authenticity,
                flagged,
                reason
        );
    }

    private double scoreSpam(String text) {
        if (text.isBlank()) {
            return 0.0;
        }
        double keyword = scoreKeywordDensity(text, SPAM_TERMS);
        long urlHits = URL_PATTERN.matcher(text).results().count();
        double urlScore = Math.min(1.0, urlHits * 0.35);
        double repeatedChars = REPEATED_CHAR_PATTERN.matcher(text).find() ? 0.35 : 0.0;
        return clamp01((keyword * 0.5) + (urlScore * 0.35) + repeatedChars);
    }

    private double scorePlagiarism(String caption, List<Post> recentPosts) {
        if (caption == null || caption.isBlank() || recentPosts == null || recentPosts.isEmpty()) {
            return 0.0;
        }
        String current = caption.trim().toLowerCase(Locale.ROOT);
        double best = 0.0;
        for (Post post : recentPosts) {
            String prev = post.getCaption();
            if (prev == null || prev.isBlank()) {
                continue;
            }
            double score = jaccardSimilarity(current, prev.trim().toLowerCase(Locale.ROOT));
            if (score > best) {
                best = score;
            }
        }
        return clamp01(best);
    }

    private double scoreBotRisk(String text, long recentPostCount10m) {
        double postingRate = Math.min(1.0, recentPostCount10m / 8.0);
        double repetitive = REPEATED_CHAR_PATTERN.matcher(text).find() ? 0.25 : 0.0;
        return clamp01((postingRate * 0.75) + repetitive);
    }

    private double scoreKeywordDensity(String text, Set<String> keywords) {
        if (text.isBlank()) {
            return 0.0;
        }
        long matches = keywords.stream().filter(text::contains).count();
        return Math.min(1.0, matches / 3.0);
    }

    private double jaccardSimilarity(String left, String right) {
        Set<String> a = tokenize(left);
        Set<String> b = tokenize(right);
        if (a.isEmpty() || b.isEmpty()) {
            return 0.0;
        }
        long intersection = a.stream().filter(b::contains).count();
        long union = a.size() + b.size() - intersection;
        return union == 0 ? 0.0 : (double) intersection / union;
    }

    private double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private Set<String> tokenize(String value) {
        return Pattern.compile("\\s+")
                .splitAsStream(value)
                .filter(token -> !token.isBlank())
                .collect(Collectors.toSet());
    }

    public record ModerationEvaluation(
            double toxicity,
            double spamProbability,
            double fakeNewsProbability,
            double aiGeneratedProbability,
            double plagiarismScore,
            double botRiskScore,
            double authenticityScore,
            boolean flagged,
            String summary
    ) {
        public String toCompactJson() {
            return String.format(
                    Locale.ROOT,
                    "{\"toxicity\":%.4f,\"spam\":%.4f,\"fakeNews\":%.4f,\"aiGenerated\":%.4f,\"plagiarism\":%.4f,\"botRisk\":%.4f,\"authenticity\":%.4f}",
                    toxicity, spamProbability, fakeNewsProbability, aiGeneratedProbability, plagiarismScore, botRiskScore, authenticityScore
            );
        }
    }
}
