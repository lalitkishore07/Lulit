package com.lulit.backend.config;

import com.lulit.backend.entity.User;
import com.lulit.backend.repository.UserRepository;
import com.lulit.backend.util.CryptoUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds a test user into the database on startup.
 * Only runs when the "dev" profile is NOT "prod".
 * Username: testuser / Password: test123
 */
@Component
@RequiredArgsConstructor
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CryptoUtil cryptoUtil;

    @Override
    public void run(String... args) {
        if (userRepository.existsByUsername("testuser")) {
            log.info("Test user 'testuser' already exists, skipping seeding.");
            return;
        }

        User user = new User();
        user.setEmail("testuser@lulit.dev");
        user.setPhone("+910000000001");
        user.setAadhaarLast4("0000");
        user.setAadhaarHashEncrypted(cryptoUtil.encryptAes(cryptoUtil.sha256("dev-seed-testuser")));
        user.setUsername("testuser");
        user.setPasswordHash(passwordEncoder.encode("test123"));
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        user.setDisplayName("Test User");
        user.setBio("A test account for development");
        userRepository.save(user);

        log.info("Seeded test user: username='testuser', password='test123'");
    }
}
