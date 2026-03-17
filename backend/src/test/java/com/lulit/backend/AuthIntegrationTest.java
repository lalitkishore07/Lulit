package com.lulit.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lulit.backend.dto.auth.LoginRequestDto;
import com.lulit.backend.entity.User;
import com.lulit.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.mock.web.MockCookie;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() {
        userRepository.deleteAll();

        User user = new User();
        user.setEmail("user@example.com");
        user.setPhone("+911234567890");
        user.setAadhaarHashEncrypted("encrypted-hash");
        user.setAadhaarLast4("1234");
        user.setUsername("testuser");
        user.setPasswordHash(passwordEncoder.encode("Test@1234"));
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        userRepository.save(user);
    }

    @Test
    void loginAndRefreshFlowShouldSucceed() throws Exception {
        LoginRequestDto loginRequest = new LoginRequestDto("testuser", "Test@1234");
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("lulit_refresh_token"))
                .andReturn();

        MockCookie refreshCookie = (MockCookie) loginResult.getResponse().getCookie("lulit_refresh_token");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("lulit_refresh_token"));
    }
}
